import { canSeeFullAsset, type GateCase } from "./gate-engine";

/**
 * Mask by default (plan principle 3). Every asset leaving the API passes
 * through maskAsset(). Below G4 for that asset only institution, category,
 * value band and last-4 are disclosed.
 */

/** Long digit runs (account/policy/folio/phone/Aadhaar) → keep last 4. PAN → masked. */
export function redactIdentifiers(text: string): string {
  return text
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, (pan) => `•••••${pan.slice(5, 9)}•`)
    // Grouped numbers (Aadhaar 1234 5678 9012, policy 4455-6677-88, phone 98765 43210).
    // Date shapes (2026-03-12, 12-03-2026) are left alone.
    .replace(/\b\d{2,}(?:[ -]\d{2,})+\b/g, (run) => {
      if (/^\d{4}-\d{2}-\d{2}$|^\d{2}-\d{2}-\d{4}$/.test(run)) return run;
      const digits = run.replace(/\D/g, "");
      return digits.length >= 8 ? `••••${digits.slice(-4)}` : run;
    })
    // Plain runs of 6+ digits: account, policy, folio, phone numbers
    .replace(/\b\d{6,}\b/g, (run) => `••••${run.slice(-4)}`);
}

/** Exact money amounts → hidden (the value band is shown separately). */
export function redactAmounts(text: string): string {
  return text.replace(
    /(₹|\bRs\.?|\bINR)\s?[\d,]+(?:\.\d+)?(?:\s?(?:lakh|lakhs|L|crore|cr)\b)?/gi,
    "₹ ••••"
  );
}

export function last4Of(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const digits = ref.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export interface AssetRow {
  id: string;
  category: string;
  institution: string;
  maskedRef: string | null;
  holderName: string | null;
  evidence: string | null;
  discoveryStatus: string;
  verificationStatus: string;
  confidence: number;
  notes: string | null;
  sourceDocumentId: string | null;
  entitled: boolean;
  valueBand: string | null;
  last4: string | null;
}

export interface AssetView {
  id: string;
  category: string;
  institution: string;
  maskedRef: string | null;
  holderName: string | null;
  evidence: string | null;
  discoveryStatus: string;
  verificationStatus: string;
  confidence: number;
  notes: string | null;
  sourceDocumentId: string | null;
  entitled: boolean;
  valueBand: string | null;
  last4: string | null;
  masked: boolean;
}

export function maskAsset(c: GateCase, a: AssetRow): AssetView {
  const last4 = a.last4 ?? last4Of(a.maskedRef);
  if (canSeeFullAsset(c, a)) {
    return { ...pick(a), last4, masked: false };
  }
  return {
    ...pick(a),
    maskedRef: last4 ? `••••${last4}` : null,
    holderName: null,
    evidence: a.evidence ? redactAmounts(redactIdentifiers(a.evidence)) : null,
    last4,
    masked: true,
  };
}

function pick(a: AssetRow): Omit<AssetView, "masked"> {
  return {
    id: a.id,
    category: a.category,
    institution: a.institution,
    maskedRef: a.maskedRef,
    holderName: a.holderName,
    evidence: a.evidence,
    discoveryStatus: a.discoveryStatus,
    verificationStatus: a.verificationStatus,
    confidence: a.confidence,
    notes: a.notes,
    sourceDocumentId: a.sourceDocumentId,
    entitled: a.entitled,
    valueBand: a.valueBand,
    last4: a.last4,
  };
}
