import { matchNames } from "@/server/core/name-match";
import type { ProofOutcome } from "./types";

/**
 * Relationship proof (G3), v0 mocks:
 *  - own_document: the heir's own document (passport, birth/marriage
 *    certificate, Aadhaar "S/o / D/o / W/o") names the deceased → name match.
 *  - legal_heir_certificate: certificate lists the claimant (simulated).
 *  - relative_consent: caregiver journeys — the living relative's recorded
 *    consent (simulated OTP to the relative).
 */
export interface RelationshipInput {
  method: "own_document" | "legal_heir_certificate" | "relative_consent";
  relationship: string;
  nameOnDocument?: string | null; // parent/spouse name printed on the heir's document
  documentType?: string | null;
  relativeName?: string | null;
}

export async function verifyRelationship(input: RelationshipInput, ctx: { deceasedName: string | null; claimantName: string | null }): Promise<ProofOutcome> {
  if (input.method === "relative_consent") {
    const ok = !!input.relativeName?.trim();
    return {
      status: ok ? "verified" : "failed",
      provider: "mock_relative_consent",
      matchedFields: { relativeName: { found: input.relativeName ?? null, match: ok } },
      note: ok ? "Simulated consent from the relative (v0 mock OTP)." : "The relative's name is required.",
    };
  }
  if (input.method === "legal_heir_certificate") {
    return {
      status: "verified",
      provider: "mock_legal_heir_certificate",
      matchedFields: { claimant: { expected: ctx.claimantName, found: ctx.claimantName, match: true } },
      note: "Simulated legal-heir certificate check (v0 mock).",
    };
  }
  if (!ctx.deceasedName) {
    return { status: "needs_review", provider: "mock_own_document", matchedFields: {}, note: "No verified deceased name on the case yet." };
  }
  const found = input.nameOnDocument?.trim() ?? "";
  const m = matchNames(ctx.deceasedName, found);
  return {
    status: m.outcome === "match" ? "verified" : "needs_review",
    provider: "mock_own_document",
    matchedFields: { nameOnDocument: { expected: ctx.deceasedName, found: found || null, match: m.outcome === "match" ? true : "review" } },
    note:
      m.outcome === "match"
        ? `Your ${input.documentType || "document"} names ${ctx.deceasedName} (simulated read, v0 mock).`
        : `The name on your document did not clearly match (${m.reason}) — sent to manual review.`,
  };
}
