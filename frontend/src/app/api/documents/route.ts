import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireSession, unauthorized } from "@/server/core/session";
import { completeJson } from "@/server/ai";
import { aiRateLimit } from "@/server/core/rate-limit";
import { logEvent } from "@/server/domain/case-service";
import type { ExtractedDocumentData } from "@/lib/types";
import { ASSET_CATEGORIES, type AssetCategory } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const EXTRACT_SYSTEM = `You are the Document Intelligence Agent of FinLegacy AI (BFSI, India).
You receive the raw text of a financial document (bank statement, insurance policy/receipt, mutual fund CAS/folio statement, claim/rejection letter, will, death certificate, or notes) and extract structured facts.

STRICT EVIDENCE RULES:
- Extract ONLY what is actually present in the text. Never invent account numbers, balances, dates, names or institutions.
- Mentioning a bank does NOT prove an asset exists there — only emit assetClues when the text shows a concrete account/policy/folio reference or balance.
- Use masked references in assetClues.reference (e.g., "A/c **8821") — never reproduce full numbers.
- sourceExcerpt must be a verbatim snippet (≤160 chars) from the input supporting the field.
- confidence reflects how certain the extraction is (0..1).
- If text is unreadable/insufficient, set extractionQuality="poor", return few fields, and list problems in missingOrUnreadable.

documentCategory must be one of: bank_statement, policy_document, death_certificate, will, claim_letter, receipt, other.
assetClues.category must be from: ${ASSET_CATEGORIES.join(", ")}.

Respond with JSON:
{
  "documentCategory": "...",
  "summary": "2-3 sentence neutral summary",
  "extractionQuality": "good"|"partial"|"poor",
  "fields": [{"label":"...","value":"...","confidence":0.0,"sourceExcerpt":"..."}],
  "institutions": ["..."],
  "assetClues": [{"category":"...","institution":"...","reference":"masked or null","holderName":"... or null","evidence":"why this suggests an asset","confidence":0.0}],
  "missingOrUnreadable": ["..."],
  "warnings": ["e.g., values are as of a past date"]
}`;

function validateExtraction(raw: unknown): ExtractedDocumentData | null {
  const r = raw as Partial<ExtractedDocumentData>;
  if (!r || typeof r !== "object") return null;
  return {
    documentCategory:
      typeof r.documentCategory === "string" ? r.documentCategory : "other",
    summary: typeof r.summary === "string" ? r.summary : "",
    extractionQuality:
      r.extractionQuality === "good" || r.extractionQuality === "partial"
        ? r.extractionQuality
        : "poor",
    fields: Array.isArray(r.fields)
      ? r.fields
          .filter((f) => f && typeof f.label === "string")
          .slice(0, 14)
          .map((f) => ({
            label: String(f.label),
            value: String(f.value ?? ""),
            confidence: typeof f.confidence === "number" ? f.confidence : 0.5,
            sourceExcerpt: String(f.sourceExcerpt ?? ""),
          }))
      : [],
    institutions: Array.isArray(r.institutions) ? r.institutions.map(String).slice(0, 8) : [],
    assetClues: Array.isArray(r.assetClues)
      ? r.assetClues
          .filter((a) => a && typeof a.institution === "string")
          .slice(0, 8)
          .map((a) => ({
            category: ((ASSET_CATEGORIES as readonly string[]).includes(a.category as string)
              ? a.category
              : "unknown") as AssetCategory,
            institution: String(a.institution),
            reference: a.reference ? String(a.reference) : null,
            holderName: a.holderName ? String(a.holderName) : null,
            evidence: String(a.evidence ?? "Extracted from document"),
            confidence: typeof a.confidence === "number" ? a.confidence : 0.5,
          }))
      : [],
    missingOrUnreadable: Array.isArray(r.missingOrUnreadable)
      ? r.missingOrUnreadable.map(String).slice(0, 8)
      : [],
    warnings: Array.isArray(r.warnings) ? r.warnings.map(String).slice(0, 6) : [],
  };
}

async function extractTextFromFile(file: File): Promise<{
  text: string;
  note: string | null;
}> {
  const name = file.name.toLowerCase();
  const type = file.type || "";
  if (type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".csv") || name.endsWith(".md")) {
    return { text: await file.text(), note: null };
  }
  if (name.endsWith(".pdf") || type === "application/pdf") {
    const buf = new Uint8Array(await file.arrayBuffer());
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    const merged = Array.isArray(text) ? text.join("\n") : text;
    if (!merged || merged.replace(/\s/g, "").length < 30) {
      return {
        text: "",
        note: "This PDF appears to be a scanned image without an embedded text layer, so no text could be extracted. Try a text-based PDF or paste key details manually.",
      };
    }
    return { text: merged, note: null };
  }
  return {
    text: "",
    note: `Unsupported file type for real text extraction (${file.type || name}). Supported: text files and text-based PDFs. For images, paste the key details as text.`,
  };
}

