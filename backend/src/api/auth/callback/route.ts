import { appOrigin, authFetch, cookie, cookies, safeEqual, sessionCookies, verifiedUser } from "@server/core/supabase-auth";
export async function GET(req: Request) {
  const url = new URL(req.url); const headers = new Headers({ "cache-control": "no-store" });
  headers.append("set-cookie", cookie("keeper_pkce", "", 0, "/api/auth"));
  try {
    const flow = JSON.parse(Buffer.from(cookies(req).keeper_pkce || "", "base64url").toString());
    if (typeof flow.state !== "string" || typeof flow.verifier !== "string" || !safeEqual(flow.state, url.searchParams.get("state") || "") || !url.searchParams.get("code")) throw new Error("Invalid callback");
    const res = await authFetch("token?grant_type=pkce", { method: "POST", body: JSON.stringify({ auth_code: url.searchParams.get("code"), code_verifier: flow.verifier }) });
    const tokens = await res.json();
    if (!res.ok || typeof tokens.access_token !== "string" || typeof tokens.refresh_token !== "string" || !(await verifiedUser(tokens.access_token))) throw new Error("Sign-in failed");
    sessionCookies(headers, tokens);
    const target = new URL("/auth/complete", appOrigin());
    if (["discover", "prepare", "claim"].includes(flow.journey)) target.searchParams.set("journey", flow.journey);
    headers.set("location", target.href);
  } catch { headers.set("location", new URL("/signin?error=auth_failed", appOrigin()).href); }
  return new Response(null, { status: 302, headers });
}
