import { requireSession, unauthorized } from "@server/core/session";
import { getWorkspacePayload } from "@server/domain/case-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const { id } = await params;
  const ws = await getWorkspacePayload(id, session.id);
  if (!ws) return Response.json({ error: "Case not found" }, { status: 404 });
  return Response.json(ws);
}

/** Remove a demo case. Real cases are never deleted through the API. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const { db } = await import("@server/db");
  const c = await db.legacyCase.findFirst({ where: { id, sessionId: session.id } });
  if (!c) return Response.json({ error: "Case not found" }, { status: 404 });
  if (!c.isDemo) return Response.json({ error: "Only demo cases can be removed here." }, { status: 403 });
  await db.legacyCase.delete({ where: { id } });
  return Response.json({ removed: true });
}

/** Correct self-reported intake facts; never changes gates or entitlement. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const { db } = await import("@server/db");
  const c = await db.legacyCase.findFirst({ where: { id, sessionId: session.id } });
  if (!c) return Response.json({ error: "Case not found" }, { status: 404 });
  const { z } = await import("zod");
  const schema = z.object({ assetHolderName: z.string().trim().min(1).max(120).nullable().optional(), relationship: z.string().trim().min(1).max(120).nullable().optional() });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid case correction" }, { status: 400 });
  if (c.frozenReason || (c.gateReached !== "G0" && Object.keys(body.data).some(key => body.data[key as keyof typeof body.data] !== c[key as "assetHolderName" | "relationship"]))) return Response.json({ error: "Verified case details need a review before they can change. Your existing proof and access remain unchanged." }, { status: 409 });
  await db.legacyCase.update({ where: { id }, data: body.data });
  return Response.json({ saved: true });
}
