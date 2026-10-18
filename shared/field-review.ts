/**
 * Per-field review of extracted document values (PRD FL-06, FL-26; DESIGN §5.4).
 *
 * The server stores each field's decision with its history (DocumentField,
 * FieldReviewEvent). The page keeps unsaved decisions here and sends only the
 * ones that changed. Pure functions only — no React.
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
  /** Why the person corrected or rejected it (optional, kept in the history). */
  reason?: string;
}

/** A field as the server returns it (CaseWorkspace documents[].fields). */
export interface ServerField extends ExtractedField {
  id: string;
  proposedValue: string;
  state: string; // proposed | accepted | corrected | rejected
  reason: string | null;
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
  correctedValue?: string,
  reason?: string
): FieldReview[] {
  return reviews.map((r, i) => {
    if (i !== index) return r;
    const why = reason?.trim() ? { reason: reason.trim() } : {};
    if (decision === "corrected") {
      const v = (correctedValue ?? "").trim();
      // An empty or unchanged correction is not a correction.
      if (!v || v === r.original) return { decision: "accepted", original: r.original };
      return { decision, original: r.original, corrected: v, ...why };
    }
    return { decision, original: r.original, ...(decision === "rejected" ? why : {}) };
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

/** The saved decisions, as the page starts with them. */
export function reviewsFromServer(fields: ServerField[]): FieldReview[] {
  return fields.map((f) => ({
    decision: f.state === "proposed" ? "not_reviewed" : (f.state as FieldDecision),
    original: f.proposedValue,
    ...(f.state === "corrected" ? { corrected: f.value } : {}),
    ...(f.reason ? { reason: f.reason } : {}),
  }));
}

export interface Decision {
  fieldId: string;
  decision: Exclude<FieldDecision, "not_reviewed">;
  value?: string;
  reason?: string;
}

/** Body for PUT /api/documents/:id/review: only decisions that differ from what is saved. */
export function toDecisions(fields: ServerField[], reviews: FieldReview[]): Decision[] {
  const saved = reviewsFromServer(fields);
  return fields.flatMap((f, i) => {
    const r = reviews[i];
    const s = saved[i];
    if (!r || r.decision === "not_reviewed") return [];
    if (r.decision === s.decision && r.corrected === s.corrected && (r.reason ?? "") === (s.reason ?? "")) return [];
    return [
      {
        fieldId: f.id,
        decision: r.decision,
        ...(r.decision === "corrected" ? { value: r.corrected } : {}),
        ...(r.reason?.trim() ? { reason: r.reason.trim() } : {}),
      },
    ];
  });
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
