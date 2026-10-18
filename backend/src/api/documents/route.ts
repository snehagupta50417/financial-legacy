import { documentProgress } from "@server/domain/document-progress";
import { hasAiConsent } from "@server/core/ai-consent";
import { db } from "@server/db";
import { caseAccess, isDenied } from "@server/core/access";
import { IMAGE_MIME, readUpload, type SniffedKind } from "@server/core/upload";
import { redactIdentifiers } from "@server/core/masking";
import { addClue, createDocumentFields } from "@server/domain/evidence-service";
import { completeJson, getProvider } from "@server/ai";
import { hasTextLayer, ocrImage, ocrPdf } from "@server/ocr/ocr";
import { fixOcrDigits, ruleExtract } from "@server/ocr/rule-extract";
import { aiRateLimit } from "@server/core/rate-limit";
import { logEvent } from "@server/domain/case-service";
import type { ExtractedDocumentData } from "@shared/types";
import { ASSET_CATEGORIES, type AssetCategory } from "@shared/types";

export const maxDuration = 120;

const EXTRACT_SYSTEM = `You are the Document Intelligence Agent of Financial Legacy (BFSI, India).
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

interface ReadText {
  text: string;
  note: string | null;
  /** Set when the text came from OCR (0..1 mean word confidence). */
  ocrConfidence?: number;
}

/** Text files are decoded; PDFs use their text layer, or OCR when they are scans; images are OCR'd. */
async function readText(bytes: Uint8Array, kind: SniffedKind): Promise<ReadText> {
  if (kind === "text") return { text: new TextDecoder().decode(bytes), note: null };
  try {
    if (kind === "pdf") {
      const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await pdfText(pdf, { mergePages: true });
      const merged = Array.isArray(text) ? text.join("\n") : text;
      if (hasTextLayer(merged)) return { text: merged, note: null };
      const ocr = await ocrPdf(bytes);
      if (hasTextLayer(ocr.text)) return { text: fixOcrDigits(ocr.text), note: null, ocrConfidence: ocr.confidence };
      return {
        text: "",
        note: "This PDF is a scan and the text could not be read clearly. Try a sharper scan, or photograph each page in good light.",
      };
    }
    const ocr = await ocrImage(bytes);
    if (hasTextLayer(ocr.text)) return { text: fixOcrDigits(ocr.text), note: null, ocrConfidence: ocr.confidence };
    return { text: "", note: "No readable text was found in this photo. Try again in good light, with the whole page flat and in focus." };
  } catch (e) {
    console.error("[documents] text reading failed", e);
    return { text: "", note: "This file could not be read. Try another copy or enter the details manually." };
  }
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

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Expected multipart form" }, { status: 400 });
  const access = await caseAccess(req, String(form.get("caseId") ?? ""), "discovery");
  if (isDenied(access)) return access;
  const { session, legacyCase } = access;
  const limited = aiRateLimit(session.id);
  if (limited) return limited;

  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "File required" }, { status: 400 });
  const up = await readUpload(file, ["text", "pdf", "png", "jpeg", "webp"]);
  if (!up.ok) return Response.json({ error: up.error }, { status: up.status });
  const imageMime = IMAGE_MIME[up.kind];

  const doc = await db.documentRecord.create({
    data: {
      caseId: legacyCase.id,
      category: "other",
      fileName: file.name,
      fileType: imageMime ?? (up.kind === "pdf" ? "application/pdf" : "text/plain"),
      sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      extractionStatus: "processing",
    },
  });
  await logEvent(legacyCase.id, "document", `Uploaded "${file.name}" — reading started`, "user", doc.id);

  // 1. With an AI key, photos go straight to Gemini vision (best quality).
  // 2. Otherwise — or if that fails — text comes from the PDF text layer or local OCR,
  //    then Gemini structures it, or basic text rules do when AI is unavailable.
  const aiOn = !!getProvider() && await hasAiConsent(session.id);
  let ex: ExtractedDocumentData | null = null;
  let aiError: string | null = null;
  if (imageMime && aiOn) {
    const vision = await completeJson<ExtractedDocumentData>(
      EXTRACT_SYSTEM,
      `Document file name: ${file.name}\n\nThe document is the attached image (photo or scan). Read only what is visible.`,
      validateExtraction,
      { images: [{ mimeType: imageMime, data: Buffer.from(up.bytes).toString("base64") }] }
    );
    if (vision.ok) ex = vision.data;
    else aiError = vision.error;
  }

  let read: ReadText = { text: "", note: null };
  if (!ex) read = await readText(up.bytes, up.kind);
  const { text, note } = read;

  if (!ex && !text) {
    await db.documentRecord.update({
      where: { id: doc.id },
      data: {
        extractionStatus: "failed",
        extractionNote: note ?? "No readable text found in this file.",
      },
    });
    await logEvent(legacyCase.id, "document", `Extraction failed for "${file.name}": no readable text`, "ai", doc.id);
    let progress;
    try { progress = await documentProgress(doc.id); } catch { /* Upload is already saved. */ }
    const payload = await db.documentRecord.findUnique({ where: { id: doc.id } });
    return Response.json(
      { document: payload && { ...payload, extractedFields: parseFieldsSafe(payload.extractedFields) }, extraction: null, progress },
      { status: 200 }
    );
  }

  let method = ex ? "AI (image)" : read.ocrConfidence !== undefined ? "OCR" : "text";
  if (!ex && aiOn) {
    const res = await completeJson<ExtractedDocumentData>(
      EXTRACT_SYSTEM,
      `Document file name: ${file.name}${read.ocrConfidence !== undefined ? " (text read by OCR; expect some misread characters)" : ""}\n\nDocument text:\n"""\n${text.slice(0, 12000)}\n"""`,
      validateExtraction
    );
    if (res.ok) {
      ex = res.data;
      method += " + AI";
    } else aiError = res.error;
  }
  if (!ex) {
    ex = ruleExtract(text, { ocrConfidence: read.ocrConfidence });
    if (aiError) ex.warnings.unshift(`AI extraction could not complete (${aiError}), so basic rules were used.`);
    method += " + basic rules";
  }

  await db.documentRecord.update({
    where: { id: doc.id },
    data: {
      category: ex.documentCategory,
      extractionStatus: "extracted",
      // Read, extract, forget: identifiers are redacted before anything is stored.
      rawText: text ? redactIdentifiers(text.slice(0, 20000)) : null,
      extractedFields: JSON.stringify(
        ex.fields.map((f) => ({ ...f, value: redactIdentifiers(f.value), sourceExcerpt: redactIdentifiers(f.sourceExcerpt) }))
      ),
      extractionNote: ex.summary,
    },
  });

  // Every value becomes a reviewable field; clues become potential matches,
  // flagged as possible duplicates instead of being merged into existing holdings.
  await createDocumentFields(doc.id, ex.fields);
  let cluesAdded = 0;
  let duplicates = 0;
  for (const clue of ex.assetClues) {
    const { duplicateOf } = await addClue(legacyCase.id, doc.id, clue);
    cluesAdded++;
    if (duplicateOf) duplicates++;
  }

  await logEvent(
    legacyCase.id,
    "ai",
    `Extracted "${file.name}" (${method}): ${ex.fields.length} fields, ${ex.institutions.length} institutions${cluesAdded ? `, ${cluesAdded} possible holding(s)${duplicates ? ` (${duplicates} may duplicate one you have)` : ""}` : ""} — quality: ${ex.extractionQuality}`,
    "ai",
    doc.id
  );

  let progress;
  try { progress = await documentProgress(doc.id); } catch { /* Upload is already saved. */ }
  const payload = await db.documentRecord.findUnique({ where: { id: doc.id } });
  return Response.json({
    document: payload && { ...payload, extractedFields: parseFieldsSafe(payload.extractedFields) },
    extraction: ex,
    progress,
    cluesAdded,
  });
}
