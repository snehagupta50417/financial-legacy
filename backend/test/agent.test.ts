// Keeper's voice agent: the model proposes, code vets. Consent, gates, ids, redaction and honesty are enforced
// here, not by the prompt. PRD FL-01, FL-02, FL-18, FL-46; AGENTS.md rules 4 and 6.
import { afterEach, describe, expect, it } from "vitest";
import { GET as availability, POST as agent } from "@api/ai/agent/route";
import { FixtureProvider, setProvider } from "@server/ai";
import { agentContext, readModelTurn, vetActions } from "@server/ai/agent";
import { db } from "@server/db";

const owner = "agent-owner-session";
const NUMBER = "123456789012";

function post(sid: string, body: unknown) {
  return new Request("http://localhost/api/ai/agent", { method: "POST", headers: { "x-session-id": sid, "content-type": "application/json" }, body: JSON.stringify(body) });
}
async function makeCase(opts: { gate?: string; consent?: boolean; sid?: string } = {}) {
  const sid = opts.sid ?? owner + Math.random().toString(36).slice(2);
  await db.session.upsert({ where: { id: sid }, create: { id: sid }, update: {} });
  if (opts.consent !== false) await db.consentRecord.create({ data: { sessionId: sid, purpose: "ai_processing", status: "granted" } });
  const c = await db.legacyCase.create({ data: { sessionId: sid, caseType: "living_individual", summary: "Synthetic case", gateReached: opts.gate ?? "G1" } });
  const asset = await db.assetRecord.create({ data: { caseId: c.id, institution: "HDFC Bank", category: "bank_deposit", discoveryStatus: "suggested" } });
  return { sid, caseId: c.id, assetId: asset.id };
}
const reply = (turn: unknown) => new FixtureProvider(() => JSON.stringify(turn));
afterEach(() => setProvider(undefined));

const ctx = (over: Partial<Parameters<typeof agentContext>[0]> = {}) =>
  agentContext({ caseType: "living_individual", unlocked: true, assets: [{ id: "a1", institution: "HDFC Bank", category: "bank", evidence: "self_declared", status: "suggested" }], tasks: [{ id: "t1", title: "Add a statement", status: "ready" }, { id: "t2", title: "Old step", status: "completed" }], claims: [], ui: null, ...over });

describe("vetting what the model proposes", () => {
  it("drops unknown action types and malformed arguments", () => {
    const { actions } = vetActions([{ type: "delete_everything" }, { type: "remember", key: "Bad Key!", value: "x" }, { type: "open", card: "secrets" }, { type: "open", card: "family" }, "nonsense", null], ctx());
    expect(actions.map((a) => a.type)).toEqual(["open"]);
  });

  it("only lets ids that exist in this case through, and only open steps", () => {
    const { actions } = vetActions([{ type: "confirm_asset", assetId: "a1" }, { type: "confirm_asset", assetId: "someone-elses" }, { type: "start_claim", assetId: "nope" }, { type: "complete_task", taskId: "t1" }, { type: "complete_task", taskId: "t2" }, { type: "complete_task", taskId: "ghost" }], ctx());
    expect(actions.map((a) => (a as { assetId?: string; taskId?: string }).assetId ?? (a as { taskId?: string }).taskId)).toEqual(["a1", "t1"]);
  });

  it("marks every record-changing action as needing a yes; reading and remembering do not", () => {
    const { actions } = vetActions([{ type: "remember", key: "relation", value: "my father" }, { type: "look_up", question: "What does a bank need for a claim?" }, { type: "add_asset", institution: "ICICI Bank", category: "bank" }, { type: "complete_task", taskId: "t1" }], ctx());
    expect(Object.fromEntries(actions.map((a) => [a.type, a.confirm]))).toEqual({ remember: false, look_up: false, add_asset: true, complete_task: true });
  });

  it("will not add, confirm or claim while identity checks are incomplete, and says so", () => {
    const locked = ctx({ unlocked: false, assets: [] });
    const turn = readModelTurn({ say: "I'll add ICICI Bank.", actions: [{ type: "add_asset", institution: "ICICI Bank", category: "bank" }, { type: "open", card: "know" }] }, locked)!;
    expect(turn.actions.map((a) => a.type)).toEqual(["open"]);
    expect(turn.say).toMatch(/until identity checks are complete/);
  });

  it("does not add a holding that is already recorded", () => {
    expect(vetActions([{ type: "add_asset", institution: "hdfc bank", category: "bank" }], ctx()).actions).toEqual([]);
  });

  it("redacts identifiers in what it would save, look up or add; keeps only the last four of a reference", () => {
    const { actions } = vetActions([{ type: "remember", key: "known", value: `account ${NUMBER} at HDFC` }, { type: "look_up", question: `Why was ${NUMBER} frozen?` }, { type: "add_asset", institution: "SBI", category: "bank", ref: NUMBER }], ctx());
    const text = JSON.stringify(actions);
    expect(text).not.toContain(NUMBER);
    expect(actions.find((a) => a.type === "add_asset")).toMatchObject({ ref: "9012" });
  });

  it("caps proposals at four", () => {
    expect(vetActions(Array.from({ length: 8 }, () => ({ type: "open", card: "know" })), ctx()).actions).toHaveLength(4);
  });

  it("never lets the agent claim it submitted, filed or approved a claim", () => {
    const t = readModelTurn({ say: "Good news, I've submitted your claim to the bank.", actions: [] }, ctx())!;
    expect(t.say).toMatch(/you approve and send it yourself/);
  });

  it("makes the reply fit for speech: no em dash, markdown or identifiers", () => {
    const t = readModelTurn({ say: `**Done** — your account ${NUMBER} is noted.`, actions: [] }, ctx())!;
    expect(t.say).not.toMatch(/[—*]/);
    expect(t.say).not.toContain(NUMBER);
  });

  it("rejects a reply with no spoken text", () => {
    expect(readModelTurn({ say: "", actions: [] }, ctx())).toBeNull();
    expect(readModelTurn({ actions: [] }, ctx())).toBeNull();
  });
});

