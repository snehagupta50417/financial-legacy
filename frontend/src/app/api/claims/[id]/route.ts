import { NextRequest } from "next/server";
import { z } from "zod";
import { claimAccess, isDenied } from "@/server/core/access";
import { errorResponse, parseJson } from "@/server/core/http";
import { ClaimError, editClaim, refreshClaim } from "@/server/domain/claim-service";

export const dynamic = "force-dynamic";

/** GET /api/claims/:id — the claim, its chosen path, pack, approval and timeline. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await claimAccess(req, id);
  if (isDenied(access)) return access;
  return Response.json({ claim: await refreshClaim(id) });
}

const Entry = z.object({ state: z.enum(["missing", "have", "linked"]), documentId: z.string().optional() });

const Body = z.object({
  situation: z
    .object({
      nominee: z.enum(["recorded", "none"]).optional(),
      jointHolder: z.enum(["surviving", "none"]).optional(),
      relationship: z.enum(["spouse", "child", "parent", "parent_in_law", "sibling", "other"]).optional(),
      amountBand: z.string().regex(/^\d+-\d*$/).optional(),
      demat: z.boolean().optional(),
      disputed: z.boolean().optional(),
    })
    .optional(),
  checklist: z.record(z.string().max(60), Entry).optional(),
  declarations: z.array(z.string().max(60)).max(20).optional(),
});

/** PATCH /api/claims/:id — answer a question, tick documents, confirm declarations (before submission). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await claimAccess(req, id);
  if (isDenied(access)) return access;
  const body = await parseJson(req, Body);
  if (body instanceof Response) return body;
  try {
    return Response.json({ claim: await editClaim(id, body) });
  } catch (e) {
    if (e instanceof ClaimError) return errorResponse(e.status, e.message);
    throw e;
  }
}
