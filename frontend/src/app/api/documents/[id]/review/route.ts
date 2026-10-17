import { NextRequest } from "next/server";
import { z } from "zod";
import { documentAccess, isDenied } from "@/server/core/access";
import { errorResponse, parseJson } from "@/server/core/http";
import { logEvent } from "@/server/domain/case-service";
import { applyReview, ensureDocumentFields, ReviewError } from "@/server/domain/evidence-service";

export const dynamic = "force-dynamic";

const Body = z.object({
  decisions: z
    .array(
      z.object({
        fieldId: z.string().min(1),
        decision: z.enum(["accepted", "corrected", "rejected"]),
        value: z.string().max(500).optional(),
        reason: z.string().max(300).optional(),
      })
    )
    .min(1)
    .max(100),
});

/**
 * PUT /api/documents/:id/review — accept, correct or reject extracted values
 * (PRD FL-06, FL-26). Each change records who, when, why and the previous value;
 * the holdings this document backs, and their dated amounts, update from it.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await documentAccess(req, id, "discovery");
  if (isDenied(access)) return access;
  const { doc, session } = access;
  const body = await parseJson(req, Body);
  if (body instanceof Response) return body;

  await ensureDocumentFields(doc);
  try {
    const result = await applyReview(doc.id, body.decisions, session.id);
    if (result.changed.length) {
      await logEvent(
        doc.caseId,
        "document",
        `Reviewed ${result.changed.length} value(s) in "${doc.fileName}"${result.complete ? " — every value now has a decision" : ""}`,
        "user",
        doc.id
      );
    }
    return Response.json(result);
  } catch (e) {
    if (e instanceof ReviewError) return errorResponse(400, e.message);
    throw e;
  }
}
