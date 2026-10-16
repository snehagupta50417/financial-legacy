import { createHmac } from "node:crypto";

/**
 * PAN is never stored; only an HMAC used to spot two cases about the same
 * person. PAN_HASH_SECRET must be set in production.
 */
export function panHash(pan: string | null | undefined): string | null {
  if (!pan) return null;
  const norm = pan.toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(norm)) return null;
  const secret = process.env.PAN_HASH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("PAN_HASH_SECRET is not configured");
  }
  return createHmac("sha256", secret || "dev-only-pan-hash-secret").update(norm).digest("hex");
}

export function isValidPan(pan: string | null | undefined): boolean {
  return !!pan && /^[A-Z]{5}\d{4}[A-Z]$/.test(pan.toUpperCase().replace(/\s/g, ""));
}
