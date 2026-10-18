// Speech in the person's own language (Sarvam). The key stays on the server, audio is not kept, digits in any
// Indian script are redacted before anything reaches a model. PRD FL-01, FL-02, FL-18, FL-46.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as stt } from "@api/stt/route";
import { GET as availability, POST as agent } from "@api/ai/agent/route";
import { FixtureProvider, setProvider } from "@server/ai";
import { languageNote, scriptNote } from "@server/ai/agent";
import { redactIdentifiers, toAsciiDigits } from "@server/core/masking";
import { db } from "@server/db";
import { languageName, SarvamError, transcribe } from "@server/speech/sarvam";

const KEY = "test-sarvam-key-not-real";
let calls: { url: string; headers: Record<string, string>; form: FormData }[] = [];
const sarvamReply = (status: number, body: unknown) => vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
  calls.push({ url, headers: init.headers as Record<string, string>, form: init.body as FormData });
  return new Response(JSON.stringify(body), { status });
});

beforeEach(() => { calls = []; process.env.SARVAM_API_KEY = KEY; });
afterEach(() => { vi.unstubAllGlobals(); delete process.env.SARVAM_API_KEY; setProvider(undefined); });

async function makeSession(consent = true) {
  const sid = "stt-session-" + Math.random().toString(36).slice(2);
  await db.session.upsert({ where: { id: sid }, create: { id: sid }, update: {} });
  if (consent) await db.consentRecord.create({ data: { sessionId: sid, purpose: "ai_processing", status: "granted" } });
  return sid;
}
const audioReq = (sid: string, opts: { size?: number; type?: string; omit?: boolean; language?: string } = {}) => {
  const form = new FormData();
  if (!opts.omit) form.set("audio", new Blob([new Uint8Array(opts.size ?? 2048)], { type: opts.type ?? "audio/webm" }), "speech.webm");
  if (opts.language) form.set("language", opts.language);
  return new Request("http://localhost/api/stt", { method: "POST", headers: { "x-session-id": sid }, body: form });
};

describe("FL-01 reply script", () => {
  it("uses the latest native script even after Romanised conversation", () => {
    for (const [text, script] of [["தமிழில் பேசுங்கள்", "Tamil"], ["বাংলায় বলুন", "Bengali"], ["हिंदी में बोलिए", "Devanagari"], ["اردو", "Arabic"]]) {
      expect(scriptNote(text)).toContain(script);
      expect(scriptNote(text)).toContain("not Latin transliteration");
    }
    expect(scriptNote("haan aaram se baat karo")).toBe("");
  });
});

describe("digits in Indian scripts", () => {
  it("become ASCII digits so redaction can see them", () => {
    expect(toAsciiDigits("खाता १२३४५६७८९०१२ और ௧௨௩௪")).toBe("खाता 123456789012 और 1234");
    expect(toAsciiDigits("plain 42 stays")).toBe("plain 42 stays");
  });
  it("keep only the last four of a number spoken in Hindi, Tamil or Telugu digits", () => {
    for (const n of ["१२३४५६७८९०१२", "௧௨௩௪௫௬௭௮௯௦௧௨", "౧౨౩౪౫౬౭౮౯౦౧౨"]) {
      const out = redactIdentifiers(`मेरा खाता ${n} है`);
      expect(out).toContain("••••9012".replace("9012", "9012"));
      expect(out).not.toMatch(/\d{5,}/);
    }
  });
});

