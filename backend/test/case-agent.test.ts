import { afterEach, expect, it, vi } from "vitest";
import { db } from "@server/db";
import { advanceCaseAgent, pauseCaseAgent, reconcileCaseAgent, startCaseAgent } from "@server/domain/case-agent";
import { GET, POST } from "@api/cases/[id]/agent-work/route";
import * as evidence from "@server/domain/evidence-map";
afterEach(() => vi.restoreAllMocks());
async function fixture() {
  const sid = "synthetic-agent-" + crypto.randomUUID(); await db.session.create({ data: { id: sid } });
  const c = await db.legacyCase.create({ data: { sessionId: sid, caseType: "family_death", holderLiving: false, summary: "Synthetic case", gateReached: "G3" } });
  const doc = await db.documentRecord.create({ data: { caseId: c.id, fileName: "Synthetic policy.txt", fileType: "text/plain", extractionStatus: "extracted", isSynthetic: true } });
  await db.documentField.create({ data: { documentId: doc.id, ordinal: 0, label: "Insurer", proposedValue: "LIC", value: "LIC", sourceExcerpt: "Synthetic LIC", critical: true, state: "proposed" } });
  const asset = await db.assetRecord.create({ data: { caseId: c.id, institution: "LIC of India", category: "insurance", sourceDocumentId: doc.id, discoveryStatus: "confirmed", evidenceStatus: "document_backed", entitled: true, nomineeStatus: "recorded" } });
  const claim = await db.claim.create({ data: { caseId: c.id, assetId: asset.id, situation: JSON.stringify({ nominee: "recorded" }) } });
  return { sid, c, claim, doc };
}
it("prepares saved drafts without accepting evidence, approving or submitting", async () => {
  const f = await fixture(); const run = await startCaseAgent(f.c.id); expect((await startCaseAgent(f.c.id)).id).toBe(run.id);
  for (let i = 0; i < 4; i++) await advanceCaseAgent(f.c.id);
  const saved = await db.caseAgentRun.findUniqueOrThrow({ where: { caseId: f.c.id } });
  expect(saved.status).toBe("waiting_user"); expect(saved.cursor).toBe(4); expect(JSON.parse(saved.receipts)).toHaveLength(4);
  expect(await db.claimPack.count({ where: { claimId: f.claim.id } })).toBeGreaterThan(0);
  expect((await db.claim.findUniqueOrThrow({ where: { id: f.claim.id } })).submittedAt).toBeNull();
  expect(await db.approval.count({ where: { pack: { claimId: f.claim.id } } })).toBe(0);
  expect((await db.documentField.findFirstOrThrow({ where: { documentId: f.doc.id } })).state).toBe("proposed");
});
it("resumes a paused cursor and recovers an expired lease", async () => {
  const f = await fixture(); await startCaseAgent(f.c.id); await advanceCaseAgent(f.c.id); const paused = await pauseCaseAgent(f.c.id);
  await advanceCaseAgent(f.c.id); expect((await db.caseAgentRun.findUniqueOrThrow({ where: { caseId: f.c.id } })).cursor).toBe(1);
  expect((await startCaseAgent(f.c.id, paused!.revision)).cursor).toBe(1);
  await db.caseAgentRun.update({ where: { caseId: f.c.id }, data: { leaseToken: "expired", leaseUntil: new Date(0) } });
  await advanceCaseAgent(f.c.id); expect((await db.caseAgentRun.findUniqueOrThrow({ where: { caseId: f.c.id } })).cursor).toBe(2);
});
it("checks case holds and session ownership", async () => {
  const f = await fixture(); await startCaseAgent(f.c.id); await db.legacyCase.update({ where: { id: f.c.id }, data: { frozenReason: "Synthetic hold" } });
  await advanceCaseAgent(f.c.id); const run = await db.caseAgentRun.findUniqueOrThrow({ where: { caseId: f.c.id } }); expect(run.status).toBe("waiting_user"); expect(run.cursor).toBe(0);
  const params = { params: Promise.resolve({ id: f.c.id }) };
  expect((await GET(new Request("http://localhost", { headers: { "x-session-id": "synthetic-other" } }), params)).status).toBe(404);
  expect((await POST(new Request("http://localhost", { method: "POST", headers: { "x-session-id": "synthetic-other" } }), params)).status).toBe(404);
});
it("bounds retries at the failed checkpoint without exposing internal errors", async () => {
  const f = await fixture(); await startCaseAgent(f.c.id); vi.spyOn(evidence, "evidenceMap").mockRejectedValue(new Error("private detail"));
  await advanceCaseAgent(f.c.id); await advanceCaseAgent(f.c.id); await advanceCaseAgent(f.c.id);
  const run = await db.caseAgentRun.findUniqueOrThrow({ where: { caseId: f.c.id } }); expect(run.status).toBe("failed"); expect(run.attempts).toBe(3); expect(run.cursor).toBe(0); expect(run.error).not.toContain("private detail");
});
it("continues an existing delegation after evidence changes, but never restarts a paused run", async () => {
  const f = await fixture(); await startCaseAgent(f.c.id);
  for (let i = 0; i < 4; i++) await advanceCaseAgent(f.c.id);
  const original = await db.caseAgentRun.findUniqueOrThrow({ where: { caseId: f.c.id } });
  expect((await reconcileCaseAgent(f.c.id))!.revision).toBe(original.revision);
  await db.documentField.updateMany({ where: { documentId: f.doc.id }, data: { state: "accepted" } });
  const resumed = await reconcileCaseAgent(f.c.id); expect(resumed!.revision).toBe(original.revision + 1); expect(resumed!.status).toBe("queued");
  await pauseCaseAgent(f.c.id);
  expect((await reconcileCaseAgent(f.c.id))!.status).toBe("paused");
});
it("lets a user pause while waiting for review and preserves that choice after edits", async () => {
  const f = await fixture(); await startCaseAgent(f.c.id);
  for (let i = 0; i < 4; i++) await advanceCaseAgent(f.c.id);
  expect((await pauseCaseAgent(f.c.id))!.status).toBe("paused");
  await db.documentField.updateMany({ where: { documentId: f.doc.id }, data: { state: "accepted" } });
  const paused = await reconcileCaseAgent(f.c.id); expect(paused!.status).toBe("paused");
  const restarted = await startCaseAgent(f.c.id, paused!.revision); expect(restarted.cursor).toBe(0); expect(restarted.revision).toBe(paused!.revision + 1);
});
