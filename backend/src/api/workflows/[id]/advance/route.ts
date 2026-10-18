import { z } from "zod";
import { caseAccess, isDenied } from "@server/core/access";
import { parseJson } from "@server/core/http";
import { db } from "@server/db";
import { advanceWorkflow, restartWorkflow, workflowView } from "@server/domain/claim-workflow";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const job = await db.claimWorkflow.findUnique({ where: { id } });
  if (!job) return Response.json({ error: "Workflow not found" }, { status: 404 });
  const access = await caseAccess(req, job.caseId, "discovery"); if (isDenied(access)) return access;
  await advanceWorkflow(id);
  const updated = await db.claimWorkflow.findUniqueOrThrow({ where: { id } });
  return Response.json({ workflow: workflowView(updated) });
}
