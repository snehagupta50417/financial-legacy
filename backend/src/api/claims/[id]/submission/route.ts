import { z } from "zod";
import { claimAccess, isDenied } from "@server/core/access";
import { errorResponse, parseJson } from "@server/core/http";
import { ClaimError, recordSubmission } from "@server/domain/claim-service";

const Body = z.object({
  channel: z.enum(["branch", "post", "institution_website", "email"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  receiptRef: z.string().trim().max(60).optional(),
});

/**
 * POST /api/claims/:id/submission — the family records that *they* submitted the
 * pack (FL-36). Without a receipt it is "not sure it was received". Repeating it
 * never creates a second submission.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await claimAccess(req, id);
  if (isDenied(access)) return access;
  const body = await parseJson(req, Body);
  if (body instanceof Response) return body;
  try {
    return Response.json({ claim: await recordSubmission(id, body) });
  } catch (e) {
    if (e instanceof ClaimError) return errorResponse(e.status, e.message);
    throw e;
  }
}
