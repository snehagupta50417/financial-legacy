import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, unauthorized } from "@/lib/session";
import { logEvent } from "@/lib/case-service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const doc = await db.documentRecord.findFirst({
    where: { id, case: { sessionId: session.id } },
    include: { case: true },
  });
  if (!doc) return Response.json({ error: "Document not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body?.extractedFields !== "undefined") {
    const fields = Array.isArray(body.extractedFields)
      ? body.extractedFields.map((f: { label?: string; value?: string; confidence?: number; sourceExcerpt?: string }) => ({
          label: String(f?.label ?? ""),
          value: String(f?.value ?? ""),
          confidence: typeof f?.confidence === "number" ? f.confidence : 0.9,
          sourceExcerpt: String(f?.sourceExcerpt ?? "Corrected by user"),
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

  return Response.json({ document: updated });
}
