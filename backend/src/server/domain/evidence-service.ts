import type { AssetRecord, DocumentField, Prisma } from "@prisma/client";
import { db } from "@server/db";
import { isCriticalField } from "@shared/field-review";
import { last4Of, redactIdentifiers } from "@server/core/masking";
import { deriveEvidenceStatus } from "@server/rules/evidence";
import { findDuplicate } from "@server/rules/duplicates";
import { holdingForAmount, observationsFromFields } from "@server/rules/observations";
import { logEvent } from "./case-service";

/**
 * Applies the evidence rules (src/server/rules) to stored records: document
 * fields and their review history, holding evidence status, dated amounts and
 * duplicate review. Route handlers call these; they never set statuses directly.
 */

type ProposedField = { label: string; value: string; confidence: number; sourceExcerpt: string };

/** Store each extracted value as a reviewable field. Identifiers are redacted before storage. */
export async function createDocumentFields(documentId: string, fields: ProposedField[]) {
  if (!fields.length) return;
  await db.documentField.createMany({
    data: fields.map((f, i) => {
      const value = redactIdentifiers(String(f.value ?? "")).slice(0, 500);
      return {
        documentId,
        ordinal: i,
        label: String(f.label).slice(0, 120),
        proposedValue: value,
        value,
        confidence: typeof f.confidence === "number" ? f.confidence : 0.5,
        sourceExcerpt: redactIdentifiers(String(f.sourceExcerpt ?? "")).slice(0, 300),
        critical: isCriticalField(String(f.label)),
      };
    }),
  });
}

/** Older documents stored fields only as JSON: give them reviewable rows once. */
export async function ensureDocumentFields(doc: { id: string; extractedFields: string | null; userVerified: boolean }) {
  const count = await db.documentField.count({ where: { documentId: doc.id } });
  if (count) return;
  let fields: ProposedField[] = [];
  try {
    const v = doc.extractedFields ? JSON.parse(doc.extractedFields) : [];
    fields = Array.isArray(v) ? v.filter((f) => f && typeof f.label === "string") : [];
  } catch {
    fields = [];
  }
  await createDocumentFields(doc.id, fields);
  // A document already marked reviewed as a whole keeps that: every field accepted.
  if (doc.userVerified && fields.length) {
    await db.documentField.updateMany({ where: { documentId: doc.id }, data: { state: "accepted", reviewedBy: "legacy-review" } });
  }
}

export interface ReviewDecision {
  fieldId: string;
  decision: "accepted" | "corrected" | "rejected";
  value?: string;
  reason?: string;
}

export interface ReviewResult {
  changed: string[];
  complete: boolean;
}

/**
 * Record decisions on a document's fields. Each change keeps who, when, why and
 * the previous version (FL-26). Re-sending the same decision changes nothing.
 */
export async function applyReview(documentId: string, decisions: ReviewDecision[], actor: string): Promise<ReviewResult> {
  const fields = await db.documentField.findMany({ where: { documentId } });
  const byId = new Map(fields.map((f) => [f.id, f]));
  const changed: string[] = [];
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const d of decisions) {
    const f = byId.get(d.fieldId);
    if (!f) throw new ReviewError(`Unknown field ${d.fieldId}`);
    let toValue = f.proposedValue;
    let toState: string = d.decision;
    if (d.decision === "corrected") {
      const v = redactIdentifiers((d.value ?? "").trim()).slice(0, 500);
      if (!v) throw new ReviewError(`A correction for "${f.label}" needs a value`);
      // A "correction" back to what was proposed is an acceptance.
      if (v === f.proposedValue) toState = "accepted";
      else toValue = v;
    }
    if (d.decision === "rejected") toValue = f.value;
    if (toState === f.state && toValue === f.value) continue;
    const reason = d.reason?.trim().slice(0, 300) || null;
    changed.push(f.id);
    ops.push(
      db.documentField.update({
        where: { id: f.id },
        data: { state: toState, value: toValue, reason, reviewedAt: new Date(), reviewedBy: actor },
      }),
      db.fieldReviewEvent.create({
        data: { fieldId: f.id, fromState: f.state, toState, fromValue: f.value, toValue, reason, actor },
      })
    );
  }
  if (ops.length) await db.$transaction(ops);

  const after = await db.documentField.findMany({ where: { documentId } });
  const complete = after.length > 0 && after.every((f) => f.state !== "proposed");
  await db.documentRecord.update({ where: { id: documentId }, data: { userVerified: complete } });
  await refreshDocumentEvidence(documentId, actor);
  return { changed, complete };
}

