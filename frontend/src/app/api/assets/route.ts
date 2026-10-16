import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireSession, unauthorized } from "@/server/core/session";
import { logEvent } from "@/server/domain/case-service";

export const dynamic = "force-dynamic";

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

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const body = await req.json().catch(() => null);
  const caseId = String(body?.caseId ?? "");
  const legacyCase = await db.legacyCase.findFirst({ where: { id: caseId, sessionId: session.id } });
  if (!legacyCase) return Response.json({ error: "Case not found" }, { status: 404 });

  const created = await db.assetRecord.create({
    data: {
      caseId: legacyCase.id,
      category: ASSET_CATEGORIES_SET.has(body?.category) ? body.category : "unknown",
      institution: String(body?.institution ?? "Unnamed institution").slice(0, 120),
      maskedRef: body?.maskedRef ? String(body.maskedRef).slice(0, 60) : null,
      holderName: body?.holderName ? String(body.holderName).slice(0, 120) : null,
      evidence: "Added manually by user",
      confidence: 1,
      discoveryStatus: "confirmed",
      verificationStatus: "user_confirmed",
    },
  });
  await logEvent(legacyCase.id, "asset", `User added asset manually: ${created.institution}`, "user", created.id);
  return Response.json({ asset: created });
}
