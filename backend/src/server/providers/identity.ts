import type { ProofOutcome } from "./types";

/**
 * IdentityProvider (G1). v0 mocks:
 *  - digilocker: "Verify with DigiLocker" (resident heirs)
 *  - passport_selfie: passport + selfie liveness (NRI heirs)
 * Both are SIMULATED and labelled as such. Real providers plug in here.
 */
export interface IdentityInput {
  method: "digilocker" | "passport_selfie";
  fullName: string;
  dob?: string | null;
}

export async function verifyIdentity(input: IdentityInput): Promise<ProofOutcome> {
  const provider = input.method === "passport_selfie" ? "mock_passport_selfie" : "mock_digilocker";
  const name = input.fullName.trim();
  if (name.length < 2) {
    return { status: "failed", provider, matchedFields: {}, note: "A full name is required." };
  }
  return {
    status: "verified",
    provider,
    matchedFields: { fullName: { expected: name, found: name, match: true } },
    note:
      input.method === "passport_selfie"
        ? "Simulated passport + selfie check (v0 mock — no real document was read)."
        : "Simulated DigiLocker identity fetch (v0 mock — no real DigiLocker call).",
  };
}
