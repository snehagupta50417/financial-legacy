import { z } from "zod";
import { db } from "@server/db";
import { parseJson } from "@server/core/http";
import { requireSession, unauthorized } from "@server/core/session";
import { accessToken, authFetch, clearAuthCookies } from "@server/core/supabase-auth";

/** Deletes Keeper application data only, not the Google/Supabase identity or shared public reference material. */
export async function DELETE(req: Request) {
  const session = await requireSession(req); if (!session) return unauthorized();
  const body = await parseJson(req, z.object({ confirmation: z.literal("DELETE") }));
  if (body instanceof Response) return body;
  await db.$transaction(async tx => {
    const cases = await tx.legacyCase.findMany({ where: { sessionId: session.id }, select: { deceasedPersonId: true } });
    await tx.session.delete({ where: { id: session.id } });
    const ids = cases.flatMap(c => c.deceasedPersonId ? [c.deceasedPersonId] : []);
    if (ids.length) await tx.deceasedPerson.deleteMany({ where: { id: { in: ids }, cases: { none: {} } } });
  });
  const token = accessToken(req);
  if (token) try { await authFetch("logout", { method: "POST", headers: { authorization: `Bearer ${token}` } }); } catch { /* Local cookies are still removed. */ }
  const headers = new Headers({ "cache-control": "no-store" }); clearAuthCookies(headers);
  return Response.json({ deleted: true, scope: "Keeper application data", authAccountDeleted: false }, { headers });
}
