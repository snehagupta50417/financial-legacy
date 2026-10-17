import { NextRequest } from "next/server";
import { z } from "zod";
import { caseAccess, isDenied } from "@/server/core/access";
import { parseJson } from "@/server/core/http";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";
// Only presentation/draft state is writable here. Assets, proofs and approvals use their gated APIs.
const Fact = z.object({ key: z.string().max(80), value: z.string().max(2000).nullable(), state: z.enum(["unknown", "not_provided", "not_applicable", "needs_confirmation", "confirmed", "document_supported", "verified"]), source: z.enum(["You said", "Keeper inferred", "Document", "Sample record"]), date: z.string().max(40), note: z.string().max(2000).optional(), evidence: z.string().max(100).optional() });
const Message = z.object({ id: z.string().max(100), role: z.enum(["user", "keeper", "note"]), text: z.string().max(20000), ts: z.string().max(40), choices: z.array(z.object({ id: z.string().max(200), label: z.string().max(300) })).max(30).optional(), pending: z.string().max(100).optional(), card: z.object({ type: z.enum(["know", "plan", "asset", "doc", "claim", "family"]), id: z.string().max(100).optional() }).optional(), voice: z.boolean().optional() });
const Body = z.object({
  uiTasks: z.array(z.object({ id: z.string().regex(/^followup:/).max(100), title: z.string().max(300), why: z.string().max(1000), milestone: z.enum(["understand", "gather", "review", "prepare", "claims", "follow"]), state: z.enum(["open", "done"]), blocker: z.string().max(300).optional() })).max(100).default([]),
  facts: z.record(z.string().max(80), Fact),
  threads: z.array(z.object({ id: z.string().max(100), title: z.string().max(300), journey: z.enum(["discover", "prepare", "claim"]).nullable(), pending: z.string().max(100).nullable(), messages: z.array(Message).max(1000) })).min(1).max(100),
  activeThread: z.string().max(100),
  contacts: z.array(z.object({ id: z.string().max(100), name: z.string().max(120), relation: z.string().max(120), sees: z.object({ assets: z.boolean(), documents: z.boolean(), instructions: z.boolean(), claims: z.boolean() }) })).max(100),
  family: z.object({ instructions: z.string().max(20000), reviewedAt: z.string().max(40).nullable(), cadence: z.string().max(100).nullable() }),
  plan: z.array(z.object({ id: z.string().max(100), label: z.string().max(300), type: z.enum(["uploaded", "connected", "guided", "manual"]), state: z.enum(["needs_info", "awaiting_consent", "ready", "in_progress", "completed", "unavailable", "planned"]), note: z.string().max(3000), url: z.string().url().max(1000).optional(), result: z.string().max(3000).optional() })).max(100),
});
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await caseAccess(req, id, "owner");
  if (isDenied(access)) return access;
  const row = await db.caseEvent.findFirst({ where: { caseId: id, eventType: "keeper_ui", refId: "keeper-ui" }, orderBy: { createdAt: "desc" } });
  return Response.json({ ui: row ? JSON.parse(row.description) : null });
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await caseAccess(req, id, "owner");
  if (isDenied(access)) return access;
  const body = await parseJson(req, Body);
  if (body instanceof Response) return body;
  // UI draft facts are self-reported only; this never grants a verification status.
  for (const f of Object.values(body.facts)) { if (["verified", "document_supported"].includes(f.state)) f.state = "needs_confirmation"; if (["Document", "Sample record"].includes(f.source)) f.source = "You said"; }
  const row = await db.caseEvent.findFirst({ where: { caseId: id, eventType: "keeper_ui", refId: "keeper-ui" } });
  const data = { description: JSON.stringify(body) };
  if (row) await db.caseEvent.update({ where: { id: row.id }, data });
  else await db.caseEvent.create({ data: { ...data, caseId: id, eventType: "keeper_ui", refId: "keeper-ui", actor: "system" } });
  return Response.json({ saved: true });
}
