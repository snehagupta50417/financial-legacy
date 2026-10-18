// A live call turn must not wait on a model that is out of quota or that rejects a setting.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GeminiProvider } from "@server/ai/gemini";

type Call = { model: string; config: Record<string, unknown> };
let calls: Call[] = [];
let behaviour: (c: Call) => string | Error = () => "ok";

function provider(models = ["main-model", "backup-model"]) {
  const p = new GeminiProvider({ apiKey: "test-key-not-real", models });
  (p as unknown as { client: unknown }).client = {
    models: { generateContent: async (args: { model: string; config: Record<string, unknown> }) => {
      const c = { model: args.model, config: args.config };
      calls.push(c);
      const out = behaviour(c);
      if (out instanceof Error) throw out;
      return { text: out };
    } },
  };
  return p;
}
const ask = (p: GeminiProvider, fast = false) => p.generate({ system: "s", messages: [{ role: "user", content: "hi" }], json: true, fast }, new AbortController().signal);
const quota = () => new Error('{"error":{"code":429,"message":"You exceeded your current quota","status":"RESOURCE_EXHAUSTED"}}');
const badArg = () => new Error('{"error":{"code":400,"message":"Request contains an invalid argument.","status":"INVALID_ARGUMENT"}}');

beforeEach(() => { calls = []; behaviour = () => "ok"; delete process.env.GEMINI_AGENT_MODEL; });
afterEach(() => { delete process.env.GEMINI_AGENT_MODEL; });

describe("Gemini model chain for live turns", () => {
  it("uses the light model first for a fast turn, and the normal one first otherwise", async () => {
    const p = provider();
    await ask(p, true);
    expect(calls[0].model).toBe("gemini-flash-lite-latest");
    calls = [];
    await ask(p, false);
    expect(calls[0].model).toBe("main-model");
    process.env.GEMINI_AGENT_MODEL = "my-fast-model";
    calls = [];
    await ask(p, true);
    expect(calls[0].model).toBe("my-fast-model");
  });

  it("asks for no extended thinking and a short reply on a fast turn, and not otherwise", async () => {
    const p = provider();
    await ask(p, true);
    expect(calls[0].config).toMatchObject({ maxOutputTokens: 700, thinkingConfig: { thinkingBudget: 0 } });
    calls = [];
    await ask(p, false);
    expect(calls[0].config).not.toHaveProperty("thinkingConfig");
    expect(calls[0].config).not.toHaveProperty("maxOutputTokens");
  });

  it("when a model rejects the thinking setting (a bare 400), retries it plain and never sends it again", async () => {
    behaviour = (c) => (c.config.thinkingConfig ? badArg() : "plain ok");
    const p = provider();
    expect(await ask(p, true)).toBe("plain ok");
    expect(calls.map((c) => !!c.config.thinkingConfig)).toEqual([true, false]);
    calls = [];
    expect(await ask(p, true)).toBe("plain ok");
    expect(calls.map((c) => !!c.config.thinkingConfig)).toEqual([false]); // remembered
  });

  it("when a model is out of quota, moves on at once and skips it on the next turn", async () => {
    behaviour = (c) => (c.model === "gemini-flash-lite-latest" ? quota() : "from backup");
    const p = provider();
    expect(await ask(p, true)).toBe("from backup");
    expect(calls.map((c) => c.model)).toEqual(["gemini-flash-lite-latest", "main-model"]); // no retry, no waiting
    calls = [];
    expect(await ask(p, true)).toBe("from backup");
    expect(calls.map((c) => c.model)).toEqual(["main-model"]); // the exhausted model is not tried again
  });

  it("still tries everything if every model is cooling down, rather than refusing", async () => {
    behaviour = () => quota();
    const p = provider(["only-model"]);
    await expect(ask(p, false)).rejects.toThrow();
    calls = [];
    await expect(ask(p, false)).rejects.toThrow();
    expect(calls.length).toBeGreaterThan(0);
  });

  it("does not hide a real error: a bad request that is not about thinking still fails", async () => {
    behaviour = () => new Error('{"error":{"code":403,"message":"API key not valid","status":"PERMISSION_DENIED"}}');
    await expect(ask(provider(), false)).rejects.toThrow(/API key/);
  });
});
