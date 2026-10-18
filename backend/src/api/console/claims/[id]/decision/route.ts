import { ESCALATION_LABEL, type DecisionBody } from "@shared/verify-view";
import { DOC_LABEL, type DocKind } from "@shared/verify-rules";
import { decide } from "@server/domain/verify-console";
import { fail, requireConsole } from "@server/core/console-guard";

/** Approve, request documents (simulated) or escalate. Always a person's decision; the server enforces the safeguards. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireConsole(req);
  if (guard.response) return guard.response;
  const b = await req.json().catch(() => null);
  if (!b || !["approve", "request_documents", "escalate"].includes(b.action)) return Response.json({ error: "Choose approve, request documents or escalate." }, { status: 400 });
  const body: DecisionBody = {
    action: b.action,
    note: typeof b.note === "string" ? b.note.slice(0, 1000) : undefined,
    reason: typeof b.reason === "string" && b.reason in ESCALATION_LABEL ? (b.reason as DecisionBody["reason"]) : undefined,
    documents: Array.isArray(b.documents) ? (b.documents.filter((k: unknown) => typeof k === "string" && k in DOC_LABEL) as DocKind[]) : undefined,
    message: typeof b.message === "string" ? b.message.slice(0, 2000) : undefined,
    acknowledged: b.acknowledged === true,
  };
  try { return Response.json(await decide(guard.console.id, (await ctx.params).id, guard.console.reviewer, body)); } catch (e) { return fail(e); }
}
