import { accessToken, authFetch, clearAuthCookies, sameOrigin } from "@server/core/supabase-auth";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const token = accessToken(req);
  if (token) try { await authFetch("logout", { method: "POST", headers: { authorization: `Bearer ${token}` } }); } catch { /* Always clear this browser's cookies. */ }
  const headers = new Headers({ "cache-control": "no-store" }); clearAuthCookies(headers);
  return Response.json({ signedOut: true }, { headers });
}