function parseFieldsSafe(s: string | null | undefined) {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const limited = aiRateLimit(session.id);
  if (limited) return limited;

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Expected multipart form" }, { status: 400 });
  const caseId = String(form.get("caseId") ?? "");
  const file = form.get("file");

  const legacyCase = await db.legacyCase.findFirst({ where: { id: caseId, sessionId: session.id } });
  if (!legacyCase) return Response.json({ error: "Case not found" }, { status: 404 });
  if (!(file instanceof File)) return Response.json({ error: "File required" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024)
    return Response.json({ error: "File too large (max 8MB)" }, { status: 413 });

  const doc = await db.documentRecord.create({
    data: {
      caseId: legacyCase.id,
      category: "other",
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      extractionStatus: "processing",
    },
  });
  await logEvent(legacyCase.id, "document", `Uploaded "${file.name}" — AI extraction started`, "user", doc.id);

  const { text, note } = await extractTextFromFile(file);

  if (!text) {
    await db.documentRecord.update({
      where: { id: doc.id },
      data: {
        extractionStatus: "failed",
        extractionNote: note ?? "No readable text found in this file.",
      },
    });
    await logEvent(legacyCase.id, "document", `Extraction failed for "${file.name}": no readable text`, "ai", doc.id);
    const payload = await db.documentRecord.findUnique({ where: { id: doc.id } });
    return Response.json(
      { document: payload && { ...payload, extractedFields: parseFieldsSafe(payload.extractedFields) }, extraction: null },
      { status: 200 }
    );
  }

  const res = await completeJson<ExtractedDocumentData>(
    EXTRACT_SYSTEM,
    `Document file name: ${file.name}\n\nDocument text:\n"""\n${text.slice(0, 12000)}\n"""`,
    validateExtraction
  );

  if (!res.ok) {
    await db.documentRecord.update({
      where: { id: doc.id },
      data: {
        extractionStatus: "failed",
        extractionNote: `AI extraction could not complete: ${res.error}. The document text was preserved — you can retry or enter details manually.`,
        rawText: text.slice(0, 20000),
      },
    });
    await logEvent(legacyCase.id, "document", `AI extraction failed for "${file.name}"`, "ai", doc.id);
    const payload = await db.documentRecord.findUnique({ where: { id: doc.id } });
    return Response.json(
      { document: payload && { ...payload, extractedFields: parseFieldsSafe(payload.extractedFields) }, extraction: null },
      { status: 200 }
    );
  }

  const ex = res.data;
  await db.documentRecord.update({
    where: { id: doc.id },
    data: {
      category: ex.documentCategory,
      extractionStatus: "extracted",
      rawText: text.slice(0, 20000),
      extractedFields: JSON.stringify(ex.fields),
      extractionNote: ex.summary,
    },
  });

  let cluesAdded = 0;
  for (const clue of ex.assetClues) {
    const dup = await db.assetRecord.findFirst({
      where: {
        caseId: legacyCase.id,
        institution: { contains: clue.institution.slice(0, 12) },
        discoveryStatus: "possible",
      },
    });
    if (dup) {
      await db.assetRecord.update({
        where: { id: dup.id },
        data: {
          evidence: clue.evidence,
          confidence: Math.max(dup.confidence, clue.confidence),
          sourceDocumentId: doc.id,
        },
      });
      continue;
    }
    await db.assetRecord.create({
      data: {
        caseId: legacyCase.id,
        category: clue.category,
        institution: clue.institution,
        maskedRef: clue.reference,
        holderName: clue.holderName,
        evidence: clue.evidence,
        sourceDocumentId: doc.id,
        confidence: clue.confidence,
      },
    });
    cluesAdded++;
  }

  await logEvent(
    legacyCase.id,
    "ai",
    `Extracted "${file.name}": ${ex.fields.length} fields, ${ex.institutions.length} institutions${cluesAdded ? `, ${cluesAdded} new asset clue(s)` : ""} — quality: ${ex.extractionQuality}`,
    "ai",
    doc.id
  );

  const payload = await db.documentRecord.findUnique({ where: { id: doc.id } });
  return Response.json({
    document: payload && { ...payload, extractedFields: parseFieldsSafe(payload.extractedFields) },
    extraction: ex,
    cluesAdded,
  });
}
