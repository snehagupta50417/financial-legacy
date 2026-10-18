import { z } from "zod";
import { claimAccess, isDenied } from "@server/core/access";
import { errorResponse, parseJson } from "@server/core/http";
import { approvePack, ClaimError } from "@server/domain/claim-service";

const Body = z.object({ contentHash: z.string().regex(/^[0-9a-f]{64}$/) });

/**
 * POST /api/claims/:id/approve — approve exactly the pack the person saw (FL-14).
 * The hash must match the current pack; the approval expires and any change to
 * the pack invalidates it.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await claimAccess(req, id);
  if (isDenied(access)) return access;
  const body = await parseJson(req, Body);
  if (body instanceof Response) return body;
  try {
    return Response.json({ claim: await approvePack(id, body.contentHash, access.session.id) });
  } catch (e) {
    if (e instanceof ClaimError) return errorResponse(e.status, e.message);
    throw e;
  }
}
