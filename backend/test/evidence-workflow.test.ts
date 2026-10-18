// FL-06/07/10/12/14/26/28/37: synthetic evidence, restart recovery and human approval boundaries.
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@server/db";
import { evidenceMap } from "@server/domain/evidence-map";
import { advanceWorkflow, ensureWorkflow, restartWorkflow, workflowView } from "@server/domain/claim-workflow";
import { GET as getEvidence } from "@api/cases/[id]/evidence/route";
import { POST as createJob } from "@api/claims/[id]/workflow/route";
import { POST as advance } from "@api/workflows/[id]/advance/route";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (sid: string) => new Request("http://localhost/api/test", { method: "POST", headers: { "x-session-id": sid, "content-type": "application/json" }, body: "{}" });
afterEach(() => vi.restoreAllMocks());
async function fixture(entitled = true) {
  const sid = "synthetic-evidence-" + crypto.randomUUID(); await db.session.create({ data: { id: sid } });
  const c = await db.legacyCase.create({ data: { sessionId: sid, caseType: "family_death", holderLiving: false, summary: "Synthetic estate", gateReached: "G3" } });
  const doc = await db.documentRecord.create({ data: { caseId: c.id, fileName: "Synthetic policy.txt", fileType: "text/plain", extractionStatus: "extracted", isSynthetic: true } });
  const asset = await db.assetRecord.create({ data: { caseId: c.id, institution: "LIC of India", category: "insurance", sourceDocumentId: doc.id, discoveryStatus: "confirmed", evidenceStatus: "document_backed", entitled, nomineeStatus: "recorded" } });
  const field = await db.documentField.create({ data: { documentId: doc.id, ordinal: 0, label: "Policy reference", proposedValue: "123456789012", value: "123456789012", sourceExcerpt: "Synthetic reference 123456789012", critical: true, state: "corrected" } });
  await db.fieldReviewEvent.create({ data: { fieldId: field.id, fromState: "proposed", toState: "corrected", fromValue: "Old synthetic value", toValue: "123456789012", actor: sid } });
  const claim = await db.claim.create({ data: { caseId: c.id, assetId: asset.id, situation: JSON.stringify({ nominee: "recorded" }) } });
  return { sid, c, doc, asset, field, claim };
}
describe("canonical evidence map", () => {
  it("includes recorded guided searches without treating them as verified ownership", async () => {
    const f = await fixture(); const id = crypto.randomUUID();
    const result = { id, caseId: f.c.id, taskId: "synthetic-task", sourceUrl: "https://example.gov.in/search", sourceName: "Synthetic official source", outcome: "possible_match", scope: "Synthetic limited search", searchedAt: new Date().toISOString(), recordedAt: new Date().toISOString(), evidenceNote: "Synthetic only", summary: "Possible match", selfReported: true };
    await db.caseEvent.create({ data: { caseId: f.c.id, eventType: "guided_search", actor: "user", description: JSON.stringify({ kind: "guided_search_v1", result }) } });
    const map = await evidenceMap(f.c.id); const node = map.nodes.find(n => n.id === "search:" + id);
    expect(node?.status).toBe("possible_match"); expect(node?.detail).toContain("does not establish ownership");
    expect((await db.assetRecord.findUniqueOrThrow({ where: { id: f.asset.id } })).evidenceStatus).toBe("document_backed");
  });
  it("connects source fields, correction history and claims without changing evidence", async () => {
    const f = await fixture(); const map = await evidenceMap(f.c.id);
    expect(map.edges).toContainEqual({ from: "doc:" + f.doc.id, to: "asset:" + f.asset.id, relation: "source_document" });
    expect(map.edges).toContainEqual({ from: "asset:" + f.asset.id, to: "claim:" + f.claim.id, relation: "claim_for" });
    expect(map.nodes.some(n => n.kind === "review" && n.status === "corrected")).toBe(true);
    expect(JSON.stringify(map)).not.toContain("123456789012");
    expect((await evidenceMap(f.c.id)).fingerprint).toBe(map.fingerprint);
    await db.documentField.update({ where: { id: f.field.id }, data: { value: "Synthetic correction" } });
    expect((await evidenceMap(f.c.id)).fingerprint).not.toBe(map.fingerprint);
    expect((await db.assetRecord.findUniqueOrThrow({ where: { id: f.asset.id } })).evidenceStatus).toBe("document_backed");
  });
  it("flags genuinely conflicting dated amounts and rejected critical fields; hides protected values", async () => {
    const f = await fixture(false);
    await db.documentField.update({ where: { id: f.field.id }, data: { state: "rejected" } });
    for (const amount of ["100.0", "100.00", "200.00"]) await db.observation.create({ data: { assetId: f.asset.id, amount, amountType: "sum_assured", asOfDate: "2026-01-01", label: "Synthetic sum assured", sourceDocumentId: f.doc.id } });
    const map = await evidenceMap(f.c.id);
    expect(map.warnings.map(w => w.kind)).toContain("conflict"); expect(map.warnings.map(w => w.kind)).toContain("rejected");
    expect(map.nodes.find(n => n.id === "field:" + f.field.id)?.detail).toContain("protected");
    expect(map.nodes.filter(n => n.kind === "observation").every(n => n.detail?.includes("hidden"))).toBe(true);
    await db.observation.deleteMany({ where: { assetId: f.asset.id, amount: "200.00" } });
    expect((await evidenceMap(f.c.id)).warnings.some(w => w.kind === "conflict")).toBe(false);
  });
  it("does not disclose foreign cases or bypass a frozen discovery gate", async () => {
    const f = await fixture(); expect((await getEvidence(req("foreign-synthetic"), ctx(f.c.id))).status).toBe(404);
    await db.legacyCase.update({ where: { id: f.c.id }, data: { frozenReason: "Synthetic freeze" } });
    expect((await getEvidence(req(f.sid), ctx(f.c.id))).status).toBe(423);
  });
});
describe("durable review checkpoints", () => {
  it("deduplicates starts and recovers an expired lease at the saved checkpoint", async () => {
    const f = await fixture(); const jobs = await Promise.all([ensureWorkflow(f.c.id, f.claim.id), ensureWorkflow(f.c.id, f.claim.id)]);
    expect(jobs[0].id).toBe(jobs[1].id); const id = jobs[0].id;
    await advanceWorkflow(id); let saved = await db.claimWorkflow.findUniqueOrThrow({ where: { id } }); expect(saved.cursor).toBe(1);
    await db.claimWorkflow.update({ where: { id }, data: { status: "running", leaseToken: "dead-process", leaseUntil: new Date(Date.now() - 1000) } });
    await advanceWorkflow(id); saved = await db.claimWorkflow.findUniqueOrThrow({ where: { id } }); expect(saved.cursor).toBe(2);
    await advanceWorkflow(id); saved = await db.claimWorkflow.findUniqueOrThrow({ where: { id } });
    expect(saved.cursor).toBe(3); expect(saved.status).toBe("waiting_user"); expect(workflowView(saved).checkpoints).toHaveLength(3);
    expect(workflowView(saved).result?.next).toBeTruthy();
    const claim = await db.claim.findUniqueOrThrow({ where: { id: f.claim.id } }); expect(claim.submittedAt).toBeNull();
    expect(await db.approval.count({ where: { pack: { claimId: f.claim.id } } })).toBe(0);
    const versionCount = await db.claimPack.count({ where: { claimId: f.claim.id } });
    const again = await restartWorkflow(id, saved.revision); await restartWorkflow(id, saved.revision);
    expect(again.revision).toBe(saved.revision + 1); expect((await db.claimWorkflow.findUniqueOrThrow({ where: { id } })).revision).toBe(again.revision);
    await advanceWorkflow(id); await advanceWorkflow(id); await advanceWorkflow(id);
    expect(await db.claimPack.count({ where: { claimId: f.claim.id } })).toBe(versionCount);
  });
  it("allows only one concurrent claimant of a checkpoint and preserves active leases", async () => {
    const f = await fixture(); const job = await ensureWorkflow(f.c.id, f.claim.id);
    await Promise.all([advanceWorkflow(job.id), advanceWorkflow(job.id)]);
    const concurrent = workflowView(await db.claimWorkflow.findUniqueOrThrow({ where: { id: job.id } }));
    expect(concurrent.cursor).toBeGreaterThanOrEqual(1); expect(concurrent.cursor).toBeLessThanOrEqual(2);
    expect(concurrent.checkpoints).toHaveLength(concurrent.cursor);
    expect(new Set(concurrent.checkpoints.map(c => c.step)).size).toBe(concurrent.cursor);
    await db.claimWorkflow.update({ where: { id: job.id }, data: { status: "running", leaseToken: "live-process", leaseUntil: new Date(Date.now() + 60_000) } });
    expect(await advanceWorkflow(job.id)).toBeNull();
  });
  it("bounds failures, retains checkpoints and does not store raw exception details", async () => {
    const f = await fixture(); const job = await ensureWorkflow(f.c.id, f.claim.id);
    await advanceWorkflow(job.id);
    for (let i = 0; i < 3; i++) {
      await db.claimWorkflow.update({ where: { id: job.id }, data: { nextRunAt: new Date(0) } });
      vi.spyOn(db.legacyCase, "findUniqueOrThrow").mockRejectedValueOnce(new Error("secret-database-diagnostic"));
      await advanceWorkflow(job.id); vi.restoreAllMocks();
    }
    const saved = await db.claimWorkflow.findUniqueOrThrow({ where: { id: job.id } });
    expect(saved.status).toBe("failed"); expect(saved.cursor).toBe(1); expect(saved.attempts).toBe(3); expect(saved.error).not.toContain("secret");
  });
  it("rechecks gates, hides foreign workflows, and cascades jobs on deletion", async () => {
    const f = await fixture(); const response = await createJob(req(f.sid), ctx(f.claim.id)); expect(response.status).toBe(202);
    const job = (await response.json()).workflow;
    expect((await advance(req("foreign-synthetic"), ctx(job.id))).status).toBe(404);
    await db.legacyCase.update({ where: { id: f.c.id }, data: { frozenReason: "Synthetic freeze" } });
    await advanceWorkflow(job.id); expect((await db.claimWorkflow.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("waiting_user");
    await db.legacyCase.delete({ where: { id: f.c.id } }); expect(await db.claimWorkflow.findUnique({ where: { id: job.id } })).toBeNull();
  });
});
