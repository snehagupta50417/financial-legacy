/**
 * Per-field review of extracted document values (PRD FL-06, FL-26; DESIGN §5.4).
 *
 * The API stores one list of fields per document plus a document-level
 * `userVerified` flag, so per-field states live in the UI until the server has
 * review records (LLD §8, DECISIONS.md). Pure functions only — no React.
 */

export interface ExtractedField {
  label: string;
  value: string;
  confidence: number;
  sourceExcerpt: string;
}

export type FieldDecision = "not_reviewed" | "accepted" | "corrected" | "rejected";

export interface FieldReview {
  decision: FieldDecision;
  /** The value the model proposed. Kept so a correction can show old → new. */
  original: string;
  /** Set only when decision is "corrected". */
  corrected?: string;
}

/** Critical fields must be reviewed by a person before they count (FL-06). */
const CRITICAL = [
  /name|holder|assured|nominee|investor|claimant|insured/i, // names and ownership
  /number|no\.?\b|ref|account|policy|folio|pan|aadhaar|ifsc|identifier/i, // identifiers
  /amount|balance|sum|value|premium|units|nav|₹|principal|maturity/i, // amounts
  /date|period|commencement|due|death|as of/i, // dates
  /institution|bank|insurer|fund|amc|branch/i, // institution
];

export function isCriticalField(label: string): boolean {
  return CRITICAL.some((re) => re.test(label));
}

/** A document already verified as a whole starts with every field accepted. */
export function initialReviews(fields: ExtractedField[], userVerified: boolean): FieldReview[] {
  return fields.map((f) => ({ decision: userVerified ? "accepted" : "not_reviewed", original: f.value }));
}

export function decide(
  reviews: FieldReview[],
  index: number,
  decision: FieldDecision,
  correctedValue?: string
): FieldReview[] {
  return reviews.map((r, i) => {
    if (i !== index) return r;
    if (decision === "corrected") {
      const v = (correctedValue ?? "").trim();
      // An empty or unchanged correction is not a correction.
      if (!v || v === r.original) return { decision: "accepted", original: r.original };
      return { decision, original: r.original, corrected: v };
    }
    return { decision, original: r.original };
  });
}

export interface ReviewSummary {
  total: number;
  reviewed: number;
  accepted: number;
  corrected: number;
  rejected: number;
  /** Labels of critical fields nobody has reviewed yet. */
  pendingCritical: string[];
  /** Every field has a decision, so the document can be marked reviewed. */
  complete: boolean;
}

export function summarise(fields: ExtractedField[], reviews: FieldReview[]): ReviewSummary {
  const count = (d: FieldDecision) => reviews.filter((r) => r.decision === d).length;
  const pendingCritical = fields
    .filter((f, i) => reviews[i]?.decision === "not_reviewed" && isCriticalField(f.label))
    .map((f) => f.label);
  const reviewed = reviews.filter((r) => r.decision !== "not_reviewed").length;
  return {
    total: fields.length,
    reviewed,
    accepted: count("accepted"),
    corrected: count("corrected"),
    rejected: count("rejected"),
    pendingCritical,
    complete: fields.length > 0 && reviewed === fields.length,
  };
}

/**
 * Body for PATCH /api/documents/:id. Rejected fields are dropped (they are not
 * facts); corrected fields carry the new value and keep the original citation.
 * `userVerified` is true only when every field has been reviewed.
 */
export function toPatchBody(fields: ExtractedField[], reviews: FieldReview[]) {
  const extractedFields = fields.flatMap((f, i) => {
    const r = reviews[i];
    if (!r || r.decision === "rejected") return [];
    if (r.decision === "corrected" && r.corrected) return [{ ...f, value: r.corrected }];
    return [f];
  });
  return { extractedFields, userVerified: summarise(fields, reviews).complete };
}

/**
 * Find a field's source excerpt in the document text, ignoring differences in
 * whitespace and letter case. Returns [start, end) offsets into `text`, or null.
 */
export function locateExcerpt(text: string, excerpt: string): [number, number] | null {
  const needle = excerpt.replace(/\s+/g, " ").trim().toLowerCase();
  if (!text || needle.length < 3) return null;
  // Collapse whitespace in the haystack while remembering original offsets.
  let flat = "";
  const map: number[] = [];
  let prevSpace = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (prevSpace) continue;
      flat += " ";
      prevSpace = true;
    } else {
      flat += ch.toLowerCase();
      prevSpace = false;
    }
    map.push(i);
  }
  const at = flat.indexOf(needle);
  if (at < 0) return null;
  return [map[at], map[at + needle.length - 1] + 1];
}
