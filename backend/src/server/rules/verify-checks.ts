import {
  CHECKS, CHECK_LABEL, DOC_LABEL, INCOMPLETE_TEXT, ROUTE_LABEL, ROUTE_REQUIREMENTS,
  type CheckKey, type CheckResult, type ClaimRoute, type DocKind, type EvidenceRef, type Finding,
} from "@shared/verify-rules";

/**
 * The four Verify checks, as pure functions of the documents and the other claims. No model is involved:
 * the same input always gives the same findings. A check that cannot finish says so ("incomplete") and is
 * never treated as a pass.
 */

export interface CheckField { key: string; label: string; value: string }
export interface CheckSignal { fieldKey: string; kind: string; note: string }
export interface CheckDoc { id: string; kind: DocKind; title: string; fields: CheckField[]; signals: CheckSignal[]; readable: boolean }
export interface CheckClaim { id: string; code: string; route: ClaimRoute; deceasedName: string; productLast4: string; institution: string; receivedAt: Date }
export interface OtherClaim { id: string; code: string; claimantName: string; deceasedName: string; productLast4: string; institution: string; receivedAt: Date }
export interface CheckOptions { simulateFailure?: CheckKey }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "03 Mar 2026" to a UTC date, or null when it is not in that shape. */
export function parseDate(value: string): Date | null {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  return month < 0 ? null : new Date(Date.UTC(Number(m[3]), month, Number(m[1])));
}
const sameValue = (a: string, b: string) => {
  const da = parseDate(a), db = parseDate(b);
  return da && db ? da.getTime() === db.getTime() : norm(a) === norm(b);
};
const wholeYears = (from: Date, to: Date) => {
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  if (to.getUTCMonth() < from.getUTCMonth() || (to.getUTCMonth() === from.getUTCMonth() && to.getUTCDate() < from.getUTCDate())) years--;
  return years;
};

const field = (doc: CheckDoc, key: string) => doc.fields.find((f) => f.key === key);
const ref = (doc: CheckDoc, key: string): EvidenceRef => ({ kind: "document", documentId: doc.id, fieldKey: key });
const incomplete = (check: CheckKey): CheckResult => ({ check, status: "incomplete", summary: INCOMPLETE_TEXT, findings: [] });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Names, dates, ages and relationships must agree. The claimant's own claim form is the baseline. */
function consistency(docs: CheckDoc[]): CheckResult {
  if (docs.some((d) => !d.readable)) return incomplete("consistency");
  const findings: Finding[] = [];
  const baselineDoc = docs.find((d) => d.kind === "claim_form");
  for (const key of ["deceasedName", "dateOfDeath", "deceasedDob", "claimantName"]) {
    const entries = docs.map((doc) => ({ doc, f: field(doc, key) })).filter((e): e is { doc: CheckDoc; f: CheckField } => !!e.f);
    const base = (baselineDoc && entries.find((e) => e.doc.id === baselineDoc.id)) ?? entries[0];
    if (!base) continue;
    for (const e of entries) {
      if (e.doc.id === base.doc.id || sameValue(e.f.value, base.f.value)) continue;
      findings.push({
        id: `${key}:${e.doc.id}`,
        kind: "mismatch",
        label: `${e.f.label.replace(/ \(as declared\)$/, "")} differs between documents`,
        expected: `${base.f.value} (${base.doc.title})`,
        observed: `${e.f.value} (${e.doc.title})`,
        evidence: [ref(e.doc, key), ref(base.doc, key)],
      });
    }
  }
  const cert = docs.find((d) => d.kind === "death_certificate");
  const dob = cert && field(cert, "deceasedDob"), dod = cert && field(cert, "dateOfDeath"), age = cert && field(cert, "ageAtDeath");
  if (cert && dob && dod && age) {
    const from = parseDate(dob.value), to = parseDate(dod.value);
    if (from && to && wholeYears(from, to) !== Number(age.value)) {
      findings.push({
        id: `age:${cert.id}`, kind: "mismatch", label: "Age at death does not match the dates",
        expected: `${wholeYears(from, to)} years (from ${dob.value} to ${dod.value})`, observed: `${age.value} years`,
        evidence: [ref(cert, "ageAtDeath"), ref(cert, "deceasedDob"), ref(cert, "dateOfDeath")],
      });
    }
  }
  return findings.length
    ? { check: "consistency", status: "flag", summary: `${plural(findings.length, "discrepancy", "discrepancies")} across the documents.`, findings }
    : { check: "consistency", status: "pass", summary: "Names, dates, ages and relationships agree across the documents.", findings };
}

