import ZAI from "z-ai-web-dev-sdk";

/**
 * Server-side AI layer. The z-ai-web-dev-sdk is used ONLY here (backend).
 * Every helper returns a discriminated result so the app can degrade
 * gracefully instead of showing fake "live" data when the model is
 * unavailable.
 */

export type AiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

let cachedClient: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZai() {
  if (!cachedClient) {
    cachedClient = await ZAI.create();
  }
  return cachedClient;
}

function extractJsonBlock(text: string): string | null {
  // Strip markdown fences if present
  const cleaned = text
    .replace(/```json/gi, "```")
    .split("```")
    .reduce((longest, block) => (block.trim().length > longest.trim().length ? block : longest), text);
  const candidates = [cleaned, text];
  for (const source of candidates) {
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return source.slice(start, end + 1);
    }
  }
  return null;
}

export async function complete(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number }
): Promise<AiResult<string>> {
  try {
    const zai = await getZai();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
      ...(opts?.temperature !== undefined ? { temperature: opts.temperature } : {}),
    });
    const content = completion.choices[0]?.message?.content;
    if (!content || !content.trim()) {
      return { ok: false, error: "Empty AI response" };
    }
    return { ok: true, data: content };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI request failed" };
  }
}

export async function completeJson<T>(
  systemPrompt: string,
  userPrompt: string,
  validate: (raw: unknown) => T | null
): Promise<AiResult<T>> {
  const res = await complete(
    systemPrompt +
      "\n\nIMPORTANT: Respond with a single valid JSON object only. No markdown, no commentary, no code fences.",
    userPrompt
  );
  if (!res.ok) return res;
  const block = extractJsonBlock(res.data);
  if (!block) return { ok: false, error: "AI response did not contain JSON" };
  try {
    const parsed = JSON.parse(block);
    const validated = validate(parsed);
    if (!validated) return { ok: false, error: "AI response failed validation" };
    return { ok: true, data: validated };
  } catch {
    return { ok: false, error: "AI response was not parseable JSON" };
  }
}

export async function completeWithHistory(
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
  userPrompt: string
): Promise<AiResult<string>> {
  try {
    const zai = await getZai();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        ...history.slice(-10),
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });
    const content = completion.choices[0]?.message?.content;
    if (!content || !content.trim()) {
      return { ok: false, error: "Empty AI response" };
    }
    return { ok: true, data: content };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI request failed" };
  }
}
