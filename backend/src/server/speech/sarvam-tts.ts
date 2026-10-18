import { fetchWithProviderKeys } from "@server/core/provider-keys";

const LANGUAGES = new Set(["en-IN", "hi-IN", "bn-IN", "gu-IN", "kn-IN", "ml-IN", "mr-IN", "od-IN", "pa-IN", "ta-IN", "te-IN"]);

/** Existing-credit fallback only; audio stays in request memory. No voice cloning. */
export async function speakWithSarvam(text: string, signal: AbortSignal, language = "en-IN"): Promise<Uint8Array> {
  if (!LANGUAGES.has(language)) throw new Error("Speech language unavailable");
  const response = await fetchWithProviderKeys("SARVAM", signal, key => fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST", signal,
    headers: { "content-type": "application/json", "api-subscription-key": key },
    body: JSON.stringify({ text, target_language_code: language, model: process.env.SARVAM_TTS_MODEL || "bulbul:v3", speaker: process.env.SARVAM_TTS_VOICE || "shubh", output_audio_codec: "wav" }),
  }));
  if (!response.ok) throw new Error("Speech provider unavailable");
  const data = await response.json() as { audios?: unknown[] };
  const encoded = data.audios?.[0];
  if (typeof encoded !== "string" || encoded.length > 12 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("Invalid speech audio");
  const audio = Buffer.from(encoded, "base64");
  if (audio.length < 44 || audio.toString("ascii", 0, 4) !== "RIFF" || audio.toString("ascii", 8, 12) !== "WAVE") throw new Error("Invalid speech audio");
  return new Uint8Array(audio);
}
