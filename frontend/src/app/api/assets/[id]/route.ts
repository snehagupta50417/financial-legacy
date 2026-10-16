import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, unauthorized } from "@/lib/session";
import { logEvent } from "@/lib/case-service";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const asset = await db.assetRecord.findFirst({
    where: { id, case: { sessionId: session.id } },
    include: { case: true },
  });
  if (!asset) return Response.json({ error: "Asset not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body?.institution === "string") data.institution = body.institution.slice(0, 120);
  if (typeof body?.maskedRef === "string") data.maskedRef = body.maskedRef.slice(0, 60);
  if (typeof body?.notes === "string") data.notes = body.notes.slice(0, 500);
  if (typeof body?.category === "string" && ASSET_CATEGORIES_SET.has(body.category))
    data.category = body.category;

  let eventDesc = "";
  if (body?.action === "confirm") {
    data.discoveryStatus = "confirmed";
    data.verificationStatus = "user_confirmed";
    eventDesc = `User confirmed asset: ${body?.institution ?? asset.institution}`;
  } else if (body?.action === "dismiss") {
    data.discoveryStatus = "dismissed";
    eventDesc = `User dismissed asset clue: ${asset.institution} (no supporting evidence)`;
  } else if (body?.action === "reopen") {
    data.discoveryStatus = "possible";
    data.verificationStatus = "unverified";
    eventDesc = `User re-opened asset clue: ${asset.institution}`;
  }

  const updated = await db.assetRecord.update({ where: { id: asset.id }, data });
  if (eventDesc) await logEvent(asset.caseId, "asset", eventDesc, "user", asset.id);

  return Response.json({ asset: updated });
}