describe("transcribe", () => {
  it("sends the audio to Sarvam with the key in a header, and returns the transcript and detected language", async () => {
    sarvamReply(200, { transcript: " मेरे पिता का देहांत हो गया ", language_code: "hi-IN" });
    const out = await transcribe(new Uint8Array(100), "audio/webm;codecs=opus", new AbortController().signal);
    expect(out).toEqual({ transcript: "मेरे पिता का देहांत हो गया", language: "hi-IN" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.sarvam.ai/speech-to-text");
    expect(calls[0].headers["api-subscription-key"]).toBe(KEY);
    expect(calls[0].form.get("language_code")).toBe("unknown"); // let the model detect it
    expect(calls[0].form.get("model")).toBe("saaras:v3");
    expect((calls[0].form.get("file") as File).name).toBe("speech.webm");
  });

  it("ignores a language it doesn't know, and names the ones it does", async () => {
    sarvamReply(200, { transcript: "hello", language_code: "xx-YY" });
    expect((await transcribe(new Uint8Array(10), "audio/wav", new AbortController().signal)).language).toBeNull();
    expect(languageName("ta-IN")).toBe("Tamil");
    expect(languageName("nope")).toBeNull();
  });

  it("FL-01 preserves all 23 supported language codes and mixed-language transcription", async () => {
    const { SPEECH_LANGUAGES } = await import("@shared/languages");
    expect(Object.keys(SPEECH_LANGUAGES)).toHaveLength(23);
    for (const code of Object.keys(SPEECH_LANGUAGES)) {
      sarvamReply(200, { transcript: "Synthetic transcript", language_code: code });
      expect((await transcribe(new Uint8Array(10), "audio/wav", new AbortController().signal)).language).toBe(code);
      expect(calls.at(-1)?.form.get("mode")).toBe("codemix");
    }
  });

  it("maps failures to reasons the app can act on", async () => {
    const fail = async (status: number) => { sarvamReply(status, {}); return transcribe(new Uint8Array(1), "audio/webm", new AbortController().signal).catch((e: SarvamError) => e.reason); };
    expect(await fail(403)).toBe("rejected");
    expect(await fail(429)).toBe("quota");
    expect(await fail(500)).toBe("failed");
    vi.stubGlobal("fetch", async () => { throw new Error("offline"); });
    expect(await transcribe(new Uint8Array(1), "audio/webm", new AbortController().signal).catch((e: SarvamError) => e.reason)).toBe("failed");
    delete process.env.SARVAM_API_KEY;
    expect(await transcribe(new Uint8Array(1), "audio/webm", new AbortController().signal).catch((e: SarvamError) => e.reason)).toBe("not_configured");
  });
});

describe("POST /api/stt", () => {
  it("returns the transcript and language for a recording", async () => {
    sarvamReply(200, { transcript: "என் தந்தை இறந்துவிட்டார்", language_code: "ta-IN" });
    const res = await stt(audioReq(await makeSession()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ transcript: "என் தந்தை இறந்துவிட்டார்", language: "ta-IN" });
  });

  it("needs the AI opt-in, because the audio leaves for another service", async () => {
    sarvamReply(200, { transcript: "x" });
    const res = await stt(audioReq(await makeSession(false)));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe("ai_consent_required");
    expect(calls).toHaveLength(0);
  });

  it("says plainly when the key is not set, so the browser's recogniser takes over", async () => {
    delete process.env.SARVAM_API_KEY;
    const res = await stt(audioReq(await makeSession()));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { code: string }).code).toBe("stt_unavailable");
  });

  it("rejects an empty, oversized or non-audio upload without calling Sarvam", async () => {
    sarvamReply(200, { transcript: "x" });
    const sid = await makeSession();
    expect((await stt(audioReq(sid, { omit: true }))).status).toBe(400);
    expect((await stt(audioReq(sid, { size: 9 * 1024 * 1024 }))).status).toBe(413);
    expect((await stt(audioReq(sid, { type: "text/plain" }))).status).toBe(415);
    expect(calls).toHaveLength(0);
  });

  it("reports quota and outages without leaking details", async () => {
    sarvamReply(429, {});
    const quota = await stt(audioReq(await makeSession()));
    expect(quota.status).toBe(429);
    expect(((await quota.json()) as { code: string }).code).toBe("stt_quota");
    sarvamReply(403, { detail: "bad key sk_secret" });
    const rejected = await stt(audioReq(await makeSession()));
    expect(rejected.status).toBe(503);
    expect(JSON.stringify(await rejected.json())).not.toMatch(/sk_secret|test-sarvam-key/);
  });

  it("only passes a well-formed language hint on", async () => {
    sarvamReply(200, { transcript: "ok", language_code: "hi-IN" });
    const sid = await makeSession();
    await stt(audioReq(sid, { language: "hi-IN" }));
    await stt(audioReq(sid, { language: "../../etc" }));
    expect(calls[0].form.get("language_code")).toBe("hi-IN");
    expect(calls[1].form.get("language_code")).toBe("unknown");
  });
});

