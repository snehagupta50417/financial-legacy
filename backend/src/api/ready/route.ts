import { db } from "@server/db";
/** Readiness is separate from process liveness; it checks storage without exposing configuration. */
export async function GET() {
  try { await db.$queryRaw`SELECT 1`; return Response.json({ ready: true }, { headers: { "cache-control": "no-store" } }); }
  catch { return Response.json({ ready: false }, { status: 503, headers: { "cache-control": "no-store" } }); }
}