export class ReviewError extends Error {}

/** Holdings this document is evidence for (merged duplicates are represented by their survivor). */
async function holdingsFor(documentId: string) {
  return db.assetRecord.findMany({
    where: { sourceDocumentId: documentId, discoveryStatus: { not: "dismissed" } },
  });
}

/** Re-derive one holding's evidence status from its own and any merged duplicates' documents. */
export async function refreshAssetEvidence(asset: AssetRecord): Promise<string> {
  const merged = await db.assetRecord.findMany({
    where: { duplicateOfId: asset.id, duplicateState: "merged" },
    select: { sourceDocumentId: true },
  });
  const docIds = [asset.sourceDocumentId, ...merged.map((m) => m.sourceDocumentId)].filter((x): x is string => !!x);
  const statuses: string[] = [];
  for (const docId of docIds.length ? docIds : [null]) {
    const fields = docId ? await db.documentField.findMany({ where: { documentId: docId } }) : null;
    statuses.push(deriveEvidenceStatus({ current: asset.evidenceStatus, discoveryStatus: asset.discoveryStatus, linkedDocument: fields }));
  }
  const order = ["potential_match", "self_declared", "document_backed", "institution_verified"];
  const next = statuses.sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];
  if (next !== asset.evidenceStatus) {
    await db.assetRecord.update({ where: { id: asset.id }, data: { evidenceStatus: next } });
    await logEvent(asset.caseId, "asset", `${asset.institution}: evidence is now "${next.replace(/_/g, " ")}"`, "system", asset.id);
  }
  // A merged duplicate's survivor may change too.
  if (asset.duplicateState === "merged" && asset.duplicateOfId) {
    const survivor = await db.assetRecord.findUnique({ where: { id: asset.duplicateOfId } });
    if (survivor) await refreshAssetEvidence(survivor);
  }
  return next;
}

/**
 * After a review: update the evidence status of every holding the document
 * backs, and keep its dated amounts in step — new or corrected values add an
 * observation and supersede the old one; rejected values supersede theirs.
 */
export async function refreshDocumentEvidence(documentId: string, actor: string) {
  const [fields, holdings] = await Promise.all([db.documentField.findMany({ where: { documentId } }), holdingsFor(documentId)]);
  for (const h of holdings) await refreshAssetEvidence(h);
  if (!holdings.length) return;

  const proposed = observationsFromFields(fields);
  const active = await db.observation.findMany({ where: { sourceDocumentId: documentId, supersededAt: null } });
  const now = new Date();
  const keep = new Set<string>();
  for (const p of proposed) {
    const field = fields.find((f) => f.id === p.sourceFieldId) as DocumentField;
    const assetId = holdingForAmount(field, holdings, fields);
    if (!assetId) continue; // unclear which holding: don't guess
    const same = active.find(
      (o) =>
        o.sourceFieldId === p.sourceFieldId &&
        o.assetId === assetId &&
        o.amount === p.amount &&
        o.amountType === p.amountType &&
        o.asOfDate === p.asOfDate
    );
    if (same) {
      keep.add(same.id);
      continue;
    }
    const created = await db.observation.create({
      data: {
        assetId,
        amount: p.amount,
        currency: p.currency,
        amountType: p.amountType,
        asOfDate: p.asOfDate,
        label: p.label,
        sourceDocumentId: documentId,
        sourceFieldId: p.sourceFieldId,
        reviewedAt: now,
        reviewedBy: actor,
      },
    });
    keep.add(created.id);
  }
  const stale = active.filter((o) => !keep.has(o.id)).map((o) => o.id);
  if (stale.length) await db.observation.updateMany({ where: { id: { in: stale } }, data: { supersededAt: now } });

  // A checked "Nominee" field is the holding's nominee information (FL-09).
  for (const f of fields) {
    if (!/nominee/i.test(f.label) || (f.state !== "accepted" && f.state !== "corrected")) continue;
    const assetId = holdingForAmount(f, holdings, fields);
    if (!assetId) continue;
    const none = /not\s*registered|no\s*nominee|\bnone\b|\bnil\b|not\s*available/i.test(f.value);
    await db.assetRecord.update({ where: { id: assetId }, data: { nomineeStatus: none ? "none" : "recorded" } });
  }
}

