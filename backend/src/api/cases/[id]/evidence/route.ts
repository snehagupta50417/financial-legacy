import { caseAccess, isDenied } from "@server/core/access";
import { evidenceMap } from "@server/domain/evidence-map";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const access = await caseAccess(req, id, "discovery");
  if (isDenied(access)) return access;
  return Response.json({ map: await evidenceMap(id) });
}
