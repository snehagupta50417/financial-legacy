import { geminiSpeechConfigured, transcribeWithGemini } from "@server/speech/gemini";
import { requireSession, unauthorized } from "@server/core/session";
import { hasAiConsent } from "@server/core/ai-consent";
import { takeToken } from "@server/core/rate-limit";
import { sarvamConfigured, SarvamError, transcribe } from "@server/speech/sarvam";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Speech to text for one spoken turn, in the person's own language (Sarvam). Needs the same AI opt-in as
 * every other call that sends something to an outside model, because their audio leaves for that service.
 * Audio and transcript are never logged or stored here. If this is unavailable the browser's own speech
 * recognition takes over, so a call never depends on it.
 */
export async function POST(req: Request) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  if (!takeToken(`stt:${session.id}`, 60)) return Response.json({ error: "Speech in your language is busy right now.", code: "stt_quota" }, { status: 429 });
  if (!(await hasAiConsent(session.id))) return Response.json({ error: "Turn on AI help to use speech in your language.", code: "ai_consent_required" }, { status: 403 });
  if (!sarvamConfigured() && !geminiSpeechConfigured()) return Response.json({ error: "Speech in your language is not set up here.", code: "stt_unavailable" }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof Blob) || file.size === 0) return Response.json({ error: "No audio received." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "That recording is too long. Say a little less at a time." }, { status: 413 });
  const mime = file.type || "audio/webm";
  if (!/^(audio|video)\//.test(mime)) return Response.json({ error: "That is not an audio recording." }, { status: 415 });
  const hint = form?.get("language");

  const audio = new Uint8Array(await file.arrayBuffer());
  const language = typeof hint === "string" && /^[a-z]{2,3}-[A-Z]{2}$/.test(hint) ? hint : undefined;
  let primaryFailure: unknown;
  const run = async (provider: typeof transcribe) => {
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(12_000)]);
    return provider(audio, mime, signal, language);
  };
  if (sarvamConfigured()) {
    try { return Response.json(await run(transcribe)); }
    catch (e) { primaryFailure = e; }
  }
  if (!req.signal.aborted && geminiSpeechConfigured()) {
    try { return Response.json(await run(transcribeWithGemini)); }
    catch { /* No audio, transcript, credentials or raw provider errors in logs/responses. */ }
  }
  const quota = primaryFailure instanceof SarvamError && primaryFailure.reason === "quota";
  return Response.json({ error: "Voice transcription could not be completed. Please try again or type.", code: quota ? "stt_quota" : "stt_unavailable" }, { status: quota ? 429 : 503 });
}
