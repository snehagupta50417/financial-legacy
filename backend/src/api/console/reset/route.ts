import { reset } from "@server/domain/verify-console";
import { requireConsole } from "@server/core/console-guard";

/** Start the demo over with fresh claims and an empty audit trail. */
export async function POST(req: Request) {
  const ctx = await requireConsole(req);
  if (ctx.response) return ctx.response;
  await reset(ctx.console.id);
  return Response.json({ ok: true });
}
