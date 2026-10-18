import { accessToken, authFetch, authRequired, clearAuthCookies, cookies, sessionCookies, verifiedUser } from "@server/core/supabase-auth";
export async function GET(req: Request) {
  const headers = new Headers({ "cache-control": "no-store" });
  if (!authRequired()) return Response.json({ authenticated: false, mode: "demo" }, { headers });
  let user: { id: string } | null;
  try { user = await verifiedUser(accessToken(req)); }
  catch { return Response.json({ error: "Sign-in is temporarily unavailable. Please try again." }, { status: 503, headers }); }
  if (!user && cookies(req).keeper_refresh) {
    try {
      const res = await authFetch("token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: cookies(req).keeper_refresh }) });
      if (res.status >= 500 || res.status === 429) throw new Error("Provider unavailable");
      const tokens = await res.json();
      if (res.ok && typeof tokens.access_token === "string" && typeof tokens.refresh_token === "string") {
        user = await verifiedUser(tokens.access_token); if (user) sessionCookies(headers, tokens);
      }
    } catch { return Response.json({ error: "Sign-in is temporarily unavailable. Please try again." }, { status: 503, headers }); }
  }
  if (!user) { clearAuthCookies(headers); return Response.json({ authenticated: false, mode: "supabase" }, { status: 401, headers }); }
  // Google profile information is not copied into synthetic financial records or sent to AI.
  return Response.json({ authenticated: true, mode: "supabase", accountId: user.id, name: "You" }, { headers });
}
