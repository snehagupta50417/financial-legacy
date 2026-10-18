import { appOrigin, authConfig, cookie, makePkce } from "@server/core/supabase-auth";
export async function GET(req: Request) {
  const config = authConfig();
  if (!config) return Response.json({ error: "Google sign-in is not configured yet." }, { status: 503 });
  const pkce = makePkce();
  const journey = new URL(req.url).searchParams.get("journey");
  const callback = new URL("/api/auth/callback", appOrigin()); callback.searchParams.set("state", pkce.state);
  const url = new URL(config.url + "/auth/v1/authorize");
  for (const [k, v] of Object.entries({ provider: "google", redirect_to: callback.href, code_challenge: pkce.challenge, code_challenge_method: "s256" })) url.searchParams.set(k, v);
  const flow = Buffer.from(JSON.stringify({ ...pkce, journey: ["discover", "prepare", "claim"].includes(journey || "") ? journey : null })).toString("base64url");
  return new Response(null, { status: 302, headers: { location: url.href, "cache-control": "no-store", "set-cookie": cookie("keeper_pkce", flow, 600, "/api/auth") } });
}
