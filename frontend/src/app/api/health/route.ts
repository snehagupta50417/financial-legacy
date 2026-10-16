export const dynamic = "force-dynamic";

/** Unauthenticated liveness check for Cloud Run. No data, no config details. */
export async function GET() {
  return Response.json({ status: "ok" });
}
