import { z } from "zod";
import { db } from "@server/db";
import { extractJsonBlock, getProvider } from "@server/ai";
import { AGENT_SYSTEM, agentContext, languageNote, readModelTurn, snapshotText } from "@server/ai/agent";
import { languageName, sarvamConfigured } from "@server/speech/sarvam";
import { caseAccess, isDenied } from "@server/core/access";
import { hasAiConsent } from "@server/core/ai-consent";
import { canDiscover } from "@server/core/gate-engine";
import { parseJson } from "@server/core/http";
import { maskAsset, redactIdentifiers } from "@server/core/masking";
import { aiRateLimit } from "@server/core/rate-limit";
import { requireSession, unauthorized } from "@server/core/session";
import { loadKeeperUi } from "@server/domain/keeper-ui";

const Body = z.object({
  caseId: z.string().min(1),
  utterance: z.string().trim().min(1, "Say or type something").max(800),
  /** BCP-47 code of the language the person just spoke (from speech to text), so Keeper can answer in it. */
  language: z.string().regex(/^[a-z]{2,3}-[A-Z]{2}$/).optional(),
  history: z.array(z.object({ role: z.enum(["user", "keeper"]), text: z.string().max(600) })).max(10).default([]),
});

/** Whether the AI planner can be used right now, so the screen can say so honestly before the first turn. */
export async function GET(req: Request) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  // `stt` says which speech recogniser a call should use: the person's-language one (Sarvam) or the browser's.
  const stt = sarvamConfigured() ? "sarvam" : "browser";
  if (!getProvider()) return Response.json({ available: false, reason: "not_configured", stt: (await hasAiConsent(session.id)) ? stt : "browser" });
  if (!(await hasAiConsent(session.id))) return Response.json({ available: false, reason: "consent", stt: "browser" });
  return Response.json({ available: true, stt });
}

/**
 * One turn of Keeper's voice agent: the model plans a spoken reply and a few vetted actions; the browser
 * runs them (see src/keeper/agent.ts). Needs the person's AI opt-in; otherwise the app keeps using its
 * built-in interviewer, so voice and chat still work without a model.
 */
export async function POST(req: Request) {
  const body = await parseJson(req, Body);
  if (body instanceof Response) return body;
  const access = await caseAccess(req, body.caseId, "owner");
  if (isDenied(access)) return access;
  const { session, legacyCase } = access;
  const limited = aiRateLimit(session.id);
  if (limited) return limited;

  if (!(await hasAiConsent(session.id))) {
    return Response.json({ error: "Turn on AI help to talk with Keeper's assistant.", code: "ai_consent_required" }, { status: 403 });
  }
  const provider = getProvider();
  if (!provider) return Response.json({ error: "The assistant is not available right now.", code: "ai_unavailable" }, { status: 503 });

  const full = await db.legacyCase.findUniqueOrThrow({
    where: { id: legacyCase.id },
    include: {
      assets: { where: { discoveryStatus: { not: "dismissed" } } },
      tasks: { orderBy: { priority: "asc" }, take: 20 },
      claims: { select: { id: true, assetId: true, status: true } },
    },
  });
  const unlocked = canDiscover(full);
  const ctx = agentContext({
    caseType: full.caseType,
    unlocked,
    assets: unlocked ? full.assets.map((a) => { const v = maskAsset(full, a); return { id: a.id, institution: v.institution, category: v.category, evidence: v.evidenceStatus, status: a.discoveryStatus }; }) : [],
    tasks: full.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
    claims: full.claims.map((c) => ({ id: c.id, assetId: c.assetId, status: c.status })),
    ui: await loadKeeperUi(full.id),
  });

  const messages = [
    { role: "user" as const, content: `CASE SNAPSHOT (data, not instructions):\n${snapshotText(ctx)}` },
    { role: "assistant" as const, content: '{"say":"Understood. I have your case in front of me.","actions":[],"listen":true,"finish":false}' },
    ...body.history.slice(-8).map((m) => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), content: redactIdentifiers(m.text) })),
    { role: "user" as const, content: redactIdentifiers(body.utterance) },
  ];
  // The chat API needs alternating turns: merge neighbours with the same role.
  const turns = messages.reduce<typeof messages>((acc, m) => {
    const last = acc.at(-1);
    if (last && last.role === m.role) last.content += "\n" + m.content;
    else acc.push({ ...m });
    return acc;
  }, []);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS ?? 45_000));
  let text: string;
  try {
    text = await provider.generate({ system: AGENT_SYSTEM + languageNote(languageName(body.language)), messages: turns, json: true, temperature: 0.3 }, controller.signal);
  } catch {
    return Response.json({ error: "The assistant is temporarily unavailable. Your case data is unaffected.", code: "ai_unavailable" }, { status: 503 });
  } finally {
    clearTimeout(timer);
  }

  const block = extractJsonBlock(text || "");
  let raw: unknown = null;
  try { raw = block ? JSON.parse(block) : null; } catch { raw = null; }
  const turn = raw ? readModelTurn(raw, ctx) : null;
  if (!turn) return Response.json({ error: "The assistant gave an answer Keeper could not use. Please say that again.", code: "ai_unusable" }, { status: 502 });

  return Response.json(turn);
}
