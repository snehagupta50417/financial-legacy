import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { assetAccess, isDenied } from "@/server/core/access";
import { errorResponse, parseJson } from "@/server/core/http";
import { last4Of, maskAsset } from "@/server/core/masking";
import { logEvent } from "@/server/domain/case-service";
import { applyAssetAction, refreshAssetEvidence, ReviewError } from "@/server/domain/evidence-service";

export const dynamic = "force-dynamic";

const ASSET_CATEGORIES = ["bank_deposit", "bank_account", "insurance", "mutual_fund", "shares", "provident_fund", "other", "unknown"] as const;

const Body = z.object({
  holderName: z.string().trim().min(1).max(120).optional(),
  nomineeStatus: z.enum(["recorded", "none", "unknown"]).optional(),
  institution: z.string().trim().min(1).max(120).optional(),
  maskedRef: z.string().trim().max(60).optional(),
  notes: z.string().max(500).optional(),
  category: z.enum(ASSET_CATEGORIES).optional(),
  /** confirm / dismiss / reopen a holding; same_holding / different_holding / undo_merge resolve a possible duplicate (FL-08). */
  action: z.enum(["confirm", "dismiss", "reopen", "same_holding", "different_holding", "undo_merge"]).optional(),
});

/**
 * Edit a holding or act on it. Evidence status is never set here directly —
 * the evidence rules re-derive it after every change (FL-07).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await assetAccess(req, id, "discovery");
  if (isDenied(access)) return access;
  const { asset, legacyCase } = access;
  const body = await parseJson(req, Body);
  if (body instanceof Response) return body;
  if (body.holderName !== undefined && body.holderName !== asset.holderName && asset.entitled) return errorResponse(409, "The holder name needs an authority review before it can change.");

  const data: Record<string, unknown> = {};
  if (body.holderName !== undefined) data.holderName = body.holderName;
  if (body.nomineeStatus !== undefined) data.nomineeStatus = body.nomineeStatus;
  if (body.institution !== undefined) data.institution = body.institution;
  if (body.maskedRef !== undefined) {
    data.maskedRef = body.maskedRef;
    data.last4 = last4Of(body.maskedRef);
  }
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.category !== undefined) data.category = body.category;
  if (Object.keys(data).length) {
    const edited = await db.assetRecord.update({ where: { id: asset.id }, data });
    await logEvent(asset.caseId, "asset", `User edited holding: ${edited.institution}`, "user", asset.id);
    await refreshAssetEvidence(edited);
  }

  if (body.action) {
    try {
      const current = await db.assetRecord.findUniqueOrThrow({ where: { id: asset.id } });
      await applyAssetAction(current, body.action);
    } catch (e) {
      if (e instanceof ReviewError) return errorResponse(409, e.message);
      throw e;
    }
  }

  const updated = await db.assetRecord.findUniqueOrThrow({ where: { id: asset.id }, include: { observations: true } });
  return Response.json({ asset: maskAsset(legacyCase, updated, updated.observations) });
}
