/** Server-only credentials. Secondary keys do not change billing/consent policy. */
export function providerKeys(provider: "GEMINI" | "SARVAM"): string[] {
  return [...new Set([process.env[provider + "_API_KEY"], process.env[provider + "_FALLBACK_API_KEY"]].map(k => k?.trim()).filter((k): k is string => !!k))];
}

export function credentialFailure(error: unknown): boolean {
  const e = error as { status?: number; message?: string } | undefined;
  return [401, 403, 429].includes(e?.status ?? 0) || /API_KEY_INVALID|API key not valid|UNAUTHENTICATED|RESOURCE_EXHAUSTED|"code":\s*(401|403|429)/i.test(e?.message ?? "");
}

/** Retry only credential/quota errors; ordinary validation errors keep their meaning. */
export async function fetchWithProviderKeys(provider: "GEMINI" | "SARVAM", signal: AbortSignal, request: (key: string) => Promise<Response>): Promise<Response> {
  const keys = providerKeys(provider);
  if (!keys.length) throw new Error("Speech provider not configured");
  for (let i = 0; i < keys.length; i++) {
    signal.throwIfAborted();
    const response = await request(keys[i]);
    if (i === keys.length - 1) return response;
    const invalidKey = response.status === 400 && /API_KEY_INVALID|API key not valid/i.test(await response.clone().text());
    if (![401, 403, 429].includes(response.status) && !invalidKey) return response;
    await response.body?.cancel();
  }
  throw new Error("Speech provider unavailable");
}
