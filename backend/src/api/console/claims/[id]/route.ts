import { detail } from "@server/domain/verify-console";
import { fail, requireConsole } from "@server/core/console-guard";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireConsole(req);
  if (guard.response) return guard.response;
  try { return Response.json(await detail(guard.console.id, (await ctx.params).id)); } catch (e) { return fail(e); }
}
