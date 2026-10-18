import { randomUUID } from "node:crypto";
import type { ClaimWorkflow } from "@prisma/client";
import { db } from "@server/db";
import { canDiscover } from "@server/core/gate-engine";
import { CLAIM_REVIEW_STEPS, type WorkflowView } from "@shared/evidence-map";
import { evidenceMap } from "./evidence-map";
import { refreshClaim } from "./claim-service";

const LEASE_MS = 60_000;
function parse<T>(text: string | null, fallback: T): T { try { return text ? JSON.parse(text) : fallback; } catch { return fallback; } }
export function workflowView(job: ClaimWorkflow): WorkflowView {
  return { id: job.id, claimId: job.claimId, status: job.status as WorkflowView["status"], cursor: job.cursor, revision: job.revision, attempts: job.attempts, updatedAt: job.updatedAt.toISOString(), error: job.error, checkpoints: parse(job.checkpoints, []), result: parse(job.result, null) };
}
export async function ensureWorkflow(caseId: string, claimId: string) {
  const claim = await db.claim.findFirst({ where: { id: claimId, caseId } });
  if (!claim) throw new Error("Claim not found");
  try { return await db.claimWorkflow.upsert({ where: { claimId }, create: { caseId, claimId, nextRunAt: new Date(0) }, update: {} }); }
  catch (error) { const existing = await db.claimWorkflow.findUnique({ where: { claimId } }); if (existing?.caseId === caseId) return existing; throw error; }
}
export async function restartWorkflow(id: string, revision: number) {
  const job = await db.claimWorkflow.findUniqueOrThrow({ where: { id } });
  if (job.revision !== revision) return job; // The same retry never starts another revision.
  if (["queued", "running"].includes(job.status)) return job;
  await db.claimWorkflow.updateMany({ where: { id, revision, status: { in: ["failed", "waiting_user", "succeeded"] } }, data: { status: "queued", cursor: 0, revision: { increment: 1 }, attempts: 0, checkpoints: "[]", result: null, error: null, leaseToken: null, leaseUntil: null, nextRunAt: new Date() } });
  return db.claimWorkflow.findUniqueOrThrow({ where: { id } });
}

/** Claim a single persisted checkpoint with compare-and-swap. No in-memory queue owns the work. */
export async function advanceWorkflow(id?: string, now = new Date()) {
  const eligible = { status: { in: ["queued", "running"] }, nextRunAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] };
  const job = await db.claimWorkflow.findFirst({ where: { ...eligible, ...(id ? { id } : {}) }, orderBy: { createdAt: "asc" } });
  if (!job) return null;
  const token = randomUUID();
  const taken = await db.claimWorkflow.updateMany({ where: { id: job.id, revision: job.revision, cursor: job.cursor, ...eligible }, data: { status: "running", leaseToken: token, leaseUntil: new Date(now.getTime() + LEASE_MS) } });
  if (!taken.count) return null;
  const fence = { id: job.id, revision: job.revision, leaseToken: token };
  try {
    const c = await db.legacyCase.findUniqueOrThrow({ where: { id: job.caseId } });
    if (c.frozenReason || !canDiscover(c)) {
      await db.claimWorkflow.updateMany({ where: fence, data: { status: "waiting_user", error: "Case checks need attention before the review can continue.", leaseToken: null, leaseUntil: null } });
      return db.claimWorkflow.findUnique({ where: { id: job.id } });
    }
    const claim = await db.claim.findFirst({ where: { id: job.claimId, caseId: job.caseId } });
    if (!claim) throw new Error("Claim was removed");
    let map = await evidenceMap(job.caseId);
    const checkpoints = parse<WorkflowView["checkpoints"]>(job.checkpoints, []);
    let result: WorkflowView["result"] = null, status = "queued";
    if (job.cursor === 2) {
      // Existing canonical, content-hashed preparation. It never approves or submits anything.
      const view = await refreshClaim(job.claimId);
      map = await evidenceMap(job.caseId);
      const assetNode = "asset:" + claim.assetId;
      const connected = new Set([assetNode, "claim:" + claim.id]);
      for (let i = 0; i < 4; i++) for (const e of map.edges) {
        if (["source_document", "merged_into", "claim_requirement"].includes(e.relation) && connected.has(e.to)) connected.add(e.from);
        if (["extracted_field", "dated_observation", "review_history"].includes(e.relation) && connected.has(e.from)) connected.add(e.to);
      }
      const relevant = map.warnings.filter(w => w.nodeIds.some(n => connected.has(n)));
      const gaps = [...(view.pack?.gaps ?? []), ...relevant.map(w => w.text)];
      if (!view.entitled) gaps.unshift("Authority evidence needs review.");
      if (view.decision.kind === "ask") gaps.unshift(view.decision.text);
      if (view.decision.kind === "review") gaps.unshift(view.decision.reason);
      if (map.truncated) gaps.push("The evidence map is a limited preview. Review the complete records before approval.");
      const closed = !!view.outcome && !["partially_settled", "unresolved_dispute"].includes(view.outcome) && !view.remainderTracked;
      status = closed ? "succeeded" : "waiting_user";
      result = { fingerprint: map.fingerprint, gaps, ready: !!view.pack?.ready && view.entitled && !gaps.length, claimStatus: view.status, packHash: view.pack?.contentHash ?? null,
        next: closed ? "Institution outcome recorded. Review complete; case history remains saved." : view.submittedAt ? "Record the institution’s next update in the claim. A partial settlement or dispute remains open." : gaps.length ? "Resolve the flagged details, then rerun this review." : view.approval ? "Use the official handoff. Submit the package yourself, then record the receipt." : "Review the prepared package and approve it yourself. Nothing has been submitted." };
    }
    checkpoints.push({ step: CLAIM_REVIEW_STEPS[job.cursor], at: new Date().toISOString(), fingerprint: map.fingerprint });
    await db.claimWorkflow.updateMany({ where: fence, data: { cursor: job.cursor + 1, checkpoints: JSON.stringify(checkpoints), status, result: result ? JSON.stringify(result) : undefined, error: null, leaseToken: null, leaseUntil: null, nextRunAt: new Date() } });
  } catch {
    const attempts = job.attempts + 1;
    await db.claimWorkflow.updateMany({ where: fence, data: { status: attempts >= 3 ? "failed" : "queued", attempts, error: "This review step could not finish. Saved checkpoints are retained; retry is safe.", leaseToken: null, leaseUntil: null, nextRunAt: new Date(Date.now() + Math.min(30_000, 1000 * 2 ** attempts)) } });
  }
  return db.claimWorkflow.findUnique({ where: { id: job.id } });
}

let timer: ReturnType<typeof setInterval> | undefined;
let ticking = false;
export function startWorkflowWorker() {
  if (timer) return;
  timer = setInterval(async () => { if (ticking) return; ticking = true; try { await advanceWorkflow(); } catch { /* Schema setup/deployment errors must not crash the API. UI requests expose setup errors. */ } finally { ticking = false; } }, 2000);
  timer.unref();
  return () => { clearInterval(timer); timer = undefined; };
}
