import { z } from "zod";
import { assetAccess, isDenied } from "@server/core/access";
import { errorResponse, parseJson } from "@server/core/http";
import { submitEntitlement } from "@server/domain/gates";
import { documentProgress } from "@server/domain/document-progress";

const Body = z.object({
  method: z.enum(["nominee", "joint_holder", "legal_heir_certificate", "succession_certificate"]),
});

/** POST /api/assets/:id/entitlement → G4 for this asset */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await assetAccess(req, id, "discovery");
  if (isDenied(access)) return access;
  const body = await parseJson(req, Body);
  if (body instanceof Response) return body;
  const result = await submitEntitlement(access.legacyCase, access.asset, body);
  if (!result.ok) return errorResponse(result.status, result.error);
  let progress;
  if (access.asset.sourceDocumentId) {
    try { progress = await documentProgress(access.asset.sourceDocumentId, true, access.asset.id); } catch { /* Authority result remains saved. */ }
  }
  return Response.json({ proof: result.proof, gate: result.gate, progress });
}
