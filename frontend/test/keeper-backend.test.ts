import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as messages } from "@/app/api/cases/[id]/messages/route";
import { POST as ask } from "@/app/api/ai/ask/route";
import { db } from "@/server/db";

const owner = "keeper-backend-owner-session";
function req(sid: string, body?: unknown) {
  return new NextRequest("http://localhost/api/test", { method: body ? "POST" : "GET", headers: { "x-session-id": sid, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("FL-01 / FL-27 Keeper backend conversation resume", () => {
  it("returns only this case's intake and Q&A, in chronological order", async () => {
    await db.session.upsert({ where: { id: owner }, create: { id: owner }, update: {} });
    const c = await db.legacyCase.create({ data: { sessionId: owner, caseType: "living_individual", summary: "Synthetic case" } });
    const second = await db.legacyCase.create({ data: { sessionId: owner, caseType: "estate_planning", summary: "Another synthetic case" } });
    await db.intakeMessage.create({ data: { sessionId: owner, caseId: c.id, role: "user", content: "Find my assets", createdAt: new Date("2026-10-17T10:00:00Z") } });
    await db.intakeMessage.create({ data: { sessionId: owner, caseId: second.id, role: "user", content: "Other case secret" } });
    await db.qaMessage.create({ data: { caseId: c.id, question: "What next?", answer: "Review your records.", createdAt: new Date("2026-10-17T11:00:00Z") } });
    const result = await messages(req(owner), params(c.id));
    expect(result.status).toBe(200);
    expect((await result.json()).messages.map((m: { text: string }) => m.text)).toEqual(["Find my assets", "What next?", "Review your records."]);
    expect((await messages(req("unrelated-keeper-session"), params(c.id))).status).toBe(404);
    expect((await messages(req(""), params(c.id))).status).toBe(401);
  });

  it("persists no-AI replies so a refresh does not lose the conversation", async () => {
    const c = await db.legacyCase.findFirstOrThrow({ where: { sessionId: owner } });
    const result = await ask(req(owner, { caseId: c.id, question: "Which bank documents should I gather?" }));
    expect(result.status).toBe(200);
    const reply = await result.json();
    expect(reply.mode).toBe("passages");
    const saved = await messages(req(owner), params(c.id));
    expect((await saved.json()).messages.at(-1).text).toBe(reply.answer);
  });
});
