import { recalcProgress } from "@server/domain/journey-engine";
import { z } from "zod";
import { db } from "@server/db";
import { caseAccess, isDenied } from "@server/core/access";
import { parseJson } from "@server/core/http";
import { redactIdentifiers } from "@server/core/masking";
import { readSearchResult } from "@server/domain/guided-search";
import { SEARCH_OUTCOMES, SEARCH_LABEL, type GuidedSearchResult } from "@shared/guided-search";
const Body = z.object({
  requestId: z.string().uuid(), sourceUrl: z.string().url().max(1000), outcome: z.enum(SEARCH_OUTCOMES),
  scope: z.string().trim().min(3).max(500), searchedAt: z.string().datetime({ offset: true }),
  evidenceNote: z.string().max(1000).default(""), documentId: z.string().max(100).optional(),
});
function replay(old: { caseId: string; description: string }, result: GuidedSearchResult) {
  const prior = readSearchResult(old.description);
  if (old.caseId !== result.caseId || !prior || prior.sourceUrl !== result.sourceUrl || prior.outcome !== result.outcome || prior.scope !== result.scope || prior.searchedAt !== result.searchedAt || prior.evidenceNote !== result.evidenceNote || prior.documentId !== result.documentId) return Response.json({ error: "That request ID was already used for a different result." }, { status: 409 });
  return Response.json({ result: prior, replayed: true });
}
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const access = await caseAccess(req, id, "discovery"); if (isDenied(access)) return access;
  const events = await db.caseEvent.findMany({ where: { caseId: id, eventType: "guided_search" }, orderBy: { createdAt: "desc" } });
  return Response.json({ results: events.map(e => readSearchResult(e.description)).filter(Boolean) });
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const access = await caseAccess(req, id, "discovery"); if (isDenied(access)) return access;
  const body = await parseJson(req, Body); if (body instanceof Response) return body;
  if (Date.parse(body.searchedAt) > Date.now() + 60_000) return Response.json({ error: "Search date cannot be in the future." }, { status: 400 });
  const task = await db.journeyTask.findFirst({ where: { caseId: id, officialUrl: body.sourceUrl } });
  if (!task) return Response.json({ error: "Choose an official source from this case's discovery plan." }, { status: 400 });
  if (body.documentId && !(await db.documentRecord.findFirst({ where: { id: body.documentId, caseId: id } }))) return Response.json({ error: "Evidence document not found." }, { status: 404 });
  const dateLabel = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(body.searchedAt));
  const summary = `${SEARCH_LABEL[body.outcome]} on ${task.officialName || task.title}, ${dateLabel} IST. Scope: ${redactIdentifiers(body.scope)}. Self-reported; this does not verify ownership or cover other searches.`;
  const result: GuidedSearchResult = { id: body.requestId, caseId: id, taskId: task.id, sourceUrl: task.officialUrl!, sourceName: task.officialName || task.title, outcome: body.outcome, scope: redactIdentifiers(body.scope), searchedAt: body.searchedAt, recordedAt: new Date().toISOString(), evidenceNote: redactIdentifiers(body.evidenceNote), ...(body.documentId ? { documentId: body.documentId } : {}), summary, selfReported: true };
  const old = await db.caseEvent.findUnique({ where: { id: body.requestId } });
  if (old) return replay(old, result);
  try {
  await db.$transaction(async tx => {
    await tx.caseEvent.create({ data: { id: result.id, caseId: id, eventType: "guided_search", actor: "user", refId: task.id, description: JSON.stringify({ kind: "guided_search_v1", result }) } });
    await tx.journeyTask.update({ where: { id: task.id }, data: { completionEvidence: JSON.stringify(result), status: ["possible_match", "no_match"].includes(body.outcome) ? "completed" : "in_progress", completedAt: ["possible_match", "no_match"].includes(body.outcome) ? new Date() : null } });
    const tasks = await tx.journeyTask.findMany({ where: { caseId: id }, select: { id: true, title: true, status: true, dependencies: true, priority: true } });
    const next = recalcProgress(tasks);
    await tx.journeyTask.updateMany({ where: { caseId: id }, data: { isNextBest: false } });
    if (next.nextBestTaskId) await tx.journeyTask.update({ where: { id: next.nextBestTaskId }, data: { isNextBest: true } });
    await tx.legacyCase.update({ where: { id }, data: { progress: next.progress, nextBestAction: tasks.find(t => t.id === next.nextBestTaskId)?.title || null } });
  });
  } catch (error) {
    // A retry can overlap the first request; the unique request ID prevents a second write.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const prior = await db.caseEvent.findUnique({ where: { id: result.id } });
      if (prior) return replay(prior, result);
    }
    throw error;
  }
  return Response.json({ result }, { status: 201 });
}
