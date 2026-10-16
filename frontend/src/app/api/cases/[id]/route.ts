import { NextRequest } from "next/server";
import { requireSession, unauthorized } from "@/lib/session";
import { getWorkspacePayload } from "@/lib/case-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const { id } = await params;
  const ws = await getWorkspacePayload(id, session.id);
  if (!ws) return Response.json({ error: "Case not found" }, { status: 404 });
  return Response.json(ws);
}
