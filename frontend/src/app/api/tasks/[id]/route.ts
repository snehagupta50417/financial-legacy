import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireSession, unauthorized } from "@/server/core/session";
import { logEvent, getWorkspacePayload } from "@/server/domain/case-service";
import { recalcProgress } from "@/server/domain/journey-engine";

export const dynamic = "force-dynamic";

const STATUSES = new Set([
  "not_started",
  "ready",
  "in_progress",
  "waiting_institution",
  "needs_expert",
  "completed",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const task = await db.journeyTask.findFirst({
    where: { id, case: { sessionId: session.id } },
    include: { case: true },
  });
  if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  let eventDesc = "";

  if (typeof body?.status === "string" && STATUSES.has(body.status)) {
    data.status = body.status;
    if (body.status === "completed") {
      data.completedAt = new Date();
      data.completionEvidence =
        typeof body?.completionEvidence === "string" && body.completionEvidence.trim()
          ? body.completionEvidence.trim().slice(0, 500)
          : "Completed by user (self-reported)";
      eventDesc = `Completed: ${task.title}`;
    } else if (body.status === "waiting_institution") {
      eventDesc = `Marked as waiting for institution: ${task.title}`;
    } else if (body.status === "in_progress") {
      eventDesc = `Started: ${task.title}`;
    } else if (body.status === "needs_expert") {
      eventDesc = `Flagged for expert review: ${task.title}`;
    } else {
      eventDesc = `Status updated (${body.status}): ${task.title}`;
    }
  }
  if (typeof body?.completionEvidence === "string" && body.status !== "completed") {
    data.completionEvidence = body.completionEvidence.slice(0, 500);
  }

  await db.journeyTask.update({ where: { id: task.id }, data });

  // Recalculate progress + next best action across all case tasks
  const all = await db.journeyTask.findMany({
    where: { caseId: task.caseId },
    select: { id: true, status: true, dependencies: true, priority: true },
  });
  const { progress, nextBestTaskId } = recalcProgress(all);
  await db.journeyTask.updateMany({
    where: { caseId: task.caseId },
    data: { isNextBest: false },
  });
  if (nextBestTaskId) {
    await db.journeyTask.update({
      where: { id: nextBestTaskId },
      data: { isNextBest: true },
    });
  }
  const nextTask = nextBestTaskId
    ? await db.journeyTask.findUnique({ where: { id: nextBestTaskId } })
    : null;

  const stage =
    progress >= 100
      ? "resolution"
      : progress >= 50
        ? "action"
        : task.case.stage === "understanding"
          ? "discovery"
          : task.case.stage;

  await db.legacyCase.update({
    where: { id: task.caseId },
    data: {
      progress,
      stage,
      nextBestAction: nextTask ? nextTask.title : null,
    },
  });

  if (eventDesc) {
    await logEvent(
      task.caseId,
      "task",
      `${eventDesc} — journey progress now ${progress}%`,
      "user",
      task.id
    );
  }

  const ws = await getWorkspacePayload(task.caseId, session.id);
  return Response.json(ws);
}
