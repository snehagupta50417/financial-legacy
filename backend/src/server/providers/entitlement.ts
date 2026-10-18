import type { ProofOutcome } from "./types";

/** Per-asset entitlement (G4), v0 mock of the institution's nomination / joint-holder record. */
export interface EntitlementInput {
  method: "nominee" | "joint_holder" | "legal_heir_certificate" | "succession_certificate";
}

export async function verifyEntitlement(input: EntitlementInput, asset: { institution: string }): Promise<ProofOutcome> {
  const label = {
    nominee: "registered nominee",
    joint_holder: "joint holder",
    legal_heir_certificate: "legal heir (certificate)",
    succession_certificate: "holder of a succession certificate",
  }[input.method];
  return {
    status: "verified",
    provider: `mock_${input.method}`,
    matchedFields: { basis: { found: label, match: true } },
    note: `Simulated confirmation from ${asset.institution} that you are the ${label} (v0 mock).`,
  };
}
