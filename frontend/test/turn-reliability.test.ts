import { afterEach, describe, expect, it, vi } from "vitest";
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
});
