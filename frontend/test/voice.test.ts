// Keeper's voice must never leave a call silent: Gemini's voice when it works, the browser's when it doesn't.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetKeeperVoice, speakKeeper, stopSpeaking } from "@/keeper/voice";

let spoken: string[] = [];
let fetched = 0;

beforeEach(() => {
  spoken = []; fetched = 0;
  class Utterance { text: string; lang = ""; onend: (() => void) | null = null; onerror: (() => void) | null = null; onstart: (() => void) | null = null; constructor(t: string) { this.text = t; } }
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  vi.stubGlobal("window", { localStorage: { getItem: () => "test-session-key", setItem: () => {} }, speechSynthesis: { cancel: () => {}, getVoices: () => [], speak: (u: Utterance) => { spoken.push(u.text); u.onstart?.(); u.onend?.(); } } });
  resetKeeperVoice();
});
afterEach(() => { vi.unstubAllGlobals(); stopSpeaking(); });

describe("speakKeeper", () => {
  it("uses the browser's voice when Gemini's voice is not asked for, and ends once", () => {
    const onEnd = vi.fn();
    speakKeeper("Hello there.", onEnd, { gemini: false });
    expect(spoken).toEqual(["Hello there."]);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("falls back to the browser's voice when Gemini's voice is unavailable, and stops asking for the rest of the call", async () => {
    vi.stubGlobal("fetch", async () => { fetched++; return new Response(JSON.stringify({ code: "ai_unavailable" }), { status: 503 }); });
    const first = vi.fn();
    speakKeeper("First line.", first, { gemini: true });
    await vi.waitFor(() => expect(first).toHaveBeenCalledTimes(1));
    expect(spoken).toEqual(["First line."]);
    expect(fetched).toBe(1);

    const second = vi.fn();
    speakKeeper("Second line.", second, { gemini: true });
    expect(spoken).toEqual(["First line.", "Second line."]); // straight to the browser voice, no new request
    expect(fetched).toBe(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("asks again at the start of a new call", async () => {
    vi.stubGlobal("fetch", async () => { fetched++; return new Response("", { status: 503 }); });
    const a = vi.fn();
    speakKeeper("One.", a, { gemini: true });
    await vi.waitFor(() => expect(a).toHaveBeenCalled());
    resetKeeperVoice();
    const b = vi.fn();
    speakKeeper("Two.", b, { gemini: true });
    await vi.waitFor(() => expect(b).toHaveBeenCalled());
    expect(fetched).toBe(2);
  });

  it("falls back when the request itself fails", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("offline"); });
    const onEnd = vi.fn();
    speakKeeper("Still here.", onEnd, { gemini: true });
    await vi.waitFor(() => expect(onEnd).toHaveBeenCalledTimes(1));
    expect(spoken).toEqual(["Still here."]);
  });
});
