// The voice call: Keeper's voice, and bringing in a person when Keeper can't follow.
// PRD FL-01, FL-02, FL-18, FL-46; AGENTS.md rule 6 (say plainly what is simulated).
import { afterEach, describe, expect, it } from "vitest";
import { POST as speak } from "@api/ai/speak/route";
import { POST as agent } from "@api/ai/agent/route";
import { GET as listHandoffs, POST as requestHuman } from "@api/cases/[id]/handoff/route";
import { FixtureProvider, setProvider } from "@server/ai";
import { pcmToWav } from "@server/ai/gemini";
import { AGENT_SYSTEM, agentContext, readModelTurn } from "@server/ai/agent";
import { db } from "@server/db";

const NUMBER = "123456789012";
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (sid: string, body?: unknown, method = body ? "POST" : "GET") => new Request("http://localhost/api/x", { method, headers: { "x-session-id": sid, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

async function makeCase(opts: { consent?: boolean } = {}) {
  const sid = "call-session-" + Math.random().toString(36).slice(2);
  await db.session.upsert({ where: { id: sid }, create: { id: sid }, update: {} });
  if (opts.consent !== false) await db.consentRecord.create({ data: { sessionId: sid, purpose: "ai_processing", status: "granted" } });
  const c = await db.legacyCase.create({ data: { sessionId: sid, caseType: "family_death", summary: "Synthetic case", gateReached: "G3" } });
  return { sid, caseId: c.id };
}
afterEach(() => setProvider(undefined));

describe("Keeper's voice", () => {
  it("wraps raw audio as a playable WAV", () => {
    const wav = pcmToWav(Buffer.alloc(480), 24000);
    expect(wav.subarray(0, 4).toString()).toBe("RIFF");
    expect(wav.subarray(8, 12).toString()).toBe("WAVE");
    expect(wav.readUInt32LE(24)).toBe(24000); // sample rate
    expect(wav.readUInt32LE(40)).toBe(480); // data length
    expect(wav.length).toBe(44 + 480);
  });

  it("returns audio when a voice is configured and the person has opted in", async () => {
    const { sid } = await makeCase();
    const provider = Object.assign(new FixtureProvider(() => "{}"), { speak: async () => pcmToWav(Buffer.alloc(96), 24000) });
    setProvider(provider);
    const res = await speak(req(sid, { text: "Hello, I'm Keeper." }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/wav");
    expect(Buffer.from(await res.arrayBuffer()).subarray(0, 4).toString()).toBe("RIFF");
  });

  it("needs the AI opt-in, and says when there is no voice, so the browser can fall back", async () => {
    const off = await makeCase({ consent: false });
    setProvider(Object.assign(new FixtureProvider(() => "{}"), { speak: async () => Buffer.alloc(4) }));
    const denied = await speak(req(off.sid, { text: "Hi" }));
    expect(denied.status).toBe(403);
    expect(((await denied.json()) as { code: string }).code).toBe("ai_consent_required");

    const on = await makeCase();
    setProvider(new FixtureProvider(() => "{}")); // no speak()
    expect(((await (await speak(req(on.sid, { text: "Hi" }))).json()) as { code: string }).code).toBe("ai_unavailable");
    setProvider(Object.assign(new FixtureProvider(() => "{}"), { speak: async () => { throw new Error("quota"); } }));
    expect((await speak(req(on.sid, { text: "Hi" }))).status).toBe(503);
  });

  it("redacts identifiers before the text leaves for the voice model", async () => {
    const { sid } = await makeCase();
    let seen = "";
    setProvider(Object.assign(new FixtureProvider(() => "{}"), { speak: async (t: string) => { seen = t; return Buffer.alloc(4); } }));
    await speak(req(sid, { text: `Your account ${NUMBER} is noted.` }));
    expect(seen).not.toContain(NUMBER);
  });

  it("validates input", async () => {
    const { sid } = await makeCase();
    setProvider(Object.assign(new FixtureProvider(() => "{}"), { speak: async () => Buffer.alloc(4) }));
    expect((await speak(req(sid, { text: "   " }))).status).toBe(400);
    expect((await speak(req(sid, { text: "x".repeat(601) }))).status).toBe(400);
  });
});

describe("Keeper sounds like a person on a call", () => {
  it("is told to react first, keep turns short, ask one thing at a time and not greet twice", () => {
    expect(AGENT_SYSTEM).toMatch(/phone call/);
    expect(AGENT_SYSTEM).toMatch(/reacting to what they just said/);
    expect(AGENT_SYSTEM).toMatch(/under 35 words/);
    expect(AGENT_SYSTEM).toMatch(/exactly ONE question/);
    expect(AGENT_SYSTEM).toMatch(/Do not greet them again/);
    expect(AGENT_SYSTEM).not.toMatch(/under 45 words/);
  });
});

describe("Keeper offers a person", () => {
  it("passes the planner's hand-off signal through, and defaults to no", () => {
    const ctx = agentContext({ caseType: "family_death", unlocked: true, assets: [], tasks: [], claims: [], ui: null });
    expect(readModelTurn({ say: "I'm not sure I followed. Shall I bring in a person?", actions: [], handoff: true }, ctx)?.handoff).toBe(true);
    expect(readModelTurn({ say: "Got it.", actions: [] }, ctx)?.handoff).toBe(false);
  });

  it("returns the hand-off signal from the agent route", async () => {
    const { sid, caseId } = await makeCase();
    setProvider(new FixtureProvider(() => JSON.stringify({ say: "I'd like to bring in a person for this.", actions: [], handoff: true })));
    const body = (await (await agent(req(sid, { caseId, utterance: "this is a dispute with the bank about a will" }))).json()) as { handoff: boolean };
    expect(body.handoff).toBe(true);
  });

  it("saves a request with a redacted transcript, once, and logs it on the case", async () => {
    const { sid, caseId } = await makeCase();
    const res = await requestHuman(req(sid, { why: "keeper_unsure", note: `Please call about ${NUMBER}`, transcript: [{ role: "user", text: `my account ${NUMBER}` }, { role: "keeper", text: "Which bank?" }] }), params(caseId));
    expect(res.status).toBe(201);
    const { handoff } = (await res.json()) as { handoff: { id: string; status: string } };
    expect(handoff.status).toBe("requested");
    const row = await db.handoffRequest.findUniqueOrThrow({ where: { id: handoff.id } });
    expect(row.note + row.transcript).not.toContain(NUMBER);
    expect(JSON.parse(row.transcript)).toHaveLength(2);
    expect(await db.caseEvent.count({ where: { caseId, eventType: "handoff" } })).toBe(1);

    const again = (await (await requestHuman(req(sid, { why: "person_asked" }), params(caseId))).json()) as { already?: boolean; handoff: { id: string } };
    expect(again.already).toBe(true);
    expect(again.handoff.id).toBe(handoff.id);
    expect(await db.handoffRequest.count({ where: { caseId } })).toBe(1);
    const listed = (await (await listHandoffs(req(sid), params(caseId))).json()) as { handoffs: unknown[] };
    expect(listed.handoffs).toHaveLength(1);
  });

  it("is owner only, and rejects a bad request", async () => {
    const { sid, caseId } = await makeCase();
    expect((await requestHuman(req("someone-else-session", { why: "person_asked" }), params(caseId))).status).toBe(404);
    expect((await requestHuman(req("", { why: "person_asked" }), params(caseId))).status).toBe(401);
    expect((await requestHuman(req(sid, { why: "because" }), params(caseId))).status).toBe(400);
    expect((await listHandoffs(req("someone-else-session"), params(caseId))).status).toBe(404);
  });
});
