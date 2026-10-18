// FL-01/02/20/41: server fallback keeps consent, redaction and cancellation boundaries.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as speak } from "@api/ai/speak/route";
import { setProvider } from "@server/ai";
import { pcmToWav } from "@server/ai/gemini";
import { db } from "@server/db";
import { fetchWithProviderKeys } from "@server/core/provider-keys";

const wav = pcmToWav(Buffer.alloc(100), 24000);
beforeEach(() => { vi.stubEnv("SARVAM_API_KEY", "synthetic-primary"); vi.stubEnv("SARVAM_FALLBACK_API_KEY", "synthetic-backup"); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); setProvider(undefined); });
async function request(consent = true, body: unknown = { text: "Synthetic reference 123456789012", language: "en-IN" }) {
  const sid = "synthetic-speech-" + crypto.randomUUID();
  await db.session.create({ data: { id: sid } });
  if (consent) await db.consentRecord.create({ data: { sessionId: sid, purpose: "ai_processing", status: "granted" } });
  return new Request("http://localhost/api/ai/speak", { method: "POST", headers: { "x-session-id": sid, "content-type": "application/json" }, body: JSON.stringify(body) });
}
const broken = () => setProvider({ name: "fixture", generate: async () => "", speak: async () => { throw new Error("Synthetic quota failure"); } });

describe("reply audio fallback", () => {
  it("returns redacted playable Sarvam WAV after primary voice failure", async () => {
    broken(); let sent = "";
    const fetcher = vi.fn(async (_url, init: RequestInit) => { sent = String(init.body); return Response.json({ audios: [wav.toString("base64")] }); });
    vi.stubGlobal("fetch", fetcher);
    const response = await speak(await request());
    expect(response.status).toBe(200); expect(response.headers.get("x-keeper-voice-provider")).toBe("sarvam");
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 4).toString()).toBe("RIFF");
    expect(sent).not.toContain("123456789012"); expect(sent).not.toContain("synthetic-primary");
  });
  it("never calls fallback without AI consent", async () => {
    broken(); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await speak(await request(false))).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("works with Sarvam when Gemini is not configured", async () => {
    setProvider(null); vi.stubGlobal("fetch", async () => Response.json({ audios: [wav.toString("base64")] }));
    expect((await speak(await request())).status).toBe(200);
  });
  it("keeps working primary audio without calling Sarvam", async () => {
    setProvider({ name: "fixture", generate: async () => "", speak: async () => wav });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await speak(await request())).headers.get("x-keeper-voice-provider")).toBe("gemini"); expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not pretend unsupported output language is English", async () => {
    broken(); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await speak(await request(true, { text: "Synthetic test", language: "ar-SA" }))).status).toBe(503); expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects invalid body before external calls", async () => {
    broken(); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await speak(await request(true, { text: "" }))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects non-audio provider output without leaking errors", async () => {
    broken(); vi.stubGlobal("fetch", async () => Response.json({ audios: [Buffer.from("not a WAV").toString("base64")] }));
    const response = await speak(await request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain("synthetic-primary");
  });
});

describe("secondary credential handling", () => {
  it("tries the supplied backup after quota failure", async () => {
    const used: string[] = [];
    const r = await fetchWithProviderKeys("SARVAM", new AbortController().signal, async key => { used.push(key); return new Response("{}", { status: used.length === 1 ? 429 : 200 }); });
    expect(r.status).toBe(200); expect(used).toEqual(["synthetic-primary", "synthetic-backup"]);
  });
  it("does not rotate credentials for ordinary invalid input", async () => {
    const send = vi.fn(async () => new Response("{}", { status: 422 }));
    expect((await fetchWithProviderKeys("SARVAM", new AbortController().signal, send)).status).toBe(422); expect(send).toHaveBeenCalledTimes(1);
  });
  it("does not send requests after cancellation", async () => {
    const ctrl = new AbortController(); ctrl.abort(); const send = vi.fn();
    await expect(fetchWithProviderKeys("SARVAM", ctrl.signal, send)).rejects.toThrow(); expect(send).not.toHaveBeenCalled();
  });
});
