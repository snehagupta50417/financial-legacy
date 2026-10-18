import { queue } from "@server/domain/verify-console";
import { requireConsole } from "@server/core/console-guard";

export async function GET(req: Request) {
  const ctx = await requireConsole(req);
  if (ctx.response) return ctx.response;
  return Response.json(await queue(ctx.console.id));
}
