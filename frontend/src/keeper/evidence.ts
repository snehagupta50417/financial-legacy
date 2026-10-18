import type { EvidenceMap } from "@shared/evidence-map";
import type { Case } from "./types";
/** Browser-only examples are explicitly simulated; canonical cases use the evidence API. */
export function exampleEvidence(c: Case): EvidenceMap {
  const nodes: EvidenceMap["nodes"] = [], edges: EvidenceMap["edges"] = [], warnings: EvidenceMap["warnings"] = [];
  for (const a of c.assets) {
    nodes.push({ id: "asset:" + a.id, kind: "asset", label: a.institution, status: a.evidence, detail: a.ref ?? undefined, target: { type: "asset", id: a.id } });
    for (const id of a.docIds) if (c.docs.some(d => d.id === id)) edges.push({ from: "doc:" + id, to: "asset:" + a.id, relation: "source_document" });
    if (a.duplicateOf) warnings.push({ id: "dup:" + a.id, kind: "duplicate", text: "Possible duplicate; needs your review.", nodeIds: ["asset:" + a.id] });
  }
  for (const d of c.docs) {
    nodes.push({ id: "doc:" + d.id, kind: "document", label: d.name, status: d.state, target: { type: "doc", id: d.id } });
    for (const f of d.fields) { nodes.push({ id: "field:" + f.id, kind: "field", label: f.label, status: f.corrected ? "corrected" : f.reviewed ? "accepted" : "proposed", detail: f.value, excerpt: f.excerpt, target: { type: "doc", id: d.id } }); edges.push({ from: "doc:" + d.id, to: "field:" + f.id, relation: "extracted_field" }); }
  }
  for (const claim of c.claims) { nodes.push({ id: "claim:" + claim.id, kind: "claim", label: "Claim", status: claim.outcome?.kind ?? (claim.submitted ? "submitted_preview" : "draft"), target: { type: "claim", id: claim.id } }); edges.push({ from: "asset:" + claim.assetId, to: "claim:" + claim.id, relation: "claim_for" }); }
  return { caseId: c.id, generatedAt: new Date().toISOString(), fingerprint: "simulated", truncated: false, nodes, edges, warnings };
}
