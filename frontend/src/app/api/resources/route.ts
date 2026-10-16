import { OFFICIAL_RESOURCES } from "@/lib/resources";

export const dynamic = "force-static";

export async function GET() {
  return Response.json({ resources: OFFICIAL_RESOURCES });
}
