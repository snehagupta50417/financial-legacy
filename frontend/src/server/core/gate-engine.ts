/**
 * Trust gates (plan §3) as pure functions. Access decisions are made here,
 * deterministically — never by the LLM.
 *
 *   G0 Account → G1 Identity → G2 Death → G3 Relationship → G4 Entitlement (per asset)
 */

export const GATES = ["G0", "G1", "G2", "G3", "G4"] as const;
export type Gate = (typeof GATES)[number];

export const GATE_LABEL: Record<Gate, string> = {
  G0: "Account",
  G1: "Verify your identity",
  G2: "Proof of death",
  G3: "Proof of relationship",
  G4: "Entitlement for an asset",
};

/** personal = the user's own assets; third_party = someone else's (usually deceased). */
export type JourneyKind = "personal" | "third_party" | "caregiver";

export function journeyKind(caseType: string): JourneyKind {
  if (caseType === "living_individual" || caseType === "estate_planning") return "personal";
  if (caseType === "caregiver") return "caregiver";
  // family_death, nominee_heir, rejected_claim, nri_cross_border and the
  // unclassified "general" all take the strict path.
  return "third_party";
}

export type ProofKind = "identity" | "death" | "relationship" | "entitlement";

/** The case-level gates a journey must pass, in order. */
export function requiredPath(kind: JourneyKind): Gate[] {
  if (kind === "personal") return ["G1"];
  if (kind === "caregiver") return ["G1", "G3"]; // G3 = recorded consent of the relative
  return ["G1", "G2", "G3"];
}

export function gateIndex(g: string): number {
  const i = GATES.indexOf(g as Gate);
  return i === -1 ? 0 : i;
}

export function atLeast(reached: string, needed: Gate): boolean {
  return gateIndex(reached) >= gateIndex(needed);
}

export function maxGate(a: string, b: Gate): Gate {
  return gateIndex(a) >= gateIndex(b) ? (a as Gate) : b;
}

/** Gate at which discovery and (masked) asset data unlock. */
export function discoveryGate(kind: JourneyKind): Gate {
  return kind === "personal" ? "G1" : "G3";
}

export interface GateCase {
  caseType: string;
  gateReached: string;
  frozenReason?: string | null;
}

export function nextGate(c: GateCase): Gate | null {
  return requiredPath(journeyKind(c.caseType)).find((g) => !atLeast(c.gateReached, g)) ?? null;
}

export function canDiscover(c: GateCase): boolean {
  if (c.frozenReason) return false;
  return atLeast(c.gateReached, discoveryGate(journeyKind(c.caseType)));
}

/**
 * Full identifiers for one asset: the case must be able to discover AND the
 * user must be entitled to that asset (G4). On a personal journey the user
 * is the holder, so their own assets are shown in full.
 */
export function canSeeFullAsset(c: GateCase, asset: { entitled: boolean }): boolean {
  if (!canDiscover(c)) return false;
  return journeyKind(c.caseType) === "personal" || asset.entitled;
}

export type ProofCheck = { ok: true } | { ok: false; status: 403 | 409; error: string };

/** Whether a proof of this kind may be submitted now (order is enforced). */
export function canSubmitProof(c: GateCase, kind: ProofKind): ProofCheck {
  const jk = journeyKind(c.caseType);
  const path = requiredPath(jk);
  if (kind === "identity") return { ok: true };
  if (kind === "entitlement") {
    return canDiscover(c)
      ? { ok: true }
      : { ok: false, status: 403, error: "Entitlement can be proved once discovery is unlocked." };
  }
  const gate: Gate = kind === "death" ? "G2" : "G3";
  if (!path.includes(gate)) {
    return { ok: false, status: 409, error: `${GATE_LABEL[gate]} is not needed for this journey.` };
  }
  const before = path[path.indexOf(gate) - 1];
  if (before && !atLeast(c.gateReached, before)) {
    return { ok: false, status: 403, error: `Complete "${GATE_LABEL[before]}" first.` };
  }
  return { ok: true };
}

export function gateForProof(kind: Exclude<ProofKind, "entitlement">): Gate {
  return kind === "identity" ? "G1" : kind === "death" ? "G2" : "G3";
}

/**
 * Living-person guard: activity that only the person themself could perform
 * (OTP requests, card/UPI spends, logins) dated after the recorded date of
 * death means the "deceased" may be alive → freeze. Automatic credits such
 * as interest or dividends are not evidence of life.
 */
export const PERSON_INITIATED = new Set(["otp", "card_spend", "upi_debit", "login", "atm_withdrawal", "cheque_issued"]);

export function livingPersonActivity(
  dateOfDeath: string | null | undefined,
  events: { date: string; kind: string }[]
): { date: string; kind: string }[] {
  if (!dateOfDeath) return [];
  return events.filter((e) => PERSON_INITIATED.has(e.kind) && e.date > dateOfDeath);
}
