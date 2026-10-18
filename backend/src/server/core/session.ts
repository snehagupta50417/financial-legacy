import { db } from "@server/db";
import { accessToken, authRequired, sameOrigin, verifiedUser } from "./supabase-auth";

/** Hosted identity is verified by Supabase. Browser IDs are only for local synthetic demos. */
export async function requireSession(req: Request) {
  let sessionId: string;
  if (authRequired()) {
    if (!req.headers.has("authorization") && !["GET", "HEAD", "OPTIONS"].includes(req.method) && !sameOrigin(req)) return null;
    const user = await verifiedUser(accessToken(req));
    if (!user) return null;
    const expectedAccount = req.headers.get("x-keeper-account");
    if (expectedAccount && expectedAccount !== user.id) return null;
    sessionId = "supabase:" + user.id;
  } else {
    const id = req.headers.get("x-session-id");
    if (!id || id.length < 8 || id.length > 128 || id.startsWith("supabase:")) return null;
    sessionId = id;
  }
  return db.session.upsert({ where: { id: sessionId }, update: {}, create: { id: sessionId } });
}
export function unauthorized() {
  return Response.json({ error: "Sign in to access your Keeper records.", code: "unauthorized" }, { status: 401 });
}
