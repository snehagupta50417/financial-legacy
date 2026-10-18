/**
 * Multilingual speech to text through Sarvam (Indian languages and Indian-accented English).
 * The key is read from SARVAM_API_KEY on the server only; the browser never sees it. Audio is sent to
 * Sarvam for the request and is not stored by Keeper. Free tier only: it runs on the credits already on
 * the account, with synthetic data, like the Gemini key (docs/FREE_TIER_PLAN.md).
 */

const ENDPOINT = "https://api.sarvam.ai/speech-to-text";

export const sarvamConfigured = () => !!process.env.SARVAM_API_KEY;

/** Languages Sarvam's speech model recognises, by BCP-47 code. */
export const LANGUAGES: Record<string, string> = {
  "en-IN": "English", "hi-IN": "Hindi", "bn-IN": "Bengali", "gu-IN": "Gujarati", "kn-IN": "Kannada", "ml-IN": "Malayalam",
  "mr-IN": "Marathi", "od-IN": "Odia", "pa-IN": "Punjabi", "ta-IN": "Tamil", "te-IN": "Telugu",
};
export const languageName = (code?: string | null): string | null => (code ? LANGUAGES[code] ?? null : null);

export type SarvamFailure = "not_configured" | "rejected" | "quota" | "failed";
export class SarvamError extends Error {
  constructor(readonly reason: SarvamFailure) { super(reason); }
}

const EXT: [RegExp, string][] = [[/webm/, "webm"], [/ogg|opus/, "ogg"], [/wav|wave/, "wav"], [/mp4|m4a|aac/, "m4a"], [/mpeg|mp3/, "mp3"], [/flac/, "flac"]];
const extOf = (mime: string) => EXT.find(([re]) => re.test(mime))?.[1] ?? "webm";

/** One utterance (Sarvam's REST limit is about 30 seconds). Language "unknown" lets the model detect it. */
export async function transcribe(audio: Uint8Array, mime: string, signal: AbortSignal, language = process.env.SARVAM_LANGUAGE || "unknown"): Promise<{ transcript: string; language: string | null }> {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new SarvamError("not_configured");
  const form = new FormData();
  form.set("file", new Blob([audio as BlobPart], { type: mime }), `speech.${extOf(mime)}`);
  form.set("model", process.env.SARVAM_STT_MODEL || "saarika:v2.5");
  form.set("language_code", language);
  let res: Response;
  try {
    res = await fetch(ENDPOINT, { method: "POST", headers: { "api-subscription-key": key }, body: form, signal });
  } catch {
    throw new SarvamError("failed");
  }
  if (!res.ok) throw new SarvamError(res.status === 401 || res.status === 403 ? "rejected" : res.status === 429 ? "quota" : "failed");
  const data = (await res.json().catch(() => ({}))) as { transcript?: string; language_code?: string | null };
  const code = data.language_code && LANGUAGES[data.language_code] ? data.language_code : null;
  return { transcript: (data.transcript ?? "").trim(), language: code };
}
