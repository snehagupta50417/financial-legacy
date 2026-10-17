/**
 * Evidence status of a holding (PRD FL-07, LLD §10.1). Deterministic code — AI
 * confidence and name similarity can never raise a status.
 *
 *   self_declared        the user told us (or confirmed it) and no reviewed document supports it yet
 *   potential_match      a document clue or search suggests it; the user hasn't confirmed it
 *   document_backed      the user confirmed it AND a document they reviewed supports it
 *   institution_verified the institution confirmed it — set only by an operator with institution
 *                        evidence (markInstitutionVerified), never by these rules
 */

export type EvidenceStatus = "self_declared" | "potential_match" | "document_backed" | "institution_verified";

export const EVIDENCE_STATUSES: readonly EvidenceStatus[] = [
  "self_declared",
  "potential_match",
  "document_backed",
  "institution_verified",
];

export interface ReviewedField {
  label: string;
  state: string; // proposed | accepted | corrected | rejected
  critical: boolean;
}

/**
 * Labels that identify the holding itself ("Account reference", "Policy number", "Folio 1"):
 * if every one was rejected, the document doesn't back it. Names ("Account holder") don't count.
 */
const REFERENCE = /(account|a\/c|policy|folio|demat)\s*(no\b|no\.|number|ref\b|reference|#)|^(folio|policy|reference)\b|\breference\b/i;
const NOT_REFERENCE = /holder|name|assured|investor|nominee/i;

/**
 * Does this reviewed document support a holding? Every critical field must have
 * a decision, and the field identifying the holding must not have been rejected.
 */
export function documentSupports(fields: ReviewedField[]): boolean {
  if (!fields.length) return false;
  if (fields.some((f) => f.critical && f.state === "proposed")) return false;
  const refs = fields.filter((f) => REFERENCE.test(f.label) && !NOT_REFERENCE.test(f.label));
  if (refs.length && refs.every((f) => f.state === "rejected")) return false;
  return fields.some((f) => f.state === "accepted" || f.state === "corrected");
}

export function deriveEvidenceStatus(input: {
  current: string;
  discoveryStatus: string; // possible | confirmed | dismissed
  /** The linked document's reviewed fields, or null when no document is linked. */
  linkedDocument: ReviewedField[] | null;
}): EvidenceStatus {
  // Institution verification is sticky: only an operator can set or clear it.
  if (input.current === "institution_verified") return "institution_verified";
  if (input.discoveryStatus === "possible") return "potential_match";
  if (input.linkedDocument && documentSupports(input.linkedDocument)) return "document_backed";
  return "self_declared";
}