describe("POST /api/ai/agent", () => {
  it("needs the person's AI opt-in before anything goes to the model", async () => {
    const { sid, caseId } = await makeCase({ consent: false });
    const provider = reply({ say: "hi", actions: [] });
    setProvider(provider);
    const res = await agent(post(sid, { caseId, utterance: "hello" }));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe("ai_consent_required");
    expect(provider.calls).toHaveLength(0);
  });

  it("falls back cleanly when no model is configured", async () => {
    const { sid, caseId } = await makeCase();
    setProvider(null);
    const res = await agent(post(sid, { caseId, utterance: "hello" }));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { code: string }).code).toBe("ai_unavailable");
  });

  it("is owner only", async () => {
    const { caseId } = await makeCase();
    setProvider(reply({ say: "hi", actions: [] }));
    const res = await agent(post("someone-else", { caseId, utterance: "hello" }));
    expect([401, 403, 404]).toContain(res.status);
  });

  it("returns a vetted plan: real ids pass, invented ones and gated actions do not", async () => {
    const { sid, caseId, assetId } = await makeCase();
    setProvider(reply({ say: "I'll mark HDFC Bank as yours. Say yes.", actions: [{ type: "confirm_asset", assetId }, { type: "confirm_asset", assetId: "invented" }, { type: "wire_money", amount: 1 }], listen: true }));
    const res = await agent(post(sid, { caseId, utterance: "yes HDFC is mine" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { say: string; actions: { type: string; assetId: string; confirm: boolean; label: string }[]; listen: boolean };
    expect(body.actions).toHaveLength(1);
    expect(body.actions[0]).toMatchObject({ type: "confirm_asset", assetId, confirm: true });
    expect(body.actions[0].label).toContain("HDFC Bank");
    expect(body.listen).toBe(true);
  });

  it("closes the loop when the model finishes, and stops listening", async () => {
    const { sid, caseId } = await makeCase();
    setProvider(reply({ say: "We saved one detail. Next, add a statement.", actions: [], listen: true, finish: true }));
    const body = (await (await agent(post(sid, { caseId, utterance: "that's all" }))).json()) as { finish: boolean; listen: boolean };
    expect(body).toMatchObject({ finish: true, listen: false });
  });

  it("redacts identifiers before the model sees them, in the question and the history", async () => {
    const { sid, caseId } = await makeCase();
    const provider = reply({ say: "Please share only the last four digits.", actions: [] });
    setProvider(provider);
    await agent(post(sid, { caseId, utterance: `my account is ${NUMBER}`, history: [{ role: "user", text: `earlier ${NUMBER}` }, { role: "keeper", text: "ok" }] }));
    expect(JSON.stringify(provider.calls)).not.toContain(NUMBER);
    expect(provider.calls[0].json).toBe(true);
    expect(provider.calls[0].system).toMatch(/never claim you submitted|Never claim you submitted/i);
  });

  it("does not show the model holdings while the case is locked", async () => {
    const { sid, caseId } = await makeCase({ gate: "G0" });
    const provider = reply({ say: "Let's verify your identity first.", actions: [] });
    setProvider(provider);
    await agent(post(sid, { caseId, utterance: "what do I have?" }));
    const prompt = JSON.stringify(provider.calls[0].messages);
    expect(prompt).not.toContain("HDFC Bank");
    expect(prompt).toContain("Identity checks complete (holdings can be added): no");
  });

  it("reports a clear error, not fake output, when the model answers with something unusable", async () => {
    const { sid, caseId } = await makeCase();
    setProvider(new FixtureProvider(() => "I am not JSON"));
    const res = await agent(post(sid, { caseId, utterance: "hello" }));
    expect(res.status).toBe(502);
    expect(((await res.json()) as { code: string }).code).toBe("ai_unusable");
  });

  it("reports an outage as unavailable, leaving the case untouched", async () => {
    const { sid, caseId } = await makeCase();
    setProvider(new FixtureProvider(() => { throw new Error("overloaded"); }));
    const res = await agent(post(sid, { caseId, utterance: "hello" }));
    expect(res.status).toBe(503);
  });

  it("validates input", async () => {
    const { sid, caseId } = await makeCase();
    setProvider(reply({ say: "hi", actions: [] }));
    expect((await agent(post(sid, { caseId, utterance: "   " }))).status).toBe(400);
    expect((await agent(post(sid, { caseId, utterance: "x".repeat(801) }))).status).toBe(400);
  });
});

describe("GET /api/ai/agent (is the planner on?)", () => {
  const get = (sid: string) => new Request("http://localhost/api/ai/agent", { headers: { "x-session-id": sid } });
  it("says why it is off: no model, or no opt-in; on only when both exist", async () => {
    const off = await makeCase({ consent: false });
    setProvider(null);
    expect(await (await availability(get(off.sid))).json()).toEqual({ available: false, reason: "not_configured" });
    setProvider(reply({ say: "hi", actions: [] }));
    expect(await (await availability(get(off.sid))).json()).toEqual({ available: false, reason: "consent" });
    const on = await makeCase();
    expect(await (await availability(get(on.sid))).json()).toEqual({ available: true });
  });
  it("needs a session", async () => {
    expect((await availability(new Request("http://localhost/api/ai/agent"))).status).toBe(401);
  });
});
