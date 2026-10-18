import { z } from "zod";
import { db } from "@server/db";
import { caseAccess, isDenied } from "@server/core/access";
import { parseJson } from "@server/core/http";
import { redactIdentifiers } from "@server/core/masking";
import { takeToken } from "@server/core/rate-limit";
import { logEvent } from "@server/domain/case-service";

const Body = z.object({
  why: z.enum(["person_asked", "keeper_unsure", "sensitive"]),
  note: z.string().trim().max(500).default(""),
  transcript: z.array(z.object({ role: z.enum(["user", "keeper"]), text: z.string().max(600) })).max(20).default([]),
});

const view = (h: { id: string; why: string; note: string; status: string; createdAt: Date }) => ({ id: h.id, why: h.why, note: h.note, status: h.status, createdAt: h.createdAt.toISOString() });

/**
 * "Talk to a person". Saves a request with a short, redacted transcript so nobody has to start over.
 * There is no reviewer console yet, so the request waits with the case; the app says so plainly.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseJson(req, Body);
  if (body instanceof Response) return body;
  const access = await caseAccess(req, id, "owner");
  if (isDenied(access)) return access;
  const { session, legacyCase } = access;
  if (!takeToken(`handoff:${session.id}`, 5)) return Response.json({ error: "You have asked a few times already. Your earlier requests are saved." }, { status: 429 });

  const open = await db.handoffRequest.findFirst({ where: { caseId: legacyCase.id, status: "requested" } });
  if (open) return Response.json({ handoff: view(open), already: true });

  const handoff = await db.handoffRequest.create({
    data: {
      caseId: legacyCase.id,
      sessionId: session.id,
      why: body.why,
      note: redactIdentifiers(body.note),
      transcript: JSON.stringify(body.transcript.map((t) => ({ role: t.role, text: redactIdentifiers(t.text) }))),
    },
  });
  await logEvent(legacyCase.id, "handoff", "You asked for a person to look at this case. Nobody has picked it up yet.", "user", handoff.id);
  return Response.json({ handoff: view(handoff) }, { status: 201 });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await caseAccess(req, id, "owner");
  if (isDenied(access)) return access;
  const rows = await db.handoffRequest.findMany({ where: { caseId: access.legacyCase.id }, orderBy: { createdAt: "desc" }, take: 10 });
  return Response.json({ handoffs: rows.map(view) });
}
