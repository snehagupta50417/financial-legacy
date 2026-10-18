import { isDenied } from "@server/core/access";
import { sarvamConfigured } from "@server/speech/sarvam";
import { speakWithSarvam } from "@server/speech/sarvam-tts";
import { z } from "zod";
import { getProvider } from "@server/ai";
import { requireSession, unauthorized } from "@server/core/session";
import { hasAiConsent } from "@server/core/ai-consent";
import { parseJson } from "@server/core/http";
import { redactIdentifiers } from "@server/core/masking";
import { takeToken } from "@server/core/rate-limit";

const Body = z.object({ text: z.string().trim().min(1).max(600), language: z.string().regex(/^[a-z]{2,3}-[A-Z]{2}$/).optional() });

/**
 * Keeper's voice: Gemini text to speech (free key). Returns a WAV. Needs the AI opt-in like every other
 * model call. If this fails or is unavailable, the browser falls back to its own voice, so a call never
 * depends on it.
 */
export async function POST(req: Request) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const body = await parseJson(req, Body);
  if (isDenied(body)) return body;
  // Its own, higher limit: a lively call asks for a voice line every turn, in pieces.
  if (!takeToken(`speak:${session.id}`, 90)) return Response.json({ error: "Keeper's voice is busy. The browser voice will take over.", code: "ai_unavailable" }, { status: 429 });
  if (!(await hasAiConsent(session.id))) return Response.json({ error: "Turn on AI help to hear Keeper's voice.", code: "ai_consent_required" }, { status: 403 });
  const provider = getProvider();
  const text = redactIdentifiers(body.text);
  const reply = (wav: Uint8Array, source: string) => new Response(new Uint8Array(wav), { headers: { "content-type": "audio/wav", "cache-control": "no-store", "x-keeper-voice-provider": source } });
  if (provider?.speak && !req.signal.aborted) {
    try {
      const signal = AbortSignal.any([req.signal, AbortSignal.timeout(12_000)]);
      return reply(await provider.speak(text, signal, body.language), "gemini");
    } catch { /* Same redacted text may use the existing-credit speech fallback. */ }
  }
  if (sarvamConfigured() && !req.signal.aborted) {
    try {
      const signal = AbortSignal.any([req.signal, AbortSignal.timeout(12_000)]);
      return reply(await speakWithSarvam(text, signal, body.language), "sarvam");
    } catch { /* No credentials, raw provider errors or audio in logs. */ }
  }
  return Response.json({ error: "Keeper's voice is not available right now. You can read the reply or use browser speech.", code: "ai_unavailable" }, { status: 503 });
}
