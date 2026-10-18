// Keeper saved state: identifiers are redacted before storage, and it never lives in the CaseEvent audit table.
// PRD FL-01, FL-02, FL-18, FL-46; "read, extract, forget" (LLD §8, §16.2).
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getUi, PUT as putUi } from "@/app/api/cases/[id]/keeper/route";
import { POST as ask } from "@/app/api/ai/ask/route";
import { POST as intake } from "@/app/api/intake/route";
import { db } from "@/server/db";
import { getWorkspacePayload } from "@/server/domain/case-service";

const owner = "keeper-ui-owner-session";
const stranger = "keeper-ui-stranger-session";
const NUMBER = "123456789012";
const PAN = "ABCDE1234F";

function req(sid: string, body?: unknown, method = body ? "PUT" : "GET") {
  return new NextRequest("http://localhost/api/test", { method, headers: { "x-session-id": sid, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

const ui = (over: Record<string, unknown> = {}) => ({
  facts: {},
  threads: [{ id: "t1", title: "Find my assets", journey: "discover", pending: null, messages: [{ id: "m1", role: "user", text: `My account number is ${NUMBER} and my PAN is ${PAN}`, ts: "2026-10-18T10:00:00Z" }] }],
  activeThread: "t1",
  contacts: [],
  family: { instructions: `Locker key is with Anita, phone 98765 43210`, reviewedAt: null, cadence: null },
  plan: [],
  ...over,
});

async function makeCase(sid = owner) {
  await db.session.upsert({ where: { id: sid }, create: { id: sid }, update: {} });
  return db.legacyCase.create({ data: { sessionId: sid, caseType: "living_individual", summary: "Synthetic case" } });
}

describe("saved Keeper state is redacted before it is stored", () => {
  it("keeps only the last four digits of numbers typed into the chat, and masks PANs", async () => {
    const c = await makeCase();
    expect((await putUi(req(owner, ui()), params(c.id))).status).toBe(200);

    const stored = (await db.legacyCase.findUniqueOrThrow({ where: { id: c.id } })).keeperUi!;
    expect(stored).not.toContain(NUMBER);
    expect(stored).not.toContain(PAN);
    expect(stored).not.toMatch(/\d{6,}/);
    expect(stored).toContain("••••9012");

    const back = (await (await getUi(req(owner), params(c.id))).json()) as { ui: { threads: { messages: { text: string }[] }[]; family: { instructions: string } } };
    expect(back.ui.threads[0].messages[0].text).toBe("My account number is ••••9012 and my PAN is •••••1234•");
    expect(back.ui.family.instructions).toBe("Locker key is with Anita, phone ••••3210");
  });

  it("never lets draft state claim a verification, a document or a sample source", async () => {
    const c = await makeCase();
    const fact = (state: string, source: string) => ({ key: "known", value: "HDFC Bank", state, source, date: "2026-10-18" });
    await putUi(req(owner, ui({ facts: { a: fact("verified", "Document"), b: fact("document_supported", "Sample record"), c: fact("confirmed", "You said") } })), params(c.id));
    const { ui: saved } = (await (await getUi(req(owner), params(c.id))).json()) as { ui: { facts: Record<string, { state: string; source: string }> } };
    expect(saved.facts.a).toMatchObject({ state: "needs_confirmation", source: "You said" });
    expect(saved.facts.b).toMatchObject({ state: "needs_confirmation", source: "You said" });
    expect(saved.facts.c).toMatchObject({ state: "confirmed", source: "You said" });
  });

  it("redacts the question and answer logged by the assistant, too", async () => {
    const c = await makeCase();
    const res = await ask(req(owner, { caseId: c.id, question: `Is account ${NUMBER} covered?` }, "POST"));
    expect(res.status).toBe(200);
    const saved = await db.qaMessage.findFirstOrThrow({ where: { caseId: c.id } });
    expect(saved.question).toBe("Is account ••••9012 covered?");
    expect(saved.question).not.toContain(NUMBER);
  });
});

describe("the intake log is redacted too", () => {
  it("stores the user's words and Keeper's reply without full identifiers", async () => {
    const sid = "keeper-ui-intake-session";
    await db.session.upsert({ where: { id: sid }, create: { id: sid }, update: {} });
    const res = await intake(req(sid, { message: `I lost track of my old account ${NUMBER} at HDFC` }, "POST"));
    expect(res.status).toBe(200);
    const rows = await db.intakeMessage.findMany({ where: { sessionId: sid }, orderBy: { createdAt: "asc" } });
    expect(rows.map((r) => r.role)).toEqual(["user", "assistant"]);
    for (const r of rows) expect(r.content).not.toContain(NUMBER);
    expect(rows[0].content).toContain("••••9012");
  });
});

describe("saved state is not an audit event", () => {
  it("writes nothing to CaseEvent, however many times it is saved", async () => {
    const c = await makeCase();
    const before = await db.caseEvent.count({ where: { caseId: c.id } });
    for (let i = 0; i < 3; i++) await putUi(req(owner, ui()), params(c.id));
    expect(await db.caseEvent.count({ where: { caseId: c.id } })).toBe(before);
    expect(await db.caseEvent.count({ where: { caseId: c.id, eventType: "keeper_ui" } })).toBe(0);
  });

  it("keeps any older stored copy out of the workspace events", async () => {
    const c = await makeCase();
    await db.caseEvent.create({ data: { caseId: c.id, eventType: "keeper_ui", refId: "keeper-ui", actor: "system", description: JSON.stringify(ui()) } });
    await db.caseEvent.create({ data: { caseId: c.id, eventType: "document", actor: "user", description: "A real audit event" } });
    const ws = await getWorkspacePayload(c.id, owner);
    expect(ws!.events.map((e) => e.description)).toEqual(["A real audit event"]);
  });

  it("moves an older copy out of the audit table on first read, redacting it", async () => {
    const c = await makeCase();
    await db.caseEvent.create({ data: { caseId: c.id, eventType: "keeper_ui", refId: "keeper-ui", actor: "system", description: JSON.stringify(ui()) } });
    const { ui: moved } = (await (await getUi(req(owner), params(c.id))).json()) as { ui: { threads: { messages: { text: string }[] }[] } };
    expect(moved.threads[0].messages[0].text).not.toContain(NUMBER);
    expect(moved.threads[0].messages[0].text).toContain("••••9012");
    expect(await db.caseEvent.count({ where: { caseId: c.id, eventType: "keeper_ui" } })).toBe(0);
    expect((await db.legacyCase.findUniqueOrThrow({ where: { id: c.id } })).keeperUi).toContain("••••9012");
  });
});

describe("saved state belongs to the case owner", () => {
  it("is a 404 for another session and a 401 without one", async () => {
    const c = await makeCase();
    await putUi(req(owner, ui()), params(c.id));
    expect((await getUi(req(stranger), params(c.id))).status).toBe(404);
    expect((await putUi(req(stranger, ui()), params(c.id))).status).toBe(404);
    expect((await getUi(req(""), params(c.id))).status).toBe(401);
  });

  it("rejects malformed state", async () => {
    const c = await makeCase();
    expect((await putUi(req(owner, { facts: {}, threads: [] }), params(c.id))).status).toBe(400);
  });
});
