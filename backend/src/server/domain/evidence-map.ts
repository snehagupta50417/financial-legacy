import { createHash } from "node:crypto";
import { db } from "@server/db";
import { canDiscover, canSeeFullAsset } from "@server/core/gate-engine";
import { maskAsset, redactAmounts, redactIdentifiers } from "@server/core/masking";
import { toPaise } from "@server/rules/observations";
import { readSearchResult } from "./guided-search";
import type { EvidenceMap, EvidenceNode } from "@shared/evidence-map";

/** Canonical provenance only. Never infer ownership links from similar names. */
export async function evidenceMap(caseId: string): Promise<EvidenceMap> {
  const c = await db.legacyCase.findUniqueOrThrow({ where: { id: caseId } });
  if (c.frozenReason || !canDiscover(c)) throw new Error("Evidence is locked until case checks are complete.");
  const [assets, docs, claims, events] = await Promise.all([
    db.assetRecord.findMany({ where: { caseId }, include: { observations: { orderBy: { createdAt: "asc" }, take: 100 } }, orderBy: { id: "asc" }, take: 100 }),
    db.documentRecord.findMany({ where: { caseId }, include: { fields: { orderBy: { ordinal: "asc" }, take: 100, include: { history: { orderBy: { createdAt: "asc" }, take: 10 } } } }, orderBy: { id: "asc" }, take: 100 }),
    db.claim.findMany({ where: { caseId }, include: { packs: { orderBy: { version: "desc" }, take: 10 } }, orderBy: { id: "asc" }, take: 100 }),
    db.caseEvent.findMany({ where: { caseId, eventType: { in: ["guided_search", "discovery"] } }, orderBy: { createdAt: "asc" }, take: 200 }),
  ]);
  const nodes: EvidenceNode[] = [{ id: "case:" + c.id, kind: "case", label: "Case evidence", status: c.gateReached }];
  const edges: EvidenceMap["edges"] = [], warnings: EvidenceMap["warnings"] = [];
  const add = (node: EvidenceNode) => nodes.push(node);
  const edge = (from: string, to: string, relation: string) => edges.push({ from, to, relation });
  const clean = (value: string) => redactIdentifiers(value).slice(0, 500);
  let truncated = events.length === 200 || assets.length === 100 || docs.length === 100 || claims.length === 100;
  let fieldBudget = 500, reviewBudget = 250, observationBudget = 500;
  for (const a of assets) {
    const view = maskAsset(c, a), full = canSeeFullAsset(c, a), id = "asset:" + a.id;
    add({ id, kind: "asset", label: clean(view.institution), status: a.evidenceStatus, detail: view.maskedRef ?? undefined, at: a.updatedAt.toISOString(), target: { type: "asset", id: a.id } });
    edge("case:" + c.id, id, "contains");
    if (a.duplicateState === "candidate" && assets.some(other => other.id === a.duplicateOfId)) {
      edge(id, "asset:" + a.duplicateOfId, "possible_duplicate");
      warnings.push({ id: "duplicate:" + a.id, kind: "duplicate", text: "Possible duplicate holding. A person must decide whether to merge it.", nodeIds: [id, "asset:" + a.duplicateOfId] });
    }
    if (a.duplicateState === "merged" && assets.some(other => other.id === a.duplicateOfId)) edge(id, "asset:" + a.duplicateOfId, "merged_into");
    if (a.sourceDocumentId && docs.some(d => d.id === a.sourceDocumentId)) edge("doc:" + a.sourceDocumentId, id, "source_document");
    const currentAmounts = new Map<string, typeof a.observations>();
    truncated ||= a.observations.length === 100;
    for (const o of a.observations) {
      if (observationBudget-- <= 0) { truncated = true; break; }
      const oid = "observation:" + o.id;
      add({ id: oid, kind: "observation", label: clean(o.label), status: o.supersededAt ? "superseded" : o.reviewedAt ? "reviewed" : "unreviewed", detail: full ? `${o.currency} ${o.amount} · ${o.asOfDate ?? "undated"} · ${o.amountType}` : "Amount hidden until authority checks are complete", at: o.createdAt.toISOString() });
      edge(id, oid, "dated_observation");
      if (o.sourceDocumentId && docs.some(d => d.id === o.sourceDocumentId)) edge("doc:" + o.sourceDocumentId, oid, "amount_source");
      if (o.sourceFieldId && docs.some(d => d.fields.some(f => f.id === o.sourceFieldId))) edge("field:" + o.sourceFieldId, oid, "extracted_from");
      if (!o.supersededAt && o.asOfDate) { const key = o.amountType + ":" + o.currency + ":" + o.asOfDate; currentAmounts.set(key, [...(currentAmounts.get(key) ?? []), o]); }
    }
    for (const [key, observations] of currentAmounts) if (new Set(observations.map(o => { try { return toPaise(o.amount).toString(); } catch { return o.amount; } })).size > 1) warnings.push({ id: "conflict:" + a.id + ":" + key, kind: "conflict", text: "Different amounts are recorded for the same holding, date and amount type. Review the source documents; no value was chosen automatically.", nodeIds: observations.map(o => "observation:" + o.id) });
  }
  const living = ["living_individual", "estate_planning"].includes(c.caseType);
  for (const d of docs) {
    const linked = assets.filter(a => a.sourceDocumentId === d.id || a.observations.some(o => o.sourceDocumentId === d.id));
    const full = living || (linked.length > 0 && linked.every(a => canSeeFullAsset(c, a)));
    const display = (value: string) => full ? clean(value) : redactAmounts(clean(value));
    add({ id: "doc:" + d.id, kind: "document", label: display(d.fileName), status: d.extractionStatus, at: d.updatedAt.toISOString(), target: { type: "doc", id: d.id } });
    edge("case:" + c.id, "doc:" + d.id, "uploaded_record");
    truncated ||= d.fields.length === 100;
    for (const f of d.fields) {
      if (fieldBudget-- <= 0) { truncated = true; break; }
      const id = "field:" + f.id;
      add({ id, kind: "field", label: clean(f.label), status: f.state, detail: full ? display(f.value) : "Value protected; review is still recorded", excerpt: full ? display(f.sourceExcerpt).slice(0, 300) : undefined, at: f.updatedAt.toISOString(), target: { type: "doc", id: d.id } });
      edge("doc:" + d.id, id, "extracted_field");
      if (f.critical && f.state === "proposed") warnings.push({ id: "unreviewed:" + f.id, kind: "unreviewed", text: "A critical extracted field has not been reviewed. Check it against its source before approval.", nodeIds: [id] });
      if (f.critical && f.state === "rejected") warnings.push({ id: "rejected:" + f.id, kind: "rejected", text: "A critical extracted field was rejected. Review the document before relying on it.", nodeIds: [id] });
      truncated ||= f.history.length === 10;
      for (const h of f.history) {
        if (reviewBudget-- <= 0) { truncated = true; break; }
        add({ id: "review:" + h.id, kind: "review", label: h.toState === "corrected" ? "User correction" : "User review", status: h.toState, detail: full ? display(h.fromValue) + " → " + display(h.toValue) : "Review values protected", at: h.createdAt.toISOString() });
        edge(id, "review:" + h.id, "review_history");
      }
    }
  }
  for (const event of events) {
    const result = readSearchResult(event.description); if (!result) continue;
    add({ id: "search:" + result.id, kind: "search", label: clean(result.sourceName), status: result.outcome, detail: "Self-reported official search; does not establish ownership", at: result.searchedAt, target: { type: "plan" } });
    edge("case:" + c.id, "search:" + result.id, "recorded_search");
  }
  for (const claim of claims) {
    truncated ||= claim.packs.length === 10;
    const id = "claim:" + claim.id;
    add({ id, kind: "claim", label: "Claim", status: claim.status, at: claim.updatedAt.toISOString(), target: { type: "claim", id: claim.id } });
    if (assets.some(a => a.id === claim.assetId)) edge("asset:" + claim.assetId, id, "claim_for");
    for (const pack of claim.packs) {
      add({ id: "pack:" + pack.id, kind: "pack", label: "Claim package v" + pack.version, status: pack.status, detail: "Content hash: " + pack.contentHash, at: pack.createdAt.toISOString(), target: { type: "claim", id: claim.id } });
      edge(id, "pack:" + pack.id, "prepared_package");
    }
    try { for (const entry of Object.values(JSON.parse(claim.checklist)) as { documentId?: string }[]) if (entry.documentId && docs.some(d => d.id === entry.documentId)) edge("doc:" + entry.documentId, id, "claim_requirement"); } catch { /* Invalid legacy checklist creates no links. */ }
  }
  const ids = new Set(nodes.map(n => n.id));
  const visibleEdges = edges.filter(e => ids.has(e.from) && ids.has(e.to));
  const fingerprint = createHash("sha256").update(JSON.stringify({ nodes, edges: visibleEdges, warnings })).digest("hex");
  return { caseId, generatedAt: new Date().toISOString(), fingerprint, nodes, edges: visibleEdges, warnings, truncated };
}
