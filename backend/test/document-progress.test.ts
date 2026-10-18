import { describe, expect, it } from "vitest";
import { db } from "@server/db";
import { documentProgress } from "@server/domain/document-progress";
import { refreshClaim } from "@server/domain/claim-service";

describe("document to claim continuity", () => {
  it("requires review and confirmation, then prepares one draft without approving or submitting", async () => {
    const sid = "synthetic-progress-" + crypto.randomUUID();
    await db.session.create({ data: { id: sid } });
    const c = await db.legacyCase.create({ data: { sessionId: sid, caseType: "family_death", holderLiving: false, summary: "Synthetic estate", gateReached: "G3" } });
    const d = await db.documentRecord.create({ data: { caseId: c.id, fileName: "Synthetic policy.txt", fileType: "text/plain", category: "policy_document", extractionStatus: "extracted", isSynthetic: true } });
    const f = await db.documentField.create({ data: { documentId: d.id, ordinal: 0, label: "Policy reference", proposedValue: "SYNTHETIC1234", value: "SYNTHETIC1234", critical: true, state: "proposed" } });
    const a = await db.assetRecord.create({ data: { caseId: c.id, institution: "LIC of India", category: "insurance", sourceDocumentId: d.id, discoveryStatus: "potential", evidenceStatus: "potential_match" } });
    expect((await documentProgress(d.id, true)).next.type).toBe("doc");
    expect(await db.claim.count({ where: { caseId: c.id } })).toBe(0);
    await db.documentField.update({ where: { id: f.id }, data: { state: "accepted" } });
    expect((await documentProgress(d.id, true)).next.type).toBe("asset");
    expect(await db.claim.count({ where: { caseId: c.id } })).toBe(0);
    await db.assetRecord.update({ where: { id: a.id }, data: { discoveryStatus: "confirmed", evidenceStatus: "document_backed" } });
    const ready = await documentProgress(d.id, true);
    expect(ready.claimId).toBeTruthy();
    expect(ready.steps.find(s => s.key === "authority")?.state).toBe("waiting");
    await Promise.all([documentProgress(d.id, true), documentProgress(d.id, true)]);
    expect(await db.claim.count({ where: { caseId: c.id } })).toBe(1);
    const claim = await db.claim.findUniqueOrThrow({ where: { id: ready.claimId! } });
    expect(claim.submittedAt).toBeNull();
    expect(await db.approval.count({ where: { pack: { claimId: claim.id } } })).toBe(0);
    expect((await db.assetRecord.findUniqueOrThrow({ where: { id: a.id } })).entitled).toBe(false);
    await db.assetRecord.update({ where: { id: a.id }, data: { entitled: true, nomineeStatus: "recorded" } });
    await documentProgress(d.id, true);
    const view = await refreshClaim(claim.id);
    expect(view.pack?.items.find(i => i.id === "lic-policy")?.state).toBe("linked");
    expect(view.pack?.ready).toBe(false);
    expect(view.pack?.declarations.every(d => !d.accepted)).toBe(true);
  });

  it("does not promote rejected critical evidence", async () => {
    const sid = "synthetic-rejected-" + crypto.randomUUID();
    await db.session.create({ data: { id: sid } });
    const c = await db.legacyCase.create({ data: { sessionId: sid, caseType: "family_death", holderLiving: false, summary: "Synthetic estate", gateReached: "G3" } });
    const d = await db.documentRecord.create({ data: { caseId: c.id, fileName: "Synthetic rejected.txt", fileType: "text/plain", extractionStatus: "extracted", isSynthetic: true } });
    await db.documentField.create({ data: { documentId: d.id, ordinal: 0, label: "Policy reference", proposedValue: "SYNTHETIC1234", value: "SYNTHETIC1234", critical: true, state: "rejected" } });
    await db.assetRecord.create({ data: { caseId: c.id, institution: "LIC of India", category: "insurance", sourceDocumentId: d.id, discoveryStatus: "confirmed", evidenceStatus: "document_backed" } });
    const progress = await documentProgress(d.id, true);
    expect(progress.next.type).toBe("doc");
    expect(progress.claimId).toBeUndefined();
    expect(await db.claim.count({ where: { caseId: c.id } })).toBe(0);
  });
});