/** Signals only. They say a document deserves a closer look; they never say it is fake. */
function authenticity(docs: CheckDoc[]): CheckResult {
  if (docs.some((d) => !d.readable)) return incomplete("authenticity");
  const findings: Finding[] = [];
  for (const doc of docs) {
    doc.signals.forEach((s, i) => {
      const f = field(doc, s.fieldKey);
      findings.push({
        id: `signal:${doc.id}:${s.fieldKey}:${i}`,
        kind: "signal",
        label: `Possible edit to ${(f?.label ?? s.fieldKey).toLowerCase()} on the ${doc.title.toLowerCase()}`,
        expected: "A field that looks like the rest of the document",
        observed: s.note,
        evidence: [ref(doc, s.fieldKey)],
      });
    });
  }
  const docsWith = new Set(findings.map((f) => f.evidence[0] && f.evidence[0].kind === "document" ? f.evidence[0].documentId : "")).size;
  return findings.length
    ? { check: "authenticity", status: "flag", summary: `${plural(findings.length, "signal", "signals")} on ${plural(docsWith, "document", "documents")}. Signals are not proof.`, findings }
    : { check: "authenticity", status: "pass", summary: "No signs of editing were found in the documents.", findings };
}

/**
 * An earlier claim covers the same product of the same deceased person. Only claims received before this one
 * count, so the first claim is not marked as a duplicate of the one that came after it.
 */
function duplicate(claim: CheckClaim, others: OtherClaim[]): CheckResult {
  const same = others.filter((o) => o.id !== claim.id && o.receivedAt.getTime() < claim.receivedAt.getTime() && o.productLast4 === claim.productLast4 && o.institution === claim.institution && norm(o.deceasedName) === norm(claim.deceasedName));
  const findings: Finding[] = same.map((o) => ({
    id: `duplicate:${o.id}`, kind: "duplicate", label: `Same deceased and product as the earlier claim ${o.code}`,
    expected: "One claim for this product", observed: `Claim ${o.code}, received earlier from ${o.claimantName}, covers the same product (ending ${o.productLast4})`,
    evidence: [{ kind: "claim", claimId: o.id, code: o.code }],
  }));
  return findings.length
    ? { check: "duplicate", status: "flag", summary: `${plural(findings.length, "earlier claim covers", "earlier claims cover")} this product.`, findings }
    : { check: "duplicate", status: "pass", summary: "No earlier claim covers this product.", findings };
}

/** Every document the claim route requires is present. */
function completeness(claim: CheckClaim, docs: CheckDoc[]): CheckResult {
  const have = new Set(docs.map((d) => d.kind));
  const missing = ROUTE_REQUIREMENTS[claim.route].filter((k) => !have.has(k));
  const findings: Finding[] = missing.map((k) => ({
    id: `missing:${k}`, kind: "missing", label: `${DOC_LABEL[k]} is missing`,
    expected: `${DOC_LABEL[k]} (required for: ${ROUTE_LABEL[claim.route]})`, observed: "Not provided",
    evidence: [{ kind: "requirement", docKind: k }],
  }));
  return missing.length
    ? { check: "completeness", status: "flag", summary: `${plural(missing.length, "required document is", "required documents are")} missing.`, findings }
    : { check: "completeness", status: "pass", summary: "Every required document for this claim route is present.", findings };
}

/** All four checks, in order. `simulateFailure` (demo only) makes one check report that it could not finish. */
export function runChecks(claim: CheckClaim, docs: CheckDoc[], others: OtherClaim[], options: CheckOptions = {}): CheckResult[] {
  const results: Record<CheckKey, () => CheckResult> = {
    consistency: () => consistency(docs),
    authenticity: () => authenticity(docs),
    duplicate: () => duplicate(claim, others),
    completeness: () => completeness(claim, docs),
  };
  return CHECKS.map((check) => (options.simulateFailure === check ? incomplete(check) : results[check]()));
}

export { CHECK_LABEL };
