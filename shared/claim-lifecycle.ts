/**
 * Claim lifecycle (LLD §11.3). Before submission the status is *derived* from
 * the facts (path, entitlement, pack, approval) so it can never drift; after
 * submission it moves only through the transitions below, each recorded.
 */

export type ClaimStatus =
  | "draft"
  | "authority_review"
  | "document_collection"
  | "pack_review"
  | "ready_for_submission"
  | "submitted"
  | "submission_unknown"
  | "institution_review"
  | "more_information_required"
  | "settled"
  | "transferred"
  | "partially_settled"
  | "rejected"
  | "unresolved_dispute";

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  draft: "Choosing the claim path",
  authority_review: "Show you may claim it",
  document_collection: "Gathering documents",
  pack_review: "Checking the pack",
  ready_for_submission: "Ready for you to submit",
  submitted: "Submitted by you",
  submission_unknown: "Not sure it was received",
  institution_review: "With the institution",
  more_information_required: "Institution asked for more",
  settled: "Settled",
  transferred: "Transferred",
  partially_settled: "Partly settled",
  rejected: "Rejected",
  unresolved_dispute: "Dispute unresolved",
};

export const PRE_SUBMISSION: ClaimStatus[] = ["draft", "authority_review", "document_collection", "pack_review", "ready_for_submission"];
export const OUTCOMES = ["settled", "transferred", "partially_settled", "rejected", "unresolved_dispute"] as const;
export type Outcome = (typeof OUTCOMES)[number];

/** Statuses after which nothing more is expected — except a partly settled remainder. */
export const CLOSED: ClaimStatus[] = ["settled", "transferred", "rejected"];

export function derivePreSubmission(f: {
  pathChosen: boolean;
  entitled: boolean;
  requiredMissing: number;
  packReady: boolean;
  approvedForCurrentPack: boolean;
}): ClaimStatus {
  if (!f.pathChosen) return "draft";
  if (!f.entitled) return "authority_review";
  if (f.requiredMissing > 0) return "document_collection";
  if (!f.packReady || !f.approvedForCurrentPack) return "pack_review";
  return "ready_for_submission";
}

/** Allowed recorded transitions after submission (the family records what the institution did). */
const NEXT: Partial<Record<ClaimStatus, ClaimStatus[]>> = {
  submitted: ["institution_review", "more_information_required", ...OUTCOMES],
  submission_unknown: ["submitted", "institution_review", "more_information_required", ...OUTCOMES],
  institution_review: ["more_information_required", ...OUTCOMES],
  more_information_required: ["document_collection", "institution_review", ...OUTCOMES],
  partially_settled: ["institution_review", "more_information_required", "settled", "rejected", "unresolved_dispute"],
  rejected: ["document_collection", "unresolved_dispute"],
  unresolved_dispute: ["document_collection", "institution_review", ...OUTCOMES],
};

export function canMove(from: ClaimStatus, to: ClaimStatus): boolean {
  return !!NEXT[from]?.includes(to);
}

/** Money actually received. A rejection or dispute is never counted as recovery (FL-16). */
export function recovered(claims: { outcome: string | null; outcomeAmount: string | null }[]): string[] {
  return claims
    .filter((c) => (c.outcome === "settled" || c.outcome === "transferred" || c.outcome === "partially_settled") && c.outcomeAmount)
    .map((c) => c.outcomeAmount!);
}

/** Who acts next and by when (FL-15): every open item has an owner. */
export function waitingOn(status: ClaimStatus): "family" | "institution" | "financial_legacy" | null {
  if (["draft", "authority_review", "document_collection", "pack_review", "ready_for_submission", "more_information_required", "submission_unknown"].includes(status))
    return "family";
  if (["submitted", "institution_review", "partially_settled"].includes(status)) return "institution";
  if (status === "unresolved_dispute") return "financial_legacy";
  return null;
}
