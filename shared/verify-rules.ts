/**
 * Verify console: the four checks, the fixed risk ladder and the documents each claim route needs.
 * Pure and deterministic. The rating is decided here, by these rules, and never by a model.
 */

export const CHECKS = ["consistency", "authenticity", "duplicate", "completeness"] as const;
export type CheckKey = (typeof CHECKS)[number];
export type CheckStatus = "pass" | "flag" | "incomplete";
export type RiskLevel = "low" | "medium" | "high" | "not_checked";

export const CHECK_LABEL: Record<CheckKey, string> = {
  consistency: "Consistency",
  authenticity: "Authenticity signals",
  duplicate: "Duplicate claim",
  completeness: "Completeness",
};
export const CHECK_QUESTION: Record<CheckKey, string> = {
  consistency: "Do names, dates, ages and relationships agree across the documents?",
  authenticity: "Are there possible signs that a document was edited?",
  duplicate: "Has someone else claimed the same deceased person's product?",
  completeness: "Are all documents required for this claim route present?",
};
/** Shown instead of a pass when a check could not finish. A check that did not finish is never a pass. */
export const INCOMPLETE_TEXT = "Couldn't complete, review manually";

/** Every finding points at something a reviewer can open: a document field, another claim, or a requirement. */
export type EvidenceRef =
  | { kind: "document"; documentId: string; fieldKey: string }
  | { kind: "claim"; claimId: string; code: string }
  | { kind: "requirement"; docKind: DocKind };
export interface Finding {
  id: string;
  kind: "mismatch" | "signal" | "duplicate" | "missing";
  label: string;
  /** What the other documents or records say it should be. */
  expected: string;
  /** What this document actually shows. */
  observed: string;
  evidence: EvidenceRef[];
}
export interface CheckResult { check: CheckKey; status: CheckStatus; summary: string; findings: Finding[] }

export type DocKind = "death_certificate" | "claimant_id" | "relationship_proof" | "claim_form" | "indemnity_form" | "policy_document";
export const DOC_LABEL: Record<DocKind, string> = {
  death_certificate: "Death certificate",
  claimant_id: "Claimant ID",
  relationship_proof: "Proof of relationship",
  claim_form: "Claim form",
  indemnity_form: "Indemnity form",
  policy_document: "Policy document",
};

export type ClaimRoute = "nominee" | "succession" | "joint_survivor" | "deceased_deposit";
export const ROUTE_LABEL: Record<ClaimRoute, string> = {
  nominee: "Nominee claim",
  succession: "Legal heir (no nominee) claim",
  joint_survivor: "Surviving joint holder claim",
  deceased_deposit: "Deceased depositor, legal heir claim",
};
/** Required documents per route. Synthetic demo requirements; real institutions publish their own. */
export const ROUTE_REQUIREMENTS: Record<ClaimRoute, DocKind[]> = {
  nominee: ["death_certificate", "claimant_id", "claim_form", "policy_document"],
  succession: ["death_certificate", "claimant_id", "claim_form", "policy_document", "relationship_proof"],
  joint_survivor: ["death_certificate", "claimant_id", "claim_form"],
  deceased_deposit: ["death_certificate", "claimant_id", "claim_form", "relationship_proof", "indemnity_form"],
};

/** Both numbers matter to a reviewer: the days in the window, and where it started. */
export const CLAIM_WINDOW_DAYS = 15;
export const DUE_SOON_DAYS = 3;

export const RISK_LABEL: Record<RiskLevel, string> = { low: "Low risk", medium: "Medium risk", high: "High risk", not_checked: "Not checked" };

/** The ladder, in the order it is applied. Shown to reviewers under "How is this rated?". */
export const RISK_RULES: { level: RiskLevel; text: string }[] = [
  { level: "high", text: "High: a duplicate claim is flagged, or both authenticity and consistency are flagged." },
  { level: "medium", text: "Medium: any check is flagged, or any required document is missing." },
  { level: "low", text: "Low: all four checks pass." },
  { level: "not_checked", text: "Not checked: the checks have not all completed successfully, so no rating is given." },
];

export interface Rating { level: RiskLevel; rule: string; reasons: string[]; explanation: string }

const rule = (level: RiskLevel) => RISK_RULES.find((r) => r.level === level)!.text;

/** Apply the ladder to the four check results. A missing or unfinished check can never produce a pass. */
export function rate(results: CheckResult[]): Rating {
  const by = (k: CheckKey) => results.find((r) => r.check === k);
  const status = (k: CheckKey): CheckStatus => by(k)?.status ?? "incomplete";
  const flagged = (k: CheckKey) => status(k) === "flag";
  const reasons = results.filter((r) => r.status === "flag").flatMap((r) => r.findings.map((f) => `${CHECK_LABEL[r.check]}: ${f.label}`));
  const unfinished = CHECKS.filter((k) => status(k) === "incomplete");
  const tail = unfinished.length ? ` ${unfinished.map((k) => CHECK_LABEL[k]).join(" and ")} could not be completed and needs a manual review.` : "";

  if (flagged("duplicate") || (flagged("authenticity") && flagged("consistency"))) {
    return { level: "high", rule: rule("high"), reasons, explanation: `High risk. ${reasons.join(". ")}.${tail}` };
  }
  if (CHECKS.some((k) => flagged(k))) {
    return { level: "medium", rule: rule("medium"), reasons, explanation: `Medium risk. ${reasons.join(". ")}.${tail}` };
  }
  if (CHECKS.every((k) => status(k) === "pass")) {
    return { level: "low", rule: rule("low"), reasons: [], explanation: "Low risk. All four checks passed: the documents agree, no signs of editing were found, no one else has claimed this product, and every required document is present." };
  }
  return { level: "not_checked", rule: rule("not_checked"), reasons: [], explanation: `Not rated.${tail || " The checks have not been run."} Review this claim manually.` };
}

/** Days left in the 15-day window (can be negative), counted in whole days. */
export function daysRemaining(receivedAt: Date | string, now: Date = new Date()): number {
  const start = new Date(receivedAt).getTime();
  const elapsed = Math.floor((now.getTime() - start) / 86_400_000);
  return CLAIM_WINDOW_DAYS - elapsed;
}
