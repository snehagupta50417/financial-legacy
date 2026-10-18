import { documentAccess, isDenied } from "@server/core/access";
import { documentProgress } from "@server/domain/document-progress";
import { takeToken } from "@server/core/rate-limit";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const access = await documentAccess(req, id, "discovery"); if (isDenied(access)) return access;
  return Response.json({ progress: await documentProgress(id) });
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const access = await documentAccess(req, id, "discovery"); if (isDenied(access)) return access;
  if (!takeToken("document-progress:" + access.session.id, 30)) return Response.json({ error: "Please wait a minute before checking again." }, { status: 429 });
  return Response.json({ progress: await documentProgress(id, true) });
}
