import { afterEach, describe, expect, it } from "vitest";
import { freshState, reduce } from "@/keeper/engine";
import { nextWork } from "@/keeper/presentation";
import { db } from "@server/db";
import { POST as demo } from "@api/demo/route";
import { POST as ask } from "@api/ai/ask/route";
import { FixtureProvider, setProvider } from "@server/ai";

const sid = "keeper-refinement-consent-session";
const post = (url: string, body: unknown) => new Request("http://localhost" + url, { method: "POST", headers: { "x-session-id": sid, "content-type": "application/json" }, body: JSON.stringify(body) });
afterEach(() => setProvider(undefined));

describe("Keeper refinement", () => {
  it("asks one question, keeps volunteered details and does not mark preparation as reviewed", () => {
    let state = reduce(freshState("Asha", "signin"), { t: "send", text: "I want to prepare for my family. My documents are in the blue folder at home." });
    const c = state.cases[state.activeCase];
    const messages = c.threads[0].messages;
    expect(c.facts.docs_where.value).toContain("blue folder");
    const reply = messages.at(-1)!;
    expect(reply.pending).toBe("known");
    expect((reply.text.match(/\?/g) || []).length).toBe(1);
    expect(reply.text).not.toContain("\u2014");
    state = reduce(state, { t: "choose", id: "m:unknown", label: "I don’t know" });
    expect(state.cases[state.activeCase].facts.known.state).toBe("unknown");
    expect(state.cases[state.activeCase].family.reviewedAt).toBeNull();
  });

  it("does not expose example-loading choices in a personal welcome", () => {
    const state = freshState("You", "signin");
    expect(state.cases.self.assets).toEqual([]);
    expect(state.cases.self.docs).toEqual([]);
    expect(state.cases.self.threads[0].messages[0].choices?.some(ch => ch.id === "m:sample")).toBe(false);
  });

  it("a blocked guided search remains incomplete", () => {
    const state = freshState("Asha", "sample");
    state.cases.self.plan = [{ id: "official", label: "Official source", type: "guided", state: "ready", note: "Use the official site" }];
    const next = reduce(state, { t: "plan.record", id: "official", result: "You couldn’t complete this search. It needed details you do not have." });
    expect(next.cases.self.plan[0].state).toBe("needs_info");
    expect(nextWork(next.cases.self)).toBeNull();
  });

  it("does not call generation or embeddings without AI permission, and respects revocation", async () => {
    const { caseId } = await (await demo(post("/api/demo", { scenario: "demo-a" }))).json();
    let embeddings = 0;
    const provider = new FixtureProvider(() => "Review the source [1].", texts => { embeddings++; return texts.map(() => [1, 0]); });
    setProvider(provider);
    let response = await ask(post("/api/ai/ask", { caseId, question: "Which documents are needed?" }));
    expect((await response.json()).mode).toBe("passages");
    expect(provider.calls).toHaveLength(0);
    expect(embeddings).toBe(0);
    await db.consentRecord.create({ data: { sessionId: sid, purpose: "ai_processing", status: "granted", createdAt: new Date("2026-10-18T01:00:00Z") } });
    response = await ask(post("/api/ai/ask", { caseId, question: "Which documents are needed?" }));
    expect((await response.json()).mode).toBe("ai");
    expect(provider.calls).toHaveLength(1);
    await db.consentRecord.create({ data: { sessionId: sid, purpose: "ai_processing", status: "revoked", createdAt: new Date("2026-10-18T02:00:00Z") } });
    response = await ask(post("/api/ai/ask", { caseId, question: "Which documents are needed?" }));
    expect((await response.json()).mode).toBe("passages");
    expect(provider.calls).toHaveLength(1);
  });
});
