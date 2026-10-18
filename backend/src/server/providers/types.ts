/** Result of any proof provider. matchedFields is stored on the Proof row. */
export interface ProofOutcome {
  status: "verified" | "needs_review" | "failed";
  provider: string;
  matchedFields: Record<string, { expected?: string | null; found?: string | null; match: boolean | "review" }>;
  note: string;
}
