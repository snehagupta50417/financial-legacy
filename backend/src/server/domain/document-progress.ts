import type { DocumentProgress } from "@shared/document-progress";
import { db } from "@server/db";
import { canDiscover, journeyKind } from "@server/core/gate-engine";
import { documentSupports } from "@server/rules/evidence";
import { editClaim, refreshClaim, startClaim } from "./claim-service";

/** Uses canonical reviewed sources; preparation never stands in for institution verification. */
export async function documentProgress(documentId: string, prepare = false, preferredAssetId?: string): Promise<DocumentProgress> {
  const doc = await db.documentRecord.findUniqueOrThrow({ where: { id: documentId }, include: { fields: true, case: true } });
  if (doc.case.frozenReason || !canDiscover(doc.case)) throw new Error("Case checks must be completed first");
  const extracted = doc.extractionStatus === "extracted";
  const pending = doc.fields.filter(f => f.critical && f.state === "proposed");
  const rejected = doc.fields.filter(f => f.critical && f.state === "rejected");
  const supported = documentSupports(doc.fields);
  const assets = await db.assetRecord.findMany({ where: { caseId: doc.caseId, sourceDocumentId: doc.id, discoveryStatus: { not: "dismissed" }, OR: [{ duplicateState: null }, { duplicateState: { not: "merged" } }] }, orderBy: { createdAt: "asc" } });
  // A single source can identify several holdings. Each confirmed holding gets
  // its own draft; an asset action keeps its response focused on that holding.
  if (prepare && !preferredAssetId && assets.length > 1) {
    for (const linked of assets.filter(a => a.discoveryStatus === "confirmed")) await documentProgress(documentId, true, linked.id);
  }
  const asset = assets.find(a => a.id === preferredAssetId) ?? assets.find(a => a.discoveryStatus === "confirmed") ?? assets[0];
  const matched = !!asset && asset.discoveryStatus === "confirmed" && supported && ["document_backed", "institution_verified"].includes(asset.evidenceStatus);
  const deathCase = doc.case.holderLiving === false && journeyKind(doc.case.caseType) !== "personal";
  let claim = asset ? await db.claim.findFirst({ where: { caseId: doc.caseId, assetId: asset.id } }) : null;
  if (prepare && matched && deathCase && !pending.length && !rejected.length) claim = await startClaim(doc.caseId, asset!.id);
  let view = claim ? await refreshClaim(claim.id) : null;
  if (prepare && matched && view?.entitled && ["draft", "authority_review", "document_collection", "pack_review", "ready_for_submission"].includes(view.status) && doc.category === "policy_document" && supported && !rejected.length && view.pack?.items.some(i => i.id === "lic-policy" && i.state === "missing")) {
    view = await editClaim(view.id, { checklist: { "lic-policy": { state: "linked", documentId: doc.id } } });
  }
  const preSubmission = !view || ["draft", "authority_review", "document_collection", "pack_review", "ready_for_submission"].includes(view.status);
  const next: DocumentProgress["next"] = !extracted || pending.length || !supported || rejected.length ? { type: "doc", id: doc.id, label: "Review document details" } : !asset ? { type: "doc", id: doc.id, label: "Review the source and matching holding" } : !matched ? { type: "asset", id: asset.id, label: "Confirm this holding" } : view ? { type: "claim", id: view.id, label: !preSubmission ? "View claim progress" : view.entitled ? "Review claim requirements" : "Review authority evidence" } : { type: "asset", id: asset.id, label: deathCase ? "Prepare claim checks" : "Review the holding" };
  const summary = !extracted ? "I couldn't finish reading this document. Replace or retry it." : pending.length ? `I read the document. Review ${pending.length} critical detail${pending.length === 1 ? "" : "s"} before I can use it as evidence.` : rejected.length || !supported ? "The reviewed document does not yet provide usable holding evidence. Check the rejected or missing details." : !asset ? "I read the document, but no specific holding is linked to this source yet." : !matched ? "The document is reviewed. Confirm that the potential holding belongs in this case." : !deathCase ? "The holding is document-backed. Continue with your planning steps; no death claim is needed." : !view ? "The holding is document-backed and ready for claim preparation." : !preSubmission ? `This holding has an existing claim (${view.status.replaceAll("_", " ")}). Follow its recorded updates; reviewing this source does not restart it.` : !view.entitled ? "I prepared a claim draft. Authority evidence is still needed before a complete package can be prepared." : view.pack?.ready ? "The claim package is prepared for your review and approval." : `I prepared the claim draft. ${view.pack?.items.filter(i => i.required && i.state === "missing").length ?? 0} required document(s) still need attention, along with your declarations.`;
  return { summary, next, ...(view ? { claimId: view.id } : {}), steps: [
    { key: "read", label: "Read the document", state: extracted ? "done" : "action", detail: extracted ? "Extracted details retain their source excerpts." : "A readable source is required." },
    { key: "review", label: "Review source details", state: supported && !rejected.length ? "done" : "action", detail: pending.length ? pending.map(f => f.label).join(", ") : rejected.length ? "Rejected critical details need correction or replacement evidence." : supported ? "Reviewed evidence supports the holding." : "Critical details need a review decision." },
    { key: "match", label: "Confirm the holding", state: matched ? "done" : "waiting", detail: matched ? "Document-backed; confirmed by you." : asset ? "A potential match needs your confirmation." : "No linked holding was identified." },
    { key: "authority", label: "Check authority to claim", state: !deathCase ? "done" : view?.entitled ? "done" : "waiting", detail: !deathCase ? "Not a death-claim journey." : view?.entitled ? "Recorded authority check satisfied. Simulated providers are not real institution verification." : "Nominee, joint-holder or legal-heir evidence must be checked." },
    { key: "prepare", label: "Prepare the claim package", state: !deathCase || view?.pack?.ready ? "done" : "waiting", detail: !deathCase ? "Continue with personal planning." : view?.pack?.ready ? "Your approval and self-submission are still required." : "Missing documents and declarations remain visible in the claim." },
    { key: "institution", label: "Institution verification", state: asset?.evidenceStatus === "institution_verified" ? "done" : "external", detail: asset?.evidenceStatus === "institution_verified" ? "Institution verification is recorded for this holding. Claim decisions remain with the institution." : "The bank or insurer verifies ownership and decides the claim. Keeper does not perform this external check." },
  ] };
}
