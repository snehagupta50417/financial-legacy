import { authConfig, authRequired } from "@server/core/supabase-auth";
export async function GET() { return Response.json({ mode: authRequired() ? "supabase" : "demo", configured: !!authConfig(), syntheticOnly: true }, { headers: { "cache-control": "no-store" } }); }
