import { CHECKS, type CheckKey } from "@shared/verify-rules";
import { runClaimChecks } from "@server/domain/verify-console";
import { fail, requireConsole } from "@server/core/console-guard";

/** Run the four checks. `simulateFailure` (demo only) makes one check report that it could not finish. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireConsole(req);
  if (guard.response) return guard.response;
  const body = await req.json().catch(() => null);
  const sim = body?.simulateFailure;
  if (sim !== undefined && !CHECKS.includes(sim)) return Response.json({ error: "Unknown check." }, { status: 400 });
  try { return Response.json(await runClaimChecks(guard.console.id, (await ctx.params).id, guard.console.reviewer, sim as CheckKey | undefined)); } catch (e) { return fail(e); }
}
