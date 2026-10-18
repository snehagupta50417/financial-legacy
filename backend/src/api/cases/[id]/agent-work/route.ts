import { z } from "zod";
import { db } from "@server/db";
import { caseAccess, isDenied } from "@server/core/access";
import { parseJson } from "@server/core/http";
import { canDiscover } from "@server/core/gate-engine";
import { takeToken } from "@server/core/rate-limit";
import { advanceCaseAgent, caseAgentView, pauseCaseAgent, reconcileCaseAgent, startCaseAgent } from "@server/domain/case-agent";
const Body = z.object({ action: z.enum(["start", "advance", "pause", "reconcile"]), revision: z.number().int().positive().optional() });
function visible(job: NonNullable<Awaited<ReturnType<typeof startCaseAgent>>>, c: Parameters<typeof canDiscover>[0] & { frozenReason?: string | null }) {
  const view = caseAgentView(job);
  return c.frozenReason || !canDiscover(c) ? { ...view, plan: [], receipts: [], result: { summary: "Case checks need attention before preparation can continue.", needs: ["Review identity, authority or the hold on this case."], target: { type: "know" as const } } } : view;
}
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const access = await caseAccess(req, id, "owner"); if (isDenied(access)) return access;
  const job = await db.caseAgentRun.findUnique({ where: { caseId: id } });
  return Response.json({ run: job ? visible(job, access.legacyCase) : null });
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const access = await caseAccess(req, id, "owner"); if (isDenied(access)) return access;
  if (!takeToken(`case-agent:${access.session.id}`, 180)) return Response.json({ error: "Preparation is busy. Reconnect shortly; saved progress is preserved." }, { status: 429 });
  const body = await parseJson(req, Body); if (body instanceof Response) return body;
  const job = body.action === "pause" ? await pauseCaseAgent(id) : body.action === "reconcile" ? await reconcileCaseAgent(id) : body.action === "start" ? await startCaseAgent(id, body.revision) : await advanceCaseAgent(id);
  return Response.json({ run: job ? visible(job, access.legacyCase) : null });
}
