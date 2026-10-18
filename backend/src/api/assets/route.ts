import { db } from "@server/db";
import { caseAccess, isDenied } from "@server/core/access";
import { last4Of, maskAsset } from "@server/core/masking";
import { logEvent } from "@server/domain/case-service";

const ASSET_CATEGORIES_SET = new Set([
  "bank_deposit",
  "bank_account",
  "insurance",
  "mutual_fund",
  "shares",
  "provident_fund",
  "other",
  "unknown",
]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const access = await caseAccess(req, String(body?.caseId ?? ""), "discovery");
  if (isDenied(access)) return access;
  const { legacyCase } = access;

  const created = await db.assetRecord.create({
    data: {
      caseId: legacyCase.id,
      category: ASSET_CATEGORIES_SET.has(body?.category) ? body.category : "unknown",
      institution: String(body?.institution ?? "Unnamed institution").slice(0, 120),
      maskedRef: body?.maskedRef ? String(body.maskedRef).slice(0, 60) : null,
      holderName: body?.holderName ? String(body.holderName).slice(0, 120) : null,
      last4: last4Of(body?.maskedRef ? String(body.maskedRef) : null),
      evidence: "Added manually by user",
      confidence: 1,
      discoveryStatus: "confirmed",
      // The family told us about it; a reviewed document can raise this later (FL-07).
      evidenceStatus: "self_declared",
    },
  });
  await logEvent(legacyCase.id, "asset", `User added asset manually: ${created.institution}`, "user", created.id);
  return Response.json({ asset: maskAsset(legacyCase, created) });
}
