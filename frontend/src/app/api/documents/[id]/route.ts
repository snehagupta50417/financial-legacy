import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { documentAccess, isDenied } from "@/server/core/access";
import { redactIdentifiers } from "@/server/core/masking";
import { logEvent, parseFields } from "@/server/domain/case-service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await documentAccess(req, id, "discovery");
  if (isDenied(access)) return access;
  const { doc } = access;
  const body = await req.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (typeof body?.extractedFields !== "undefined") {
    const fields = Array.isArray(body.extractedFields)
      ? body.extractedFields.map((f: { label?: string; value?: string; confidence?: number; sourceExcerpt?: string }) => ({
          label: String(f?.label ?? ""),
          // Full identifiers are never stored (plan §5)
          value: redactIdentifiers(String(f?.value ?? "")).slice(0, 500),
          confidence: typeof f?.confidence === "number" ? f.confidence : 0.9,
          sourceExcerpt: redactIdentifiers(String(f?.sourceExcerpt ?? "Corrected by user")).slice(0, 300),
        }))
      : [];
    data.extractedFields = JSON.stringify(fields);
  }
  if (typeof body?.userVerified === "boolean") data.userVerified = body.userVerified;
  if (typeof body?.category === "string") data.category = body.category;

  const updated = await db.documentRecord.update({ where: { id: doc.id }, data });

  if (body?.userVerified === true) {
    await logEvent(
      doc.caseId,
      "document",
      `User verified extracted fields of "${doc.fileName}"`,
      "user",
      doc.id
    );
  }

  return Response.json({ document: { ...updated, extractedFields: parseFields(updated.extractedFields) } });
}
