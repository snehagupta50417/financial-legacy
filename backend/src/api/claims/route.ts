import { z } from "zod";
import { caseAccess, isDenied } from "@server/core/access";
import { errorResponse, parseJson } from "@server/core/http";
import { ClaimError, refreshClaim, startClaim } from "@server/domain/claim-service";

const Body = z.object({ caseId: z.string().min(1), assetId: z.string().min(1) });

/** POST /api/claims — start a claim for a confirmed holding (FL-12). Repeating returns the same claim. */
export async function POST(req: Request) {
  const body = await parseJson(req, Body);
  if (body instanceof Response) return body;
  const access = await caseAccess(req, body.caseId, "discovery");
  if (isDenied(access)) return access;
  try {
    const claim = await startClaim(access.legacyCase.id, body.assetId);
    return Response.json({ claim: await refreshClaim(claim.id) });
  } catch (e) {
    if (e instanceof ClaimError) return errorResponse(e.status, e.message);
    throw e;
  }
}
