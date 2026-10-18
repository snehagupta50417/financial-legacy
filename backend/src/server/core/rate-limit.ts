/**
 * Fixed-window, in-memory rate limiter for cost-bearing AI endpoints.
 * Per instance only — good enough for v0 on Cloud Run; move to a shared
 * store (Redis/Firestore) for the MVP.
 */

const WINDOW_MS = 60_000;
const buckets = new Map<string, { start: number; count: number }>();

export function aiLimitPerMinute(): number {
  const n = Number(process.env.RATE_LIMIT_AI_PER_MINUTE ?? 20);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

/** Returns true when the call is allowed, false when the key is over its limit. */
export function takeToken(key: string, limit = aiLimitPerMinute(), now = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || now - b.start >= WINDOW_MS) {
    buckets.set(key, { start: now, count: 1 });
    if (buckets.size > 10_000) prune(now);
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

function prune(now: number) {
  for (const [k, b] of buckets) if (now - b.start >= WINDOW_MS) buckets.delete(k);
}

export function resetRateLimits() {
  buckets.clear();
}

/** Guard for route handlers: null when allowed, else a 429 response. */
export function aiRateLimit(sessionId: string): Response | null {
  if (takeToken(`ai:${sessionId}`)) return null;
  return Response.json(
    { error: "Too many AI requests — please wait a minute and try again. Your case data is unaffected." },
    { status: 429 }
  );
}
