import {
  BANK_LIMITS,
  IMMEDIATE_RELATIVES,
  MF_LIMITS,
  procedureFor,
  procedureProblem,
  type ClaimPath,
  type Procedure,
} from "@/server/procedures/procedures";

/**
 * Which claim path applies (LLD §11.1) — deterministic code, never the AI.
 * When a fact the rule needs is missing it says which question to ask; when
 * there is no checked procedure, or the claim is disputed, it sends the claim
 * to a person instead of guessing (FL-12, FL-17).
 */

export type Relationship = "spouse" | "child" | "parent" | "parent_in_law" | "sibling" | "other" | "unknown";

export interface Situation {
  nominee: "recorded" | "none" | "unknown";
  jointHolder: "surviving" | "none" | "unknown";
  relationship: Relationship;
  /**
   * What the holding is worth, in whole rupees: exact when it comes from a
   * reviewed amount, a range when the family chose a band, null when unknown.
   */
  amount: { min: number; max: number | null; source: "reviewed" | "family" } | null;
  /** Mutual fund units held in a demat account (higher simplified limit). */
  demat: boolean;
  /** Someone disputes who is entitled. */
  disputed: boolean;
}

export const EMPTY_SITUATION: Situation = {
  nominee: "unknown",
  jointHolder: "unknown",
  relationship: "unknown",
  amount: null,
  demat: false,
  disputed: false,
};

export type Question = "nominee" | "jointHolder" | "amount" | "relationship";

export type PathDecision =
  | { kind: "path"; path: ClaimPath; procedure: Procedure; reasons: string[] }
  | { kind: "ask"; question: Question; procedure: Procedure; reasons: string[] }
  | { kind: "review"; reason: string; procedure: Procedure | null };

const lakh = (r: number) =>
  r >= 10_000_000 ? `₹${r / 10_000_000} crore` : r >= 100_000 ? `₹${r / 100_000} lakh` : `₹${r.toLocaleString("en-IN")}`;

/** Within the limit (true), above it (false), or the range straddles it (null). */
function within(amount: Situation["amount"], limit: number): boolean | null {
  if (!amount) return null;
  if (amount.max !== null && amount.max <= limit) return true;
  if (amount.min > limit) return false;
  return null;
}

export function bankLimit(institution: string): { limit: number; source: string } {
  const o = BANK_LIMITS.overrides.find((x) => x.institution.test(institution));
  if (o) return { limit: o.limit, source: o.source };
  if (/co-?operative|sahakari/i.test(institution)) return { limit: BANK_LIMITS.cooperative, source: "RBI floor for co-operative banks" };
  return { limit: BANK_LIMITS.commercial, source: "RBI floor for commercial banks" };
}

export function choosePath(
  holding: { category: string; institution: string },
  s: Situation,
  today: string
): PathDecision {
  const procedure = procedureFor(holding.category, holding.institution);
  if (!procedure) {
    return {
      kind: "review",
      reason: `We don't have a checked claim procedure for ${holding.institution} yet, so a person needs to look at this rather than us guessing.`,
      procedure: null,
    };
  }
  const problem = procedureProblem(procedure, today);
  if (problem) return { kind: "review", reason: problem, procedure };
  if (s.disputed) {
    return {
      kind: "review",
      reason: "Someone disputes who is entitled. Who owns what is a legal question — talk to a lawyer or our team before preparing a claim.",
      procedure,
    };
  }

  const has = (p: ClaimPath) => !!procedure.paths[p];
  const reasons: string[] = [];
  const pick = (path: ClaimPath): PathDecision => ({ kind: "path", path, procedure, reasons });
  const ask = (question: Question): PathDecision => ({ kind: "ask", question, procedure, reasons });

  if (s.nominee === "unknown") return ask("nominee");
  if (s.nominee === "recorded" && has("nominee")) {
    reasons.push("A nominee is recorded.");
    return pick("nominee");
  }
  reasons.push("No nominee is recorded.");

  // Banks: a surviving joint holder comes before anything else.
  if (procedure.id === "bank-deceased-claim") {
    if (s.jointHolder === "unknown") return ask("jointHolder");
    if (s.jointHolder === "surviving") {
      reasons.push("There is a surviving joint holder.");
      return pick("joint");
    }
    const { limit, source } = bankLimit(holding.institution);
    const w = within(s.amount, limit);
    if (w === null) return ask("amount");
    reasons.push(`${s.amount!.source === "reviewed" ? "The checked amount" : "The amount you gave"} is ${w ? "within" : "above"} the ${lakh(limit)} simplified limit (${source}).`);
    return pick(w ? "simplified" : "succession");
  }

  if (procedure.id === "mf-transmission") {
    const quick = within(s.amount, MF_LIMITS.quick);
    if (quick === null && s.amount === null) return ask("amount");
    if (quick === true) {
      if (s.relationship === "unknown") return ask("relationship");
      if (IMMEDIATE_RELATIVES.includes(s.relationship)) {
        reasons.push(`The value is up to ${lakh(MF_LIMITS.quick)} at this fund house and you are an immediate relative.`);
        return pick("quick");
      }
    }
    const limit = s.demat ? MF_LIMITS.simplifiedDemat : MF_LIMITS.simplified;
    const w = within(s.amount, limit);
    if (w === null) return ask("amount");
    reasons.push(`The value is ${w ? "within" : "above"} the ${lakh(limit)} simplified limit for this fund house${s.demat ? " (demat)" : ""}.`);
    return pick(w ? "simplified" : "succession");
  }

  // Insurance (LIC): without a nominee, evidence of title is needed; no amount limit is published.
  if (has("no_nominee")) return pick("no_nominee");
  return { kind: "review", reason: "This procedure has no path for a claim without a nominee.", procedure };
}

/** The question to show the family, in their words. */
export const QUESTION_TEXT: Record<Question, { text: string; options: { value: string; label: string }[] }> = {
  nominee: {
    text: "Is a nominee recorded for this holding?",
    options: [
      { value: "recorded", label: "Yes, a nominee is recorded" },
      { value: "none", label: "No nominee" },
    ],
  },
  jointHolder: {
    text: "Was the account held jointly with someone who is alive?",
    options: [
      { value: "surviving", label: "Yes, there is a surviving joint holder" },
      { value: "none", label: "No, it was in their name only" },
    ],
  },
  amount: {
    text: "Roughly how much is it? (Our records don't have a checked amount.)",
    options: [
      { value: "0-10000", label: "Up to ₹10,000" },
      { value: "10001-500000", label: "₹10,000 to ₹5 lakh" },
      { value: "500001-1000000", label: "₹5 lakh to ₹10 lakh" },
      { value: "1000001-1500000", label: "₹10 lakh to ₹15 lakh" },
      { value: "1500001-", label: "More than ₹15 lakh" },
    ],
  },
  relationship: {
    text: "How are you related to the person who died?",
    options: [
      { value: "spouse", label: "Husband or wife" },
      { value: "child", label: "Son or daughter" },
      { value: "parent", label: "Mother or father" },
      { value: "parent_in_law", label: "Mother- or father-in-law" },
      { value: "sibling", label: "Brother or sister" },
      { value: "other", label: "Other" },
    ],
  },
};

/** "10001-500000" → { min: 10001, max: 500000 }; "1500001-" → no upper bound. */
export function parseBand(band: string): { min: number; max: number | null } | null {
  const m = band.match(/^(\d+)-(\d*)$/);
  if (!m) return null;
  return { min: Number(m[1]), max: m[2] ? Number(m[2]) : null };
}
