import type { NextRequest } from "next/server";
import type { LegacyCase, Session } from "@prisma/client";
import { db } from "@/server/db";
import { requireSession, unauthorized } from "./session";
import { canDiscover, GATE_LABEL, nextGate } from "./gate-engine";

/**
 * requireGate guard (plan §3). Every case-scoped route handler loads its case
 * through here, so the UI cannot skip a gate. Foreign ids are 404, never 403.
 *
 *   owner     – the session owns the case
 *   discovery – owner AND the case's discovery gate is reached AND not frozen
 */
export type Need = "owner" | "discovery";

export interface CaseAccess {
  session: Session;
  legacyCase: LegacyCase;
}

export function isDenied<T>(r: T | Response): r is Response {
  return r instanceof Response;
}

export function gateDenial(c: LegacyCase): Response | null {
  if (c.frozenReason) {
    return Response.json({ error: c.frozenReason, frozen: true }, { status: 423 });
  }
  if (!canDiscover(c)) {
    const g = nextGate(c);
    return Response.json(
      {
        error: `This is locked until you complete: ${g ? GATE_LABEL[g] : "verification"}.`,
        nextGate: g,
      },
      { status: 403 }
    );
  }
  return null;
}

export async function caseAccess(req: NextRequest, caseId: string, need: Need): Promise<CaseAccess | Response> {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const legacyCase = caseId ? await db.legacyCase.findFirst({ where: { id: caseId, sessionId: session.id } }) : null;
  if (!legacyCase) return Response.json({ error: "Case not found" }, { status: 404 });
  if (need === "discovery") {
    const denied = gateDenial(legacyCase);
    if (denied) return denied;
  }
  return { session, legacyCase };
}

export async function assetAccess(req: NextRequest, assetId: string, need: Need) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const asset = await db.assetRecord.findFirst({
    where: { id: assetId, case: { sessionId: session.id } },
    include: { case: true },
  });
  if (!asset) return Response.json({ error: "Asset not found" }, { status: 404 });
  if (need === "discovery") {
    const denied = gateDenial(asset.case);
    if (denied) return denied;
  }
  return { session, asset, legacyCase: asset.case };
}

export async function documentAccess(req: NextRequest, documentId: string, need: Need) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const doc = await db.documentRecord.findFirst({
    where: { id: documentId, case: { sessionId: session.id } },
    include: { case: true },
  });
  if (!doc) return Response.json({ error: "Document not found" }, { status: 404 });
  if (need === "discovery") {
    const denied = gateDenial(doc.case);
    if (denied) return denied;
  }
  return { session, doc, legacyCase: doc.case };
}
