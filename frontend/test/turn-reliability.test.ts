import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleState } from "@/keeper/sample";
import { nextWork } from "@/keeper/presentation";
import { freshState, reduce } from "@/keeper/engine";
import { captureScope, executionReply, matchesScope } from "@/keeper/turn-scope";

const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; };
afterEach(() => { vi.unstubAllGlobals(); vi.doUnmock("@/keeper/backend"); vi.resetModules(); });
describe("FL-01 / FL-02 case-bound execution", () => {
  it("rejects late responses after switching threads", () => {
    const state = freshState("Synthetic tester", "sample");
    const scope = captureScope(state);
    expect(matchesScope(state, scope)).toBe(true);
    const changed = reduce(state, { t: "newThread" });
    expect(matchesScope(changed, scope)).toBe(false);
    expect(matchesScope(null, scope)).toBe(false);
  });
  it("replaces a false success promise with actual partial results", () => {
    const result = executionReply("Everything is saved", ["Opened details"], ["Save record"]);
    expect(result).not.toContain("Everything is saved");
    expect(result).toContain("Completed: Opened details");
    expect(result).toContain("Failed: Save record");
  });
  it("rejects stale queued actions and preserves a thread selected during an in-flight save", async () => {
    const state = freshState("Synthetic tester", "signin");
    const c = state.cases[state.activeCase];
    c.threads.push({ ...structuredClone(c.threads[0]), id: "synthetic-second-thread" });
    const values = new Map([["keeper.demo.v1", JSON.stringify(state)]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
    const started = deferred(), release = deferred();
    const backendAction = vi.fn(async (current, action) => { started.resolve(); await release.promise; return reduce(current, action); });
    vi.doMock("@/keeper/backend", () => ({ backendAction }));
    const store = await import("@/keeper/store");
    const scope = captureScope(state)!;
    const first = store.dispatch({ t: "fact.edit", key: "clues", value: "Synthetic folder" }, scope);
    await started.promise;
    const queued = store.dispatch({ t: "fact.edit", key: "goal", value: "Must not run" }, scope);
    store.dispatch({ t: "switchThread", id: "synthetic-second-thread" });
    release.resolve();
    expect(await first).toBe(true);
    expect(await queued).toBe(false);
    const after = store.peekState()!;
    expect(after.cases[after.activeCase].activeThread).toBe("synthetic-second-thread");
    expect(after.cases[after.activeCase].facts.clues.value).toBe("Synthetic folder");
    expect(after.cases[after.activeCase].facts.goal?.value).not.toBe("Must not run");
    expect(backendAction).toHaveBeenCalledTimes(1);
  });
  it("keeps a failed save retryable and does not report it as persisted", async () => {
    const state = freshState("Synthetic tester", "signin");
    const values = new Map([["keeper.demo.v1", JSON.stringify(state)]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
    let fail = true;
    vi.doMock("@/keeper/backend", () => ({ backendAction: async (current, action) => { if (fail) throw new Error("Synthetic save failure"); return reduce(current, action); } }));
    const store = await import("@/keeper/store");
    const turn = { t: "agent.turn" as const, turnId: "synthetic-save-retry", user: "Synthetic question", reply: "Synthetic answer" };
    const scope = captureScope(state)!;
    expect(await store.dispatch(turn, scope)).toBe(false);
    expect(store.getBackendStatus().error).toBe("Synthetic save failure");
    fail = false;
    expect(await store.dispatch(turn, scope)).toBe(true);
    const c = store.peekState()!.cases[state.activeCase];
    expect(c.threads[0].messages.filter(m => m.id.startsWith("synthetic-save-retry:"))).toHaveLength(2);
  });

  it("keeps partial settlements and unresolved disputes in the next-step workflow", () => {
    const state = sampleState("Synthetic tester", "sunita"); const c = state.cases[state.activeCase];
    const claim = c.claims[0];
    expect(claim).toBeDefined();
    claim.outcome = { kind: "partially_settled", at: new Date().toISOString(), note: "Synthetic partial result" };
    expect(nextWork(c)?.text).toContain("remaining amount");
    claim.outcome.kind = "unresolved_dispute";
    expect(nextWork(c)?.text).toContain("unresolved dispute");
    expect(nextWork(c)?.card.id).toBe(claim.id);
  });

});
