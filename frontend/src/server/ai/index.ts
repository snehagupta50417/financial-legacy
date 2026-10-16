import { GeminiProvider } from "./gemini";
import type { AiImage, AiProvider, AiResult, ChatTurn, GenerateRequest } from "./provider";

export type { AiImage, AiProvider, AiResult, ChatTurn, GenerateRequest } from "./provider";
export { FixtureProvider } from "./fixture";

/**
 * Server-side AI layer. Every helper returns a discriminated result so the
 * app degrades gracefully instead of showing fake "live" data when the model
 * is unavailable or unconfigured.
 */

const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 45_000);

let provider: AiProvider | null | undefined;

function providerFromEnv(): AiProvider | null {
  const models = [
    process.env.GEMINI_MODEL || "gemini-flash-latest",
    ...(process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.5-flash,gemini-flash-lite-latest")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean),
  ];
  if (process.env.GEMINI_API_KEY) {
    return new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY, models });
  }
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    return new GeminiProvider({
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION,
      models,
    });
  }
  return null;
}

export function getProvider(): AiProvider | null {
  if (provider === undefined) provider = providerFromEnv();
  return provider;
}

/** Tests only: install a fixture (or null to simulate "not configured"). */
export function setProvider(p: AiProvider | null | undefined) {
  provider = p;
}

async function run(req: GenerateRequest): Promise<AiResult<string>> {
  const p = getProvider();
  if (!p) return { ok: false, error: "AI provider not configured" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const text = await p.generate(req, controller.signal);
    if (!text || !text.trim()) return { ok: false, error: "Empty AI response" };
    return { ok: true, data: text };
  } catch (e) {
    if (controller.signal.aborted) return { ok: false, error: "AI request timed out" };
    return { ok: false, error: e instanceof Error ? e.message : "AI request failed" };
  } finally {
    clearTimeout(timer);
  }
}

export function extractJsonBlock(text: string): string | null {
  // Strip markdown fences if present, then take the outermost {...}
  const cleaned = text
    .replace(/```json/gi, "```")
    .split("```")
    .reduce((longest, block) => (block.trim().length > longest.trim().length ? block : longest), text);
  for (const source of [cleaned, text]) {
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    if (start !== -1 && end > start) return source.slice(start, end + 1);
  }
  return null;
}

export function complete(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number }
): Promise<AiResult<string>> {
  return run({
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    temperature: opts?.temperature,
  });
}

export async function completeJson<T>(
  systemPrompt: string,
  userPrompt: string,
  validate: (raw: unknown) => T | null,
  opts?: { images?: AiImage[] }
): Promise<AiResult<T>> {
  const res = await run({
    system:
      systemPrompt +
      "\n\nIMPORTANT: Respond with a single valid JSON object only. No markdown, no commentary, no code fences.",
    messages: [{ role: "user", content: userPrompt }],
    images: opts?.images,
    json: true,
  });
  if (!res.ok) return res;
  const block = extractJsonBlock(res.data);
  if (!block) return { ok: false, error: "AI response did not contain JSON" };
  try {
    const validated = validate(JSON.parse(block));
    if (!validated) return { ok: false, error: "AI response failed validation" };
    return { ok: true, data: validated };
  } catch {
    return { ok: false, error: "AI response was not parseable JSON" };
  }
}

export function completeWithHistory(
  systemPrompt: string,
  history: ChatTurn[],
  userPrompt: string
): Promise<AiResult<string>> {
  return run({
    system: systemPrompt,
    messages: [...history.slice(-10), { role: "user", content: userPrompt }],
  });
}
