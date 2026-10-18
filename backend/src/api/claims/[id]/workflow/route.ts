import { claimAccess, isDenied } from "@server/core/access";
import { db } from "@server/db";
import { ensureWorkflow, workflowView } from "@server/domain/claim-workflow";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const access = await claimAccess(req, id); if (isDenied(access)) return access;
  const job = await db.claimWorkflow.findUnique({ where: { claimId: id } });
  return Response.json({ workflow: job ? workflowView(job) : null });
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const access = await claimAccess(req, id); if (isDenied(access)) return access;
  return Response.json({ workflow: workflowView(await ensureWorkflow(access.legacyCase.id, id)) }, { status: 202 });
}
