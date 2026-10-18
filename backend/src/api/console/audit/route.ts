import { audit, auditCsv } from "@server/domain/verify-console";
import { requireConsole } from "@server/core/console-guard";

/** The audit trail for this desk. `?format=csv` downloads it as a spreadsheet. */
export async function GET(req: Request) {
  const ctx = await requireConsole(req);
  if (ctx.response) return ctx.response;
  const url = new URL(req.url);
  const rows = await audit(ctx.console.id, { claim: url.searchParams.get("claim") ?? undefined, kind: url.searchParams.get("kind") ?? undefined });
  if (url.searchParams.get("format") === "csv") {
    return new Response(auditCsv(rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="verify-audit.csv"' } });
  }
  return Response.json({ events: rows });
}