export interface ClueInput {
  category: string;
  institution: string;
  reference: string | null;
  holderName: string | null;
  evidence: string;
  confidence: number;
}

/**
 * Add a holding suggested by a document as a potential match. If one already
 * exists with the same institution, type and last 4 digits, the new one is
 * flagged as a possible duplicate for the person to review — never merged.
 */
export async function addClue(caseId: string, documentId: string, clue: ClueInput) {
  const last4 = last4Of(clue.reference);
  const existing = await db.assetRecord.findMany({
    where: { caseId },
    select: { id: true, institution: true, category: true, last4: true, discoveryStatus: true, duplicateState: true },
  });
  const dup = findDuplicate({ institution: clue.institution, category: clue.category, last4 }, existing);
  const asset = await db.assetRecord.create({
    data: {
      caseId,
      category: clue.category,
      institution: clue.institution,
      maskedRef: clue.reference ? redactIdentifiers(clue.reference) : null,
      last4,
      holderName: clue.holderName,
      evidence: clue.evidence,
      sourceDocumentId: documentId,
      confidence: clue.confidence,
      discoveryStatus: "possible",
      evidenceStatus: "potential_match",
      duplicateOfId: dup?.id ?? null,
      duplicateState: dup ? "candidate" : null,
    },
  });
  return { asset, duplicateOf: dup };
}

export type AssetAction = "confirm" | "dismiss" | "reopen" | "same_holding" | "different_holding" | "undo_merge";

/** User actions on a holding. Returns the event text, or throws ReviewError when the action doesn't apply. */
export async function applyAssetAction(asset: AssetRecord, action: AssetAction): Promise<string> {
  const data: Partial<AssetRecord> = {};
  let event: string;
  switch (action) {
    case "confirm":
      data.discoveryStatus = "confirmed";
      event = `User confirmed holding: ${asset.institution}`;
      break;
    case "dismiss":
      data.discoveryStatus = "dismissed";
      event = `User dismissed holding: ${asset.institution} (not relevant)`;
      break;
    case "reopen":
      data.discoveryStatus = "possible";
      event = `User re-opened holding: ${asset.institution}`;
      break;
    case "same_holding":
      if (asset.duplicateState !== "candidate" || !asset.duplicateOfId) throw new ReviewError("This holding isn't marked as a possible duplicate");
      data.duplicateState = "merged";
      event = `User said ${asset.institution} is the same holding as an existing one — merged (evidence kept, can be undone)`;
      break;
    case "different_holding":
      if (asset.duplicateState !== "candidate") throw new ReviewError("This holding isn't marked as a possible duplicate");
      data.duplicateState = "distinct";
      event = `User said ${asset.institution} is a different holding — kept separate`;
      break;
    case "undo_merge":
      if (asset.duplicateState !== "merged") throw new ReviewError("This holding wasn't merged");
      data.duplicateState = "candidate";
      event = `User undid the merge of ${asset.institution} — back to review`;
      break;
  }
  const updated = await db.assetRecord.update({ where: { id: asset.id }, data });
  await refreshAssetEvidence(updated);
  if (updated.duplicateOfId && action !== "confirm" && action !== "dismiss" && action !== "reopen") {
    const survivor = await db.assetRecord.findUnique({ where: { id: updated.duplicateOfId } });
    if (survivor) await refreshAssetEvidence(survivor);
  }
  await logEvent(asset.caseId, "asset", event, "user", asset.id);
  return event;
}

/** One-time upgrade of rows created before evidence statuses existed. */
export async function backfillCase(caseId: string) {
  const assets = await db.assetRecord.findMany({ where: { caseId } });
  for (const a of assets) {
    const stale =
      (a.discoveryStatus === "possible" && a.evidenceStatus !== "potential_match" && a.evidenceStatus !== "institution_verified") ||
      (a.discoveryStatus === "confirmed" && a.evidenceStatus === "potential_match");
    if (stale) await refreshAssetEvidence(a);
  }
  const docs = await db.documentRecord.findMany({
    where: { caseId, extractionStatus: "extracted", fields: { none: {} } },
    select: { id: true, extractedFields: true, userVerified: true },
  });
  for (const d of docs) await ensureDocumentFields(d);
}
