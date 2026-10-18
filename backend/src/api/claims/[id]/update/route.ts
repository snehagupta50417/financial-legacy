import { z } from "zod";
import { claimAccess, isDenied } from "@server/core/access";
import { errorResponse, parseJson } from "@server/core/http";
import { ClaimError, recordUpdate } from "@server/domain/claim-service";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const Body = z.object({
  to: z.enum([
    "submitted",
    "institution_review",
    "more_information_required",
    "document_collection",
    "settled",
    "transferred",
    "partially_settled",
    "rejected",
    "unresolved_dispute",
  ]),
  note: z.string().trim().max(500).optional(),
  institutionRef: z.string().trim().max(60).optional(),
  dueDate: date.optional(),
  outcomeAmount: z.string().trim().max(40).optional(),
  outcomeDate: date.optional(),
  outcomeDocumentId: z.string().optional(),
});

/** POST /api/claims/:id/update — record what the institution did: acknowledged, asked for more, outcome, reopen. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await claimAccess(req, id);
  if (isDenied(access)) return access;
  const body = await parseJson(req, Body);
  if (body instanceof Response) return body;
  try {
    return Response.json({ claim: await recordUpdate(id, body) });
  } catch (e) {
    if (e instanceof ClaimError) return errorResponse(e.status, e.message);
    throw e;
  }
}
