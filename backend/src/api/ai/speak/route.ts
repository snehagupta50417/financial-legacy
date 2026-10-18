import { z } from "zod";
import { getProvider } from "@server/ai";
import { requireSession, unauthorized } from "@server/core/session";
import { hasAiConsent } from "@server/core/ai-consent";
import { parseJson } from "@server/core/http";
import { redactIdentifiers } from "@server/core/masking";
import { aiRateLimit } from "@server/core/rate-limit";

const Body = z.object({ text: z.string().trim().min(1).max(600) });

/**
 * Keeper's voice: Gemini text to speech (free key). Returns a WAV. Needs the AI opt-in like every other
 * model call. If this fails or is unavailable, the browser falls back to its own voice, so a call never
 * depends on it.
 */
export async function POST(req: Request) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const body = await parseJson(req, Body);
  if (body instanceof Response) return body;
  const limited = aiRateLimit(session.id);
  if (limited) return limited;
  if (!(await hasAiConsent(session.id))) return Response.json({ error: "Turn on AI help to hear Keeper's voice.", code: "ai_consent_required" }, { status: 403 });
  const provider = getProvider();
  if (!provider?.speak) return Response.json({ error: "Keeper's voice is not available right now.", code: "ai_unavailable" }, { status: 503 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS ?? 45_000));
  try {
    const wav = await provider.speak(redactIdentifiers(body.text), controller.signal);
    return new Response(new Uint8Array(wav), { headers: { "content-type": "audio/wav", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Keeper's voice is not available right now.", code: "ai_unavailable" }, { status: 503 });
  } finally {
    clearTimeout(timer);
  }
}
