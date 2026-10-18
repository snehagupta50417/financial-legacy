import { caseAccess, isDenied } from "@server/core/access";
import { db } from "@server/db";

/** Resume the case conversation, scoped to its owner (FL-01, FL-27). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await caseAccess(req, id, "owner");
  if (isDenied(access)) return access;
  const [intake, questions] = await Promise.all([
    db.intakeMessage.findMany({ where: { caseId: id, sessionId: access.session.id }, orderBy: { createdAt: "asc" } }),
    db.qaMessage.findMany({ where: { caseId: id }, orderBy: { createdAt: "asc" } }),
  ]);
  const messages = [
    ...intake.map(m => ({ id: m.id, role: m.role, text: m.content, at: m.createdAt.toISOString() })),
    ...questions.flatMap(m => [
      { id: m.id + "-q", role: "user", text: m.question, at: m.createdAt.toISOString() },
      { id: m.id + "-a", role: "assistant", text: m.answer, at: m.createdAt.toISOString() },
    ]),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return Response.json({ messages });
}
