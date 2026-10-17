import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { documentAccess, isDenied } from "@/server/core/access";
import { redactIdentifiers } from "@/server/core/masking";
import { logEvent, parseFields } from "@/server/domain/case-service";

export const dynamic = "force-dynamic";

/** Stored (already redacted) text of one document, for side-by-side field review. Same gate as PATCH. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await documentAccess(req, id, "discovery");
  if (isDenied(access)) return access;
  const { doc } = access;
  return Response.json({
    document: {
      id: doc.id,
      fileName: doc.fileName,
      // Redact again on the way out in case older rows were stored before redaction existed.
      text: doc.rawText ? redactIdentifiers(doc.rawText) : null,
    },
  });
}

const DOC_CATEGORIES = new Set(["bank_statement", "policy_document", "death_certificate", "will", "claim_letter", "receipt", "other"]);

/**
 * Change a document's type. Values are reviewed through PUT /api/documents/:id/review,
 * which keeps who changed what and why (FL-26) — this route no longer rewrites them.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await documentAccess(req, id, "discovery");
  if (isDenied(access)) return access;
  const { doc } = access;
  const body = await req.json().catch(() => null);

  if (body && ("extractedFields" in body || "userVerified" in body)) {
    return Response.json({ error: "Review values with PUT /api/documents/:id/review" }, { status: 400 });
  }
  if (typeof body?.category !== "string" || !DOC_CATEGORIES.has(body.category)) {
    return Response.json({ error: "category must be one of: " + [...DOC_CATEGORIES].join(", ") }, { status: 400 });
  }
  const updated = await db.documentRecord.update({ where: { id: doc.id }, data: { category: body.category } });
  await logEvent(doc.caseId, "document", `User set "${doc.fileName}" as ${body.category.replace(/_/g, " ")}`, "user", doc.id);
  return Response.json({ document: { ...updated, extractedFields: parseFields(updated.extractedFields) } });
}
