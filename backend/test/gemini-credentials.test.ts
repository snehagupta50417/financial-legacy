import { afterEach, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => [] as string[]);
vi.mock("@google/genai", () => ({ GoogleGenAI: class {
  models;
  constructor({ apiKey }: { apiKey: string }) {
    const request = async () => { calls.push(apiKey); if (apiKey === "synthetic-primary") throw Object.assign(new Error("RESOURCE_EXHAUSTED"), { status: 429 }); return { text: "Synthetic reply", candidates: [{ content: { parts: [{ inlineData: { data: Buffer.alloc(100).toString("base64") } }] } }], embeddings: [{ values: [1, 0] }] }; };
    this.models = { generateContent: request, embedContent: request };
  }
} }));
import { GeminiProvider } from "@server/ai/gemini";
afterEach(() => { calls.length = 0; });
it("uses a secondary key for conversation, speech and embeddings without replacing primary", async () => {
  const p = new GeminiProvider({ apiKey: "synthetic-primary", fallbackApiKeys: ["synthetic-backup"], models: ["synthetic-model"] });
  const signal = new AbortController().signal;
  expect(await p.generate({ system: "Synthetic", messages: [{ role: "user", content: "Hello" }] }, signal)).toBe("Synthetic reply");
  expect((await p.speak("Synthetic", signal)).subarray(0, 4).toString()).toBe("RIFF");
  expect(await p.embed(["Synthetic"], "query", signal)).toEqual([[1, 0]]);
  expect(calls).toEqual(["synthetic-primary", "synthetic-backup", "synthetic-primary", "synthetic-backup", "synthetic-primary", "synthetic-backup"]);
});