describe("the call knows which speech recogniser to use, and the language to answer in", () => {
  const get = (sid: string) => new Request("http://localhost/api/ai/agent", { headers: { "x-session-id": sid } });

  it("offers Sarvam only when its key is set and the person has opted in", async () => {
    setProvider(new FixtureProvider(() => "{}"));
    expect(await (await availability(get(await makeSession()))).json()).toEqual({ available: true, stt: "sarvam" });
    expect(((await (await availability(get(await makeSession(false)))).json()) as { stt: string }).stt).toBe("browser");
    delete process.env.SARVAM_API_KEY;
    expect(((await (await availability(get(await makeSession()))).json()) as { stt: string }).stt).toBe("browser");
  });

  it("tells the planner to reply in the language the person spoke", async () => {
    const sid = await makeSession();
    const c = await db.legacyCase.create({ data: { sessionId: sid, caseType: "family_death", summary: "Synthetic", gateReached: "G3" } });
    const provider = new FixtureProvider(() => JSON.stringify({ say: "ठीक है।", actions: [] }));
    setProvider(provider);
    const call = (language?: string) => agent(new Request("http://localhost/api/ai/agent", { method: "POST", headers: { "x-session-id": sid, "content-type": "application/json" }, body: JSON.stringify({ caseId: c.id, utterance: "नमस्ते", ...(language ? { language } : {}) }) }));
    expect((await call("hi-IN")).status).toBe(200);
    expect(provider.calls[0].system).toContain("The person is speaking Hindi");
    await call("en-IN");
    expect(provider.calls[1].system).not.toContain("The person is speaking");
    expect((await call("not a code")).status).toBe(400);
    expect(languageNote("English")).toBe("");
    expect(languageNote(null)).toBe("");
  });
});


describe("same-recording Gemini speech backup", () => {
  afterEach(() => { delete process.env.GEMINI_API_KEY; });
  it("retries failed Sarvam audio through Gemini without requiring repetition", async () => {
    process.env.GEMINI_API_KEY = "synthetic-gemini-key";
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      urls.push(url);
      if (url.includes("sarvam")) return new Response("", { status: 429 });
      const body = JSON.parse(init.body as string);
      expect(body.contents[0].parts[0].inlineData.data).toBeTruthy();
      expect(body.contents[0].parts[0].inlineData.mimeType).toBe("audio/webm");
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ transcript: "नमस्ते", language: "hi-IN" }) }] } }] });
    });
    const response = await stt(audioReq(await makeSession()));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ transcript: "नमस्ते", language: "hi-IN" });
    expect(urls).toHaveLength(2);
  });
  it("does not send audio to either provider without AI consent", async () => {
    process.env.GEMINI_API_KEY = "synthetic-gemini-key";
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await stt(audioReq(await makeSession(false)))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps malformed backup responses and provider secrets out of client errors", async () => {
    process.env.GEMINI_API_KEY = "synthetic-gemini-key";
    vi.stubGlobal("fetch", async (url: string) => url.includes("sarvam") ? new Response("private-provider-error", { status: 403 }) : Response.json({ candidates: [{ content: { parts: [{ text: "invalid-json" }] } }] }));
    const response = await stt(audioReq(await makeSession()));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toMatch(/private-provider|synthetic-gemini|invalid-json/);
  });
});
