import { randomUUID } from "node:crypto";
import type { CaseAgentRun } from "@prisma/client";
import type { CaseAgentStep, CaseAgentView, CaseAgentResult } from "@shared/case-agent";
import { db } from "@server/db";
import { canDiscover } from "@server/core/gate-engine";
import { evidenceMap } from "./evidence-map";
import { refreshClaim } from "./claim-service";

function parse<T>(value: string | null, fallback: T): T { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
export function caseAgentView(job: CaseAgentRun): CaseAgentView {
  return { id: job.id, status: job.status as CaseAgentView["status"], cursor: job.cursor, revision: job.revision, attempts: job.attempts, updatedAt: job.updatedAt.toISOString(), plan: parse(job.plan, []), receipts: parse(job.receipts, []), result: parse(job.result, null), error: job.error };
}
export async function startCaseAgent(caseId: string, revision?: number) {
  let job;
  try { job = await db.caseAgentRun.upsert({ where: { caseId }, create: { caseId }, update: {} }); }
  catch (error) { job = await db.caseAgentRun.findUnique({ where: { caseId } }); if (!job) throw error; }
  if (revision !== undefined && job.revision === revision && job.status === "paused") {
    await db.caseAgentRun.updateMany({ where: { id: job.id, revision, status: "paused" }, data: { status: "queued", error: null, leaseToken: null, leaseUntil: null, ...(job.cursor >= parse<CaseAgentStep[]>(job.plan, []).length ? { cursor: 0, plan: "[]", receipts: "[]", result: null, attempts: 0, revision: { increment: 1 } } : {}) } });
    return db.caseAgentRun.findUniqueOrThrow({ where: { caseId } });
  }
  if (revision !== undefined && job.revision === revision && !["queued", "running"].includes(job.status)) {
    await db.caseAgentRun.updateMany({ where: { id: job.id, revision, status: job.status }, data: { status: "queued", cursor: 0, revision: { increment: 1 }, attempts: 0, plan: "[]", receipts: "[]", result: null, error: null, leaseToken: null, leaseUntil: null } });
    job = await db.caseAgentRun.findUniqueOrThrow({ where: { caseId } });
  }
  return job;
}
/** An existing delegation may continue after human evidence changes; paused runs never restart. */
export async function reconcileCaseAgent(caseId: string) {
  const job = await db.caseAgentRun.findUnique({ where: { caseId } });
  if (!job || job.status !== "waiting_user") return job;
  const c = await db.legacyCase.findUniqueOrThrow({ where: { id: caseId } });
  if (c.frozenReason || !canDiscover(c)) return job;
  const result = parse<CaseAgentResult | null>(job.result, null);
  const map = await evidenceMap(caseId);
  if (result?.fingerprint === map.fingerprint) return job;
  await db.caseAgentRun.updateMany({ where: { id: job.id, revision: job.revision, status: "waiting_user" }, data: { status: "queued", cursor: 0, revision: { increment: 1 }, attempts: 0, plan: "[]", receipts: "[]", result: null, error: null, leaseToken: null, leaseUntil: null } });
  return db.caseAgentRun.findUniqueOrThrow({ where: { caseId } });
}
export async function pauseCaseAgent(caseId: string) {
  await db.caseAgentRun.updateMany({ where: { caseId, status: { in: ["queued", "running", "waiting_user", "succeeded"] } }, data: { status: "paused", leaseToken: null, leaseUntil: null } });
  return db.caseAgentRun.findUnique({ where: { caseId } });
}
/** Each request owns at most one fenced, idempotent preparation checkpoint. */
export async function advanceCaseAgent(caseId: string, now = new Date()) {
  const job = await db.caseAgentRun.findUnique({ where: { caseId } });
  if (!job || !["queued", "running"].includes(job.status) || (job.leaseUntil && job.leaseUntil > now)) return job;
  const token = randomUUID();
  const acquired = await db.caseAgentRun.updateMany({ where: { id: job.id, revision: job.revision, cursor: job.cursor, status: { in: ["queued", "running"] }, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] }, data: { status: "running", leaseToken: token, leaseUntil: new Date(now.getTime() + 60_000) } });
  if (!acquired.count) return db.caseAgentRun.findUnique({ where: { caseId } });
  const fence = { id: job.id, revision: job.revision, leaseToken: token };
  try {
    const c = await db.legacyCase.findUniqueOrThrow({ where: { id: caseId } });
    if (c.frozenReason || !canDiscover(c)) {
      const result: CaseAgentResult = { summary: "Your case checks need attention before I can prepare records.", needs: [c.frozenReason ? "Resolve the hold on this case." : "Complete identity and authority checks."], target: { type: "know" } };
      await db.caseAgentRun.updateMany({ where: fence, data: { status: "waiting_user", result: JSON.stringify(result), leaseToken: null, leaseUntil: null } });
      return db.caseAgentRun.findUnique({ where: { caseId } });
    }
    let plan = parse<CaseAgentStep[]>(job.plan, []);
    const receipts = parse<CaseAgentView["receipts"]>(job.receipts, []);
    let result = parse<CaseAgentResult | null>(job.result, null);
    let status = "queued";
    if (job.cursor === 0) {
      const map = await evidenceMap(caseId);
      const claims = await db.claim.findMany({ where: { caseId }, select: { id: true }, orderBy: { createdAt: "asc" }, take: 5 });
      plan = [{ label: "Collect saved evidence" }, { label: "Identify what needs your review" }, ...claims.map(claim => ({ label: "Refresh a saved claim package", claimId: claim.id })), { label: "Prepare your next step" }];
      result = { summary: "Evidence collected from your saved case.", needs: [], target: { type: "know" }, fingerprint: map.fingerprint };
    } else if (job.cursor === 1) {
      const map = await evidenceMap(caseId);
      const needs = map.warnings.map(w => w.text).slice(0, 12);
      if (map.truncated) needs.push("Some evidence exceeds this bounded review. Inspect remaining records.");
      const target = map.nodes.find(n => n.kind === "field" && n.status !== "accepted" && n.status !== "corrected")?.target
        ?? map.nodes.find(n => n.kind === "asset" && n.status === "potential_match")?.target;
      result = { summary: "Checked saved evidence for unresolved reviews and inconsistencies.", needs, target: target && target.type !== "plan" ? { type: target.type, id: target.id } : { type: "know" }, fingerprint: map.fingerprint };
    } else if (plan[job.cursor]?.claimId) {
      const claim = await db.claim.findFirst({ where: { id: plan[job.cursor].claimId, caseId } });
      if (!claim) throw new Error("Claim context changed");
      const view = await refreshClaim(claim.id);
      const unresolved = !["settled", "transferred", "rejected", "withdrawn"].includes(view.status) || view.remainderTracked;
      if (unresolved) {
        const next = view.submittedAt ? "Record the institution's next update." : !view.entitled ? "Review authority evidence for this holding." : view.pack?.ready ? "Review and approve the prepared package." : "Provide the missing claim documents or answers.";
        result = { ...result!, needs: [...(result?.needs ?? []), next].slice(0, 15), target: { type: "claim", id: claim.id } };
      }
    } else {
      const map = await evidenceMap(caseId);
      const claims = await db.claim.count({ where: { caseId } });
      const holdings = await db.assetRecord.count({ where: { caseId, discoveryStatus: { not: "dismissed" }, OR: [{ duplicateState: null }, { duplicateState: { not: "merged" } }] } });
      const needs = [...new Set([...(result?.needs ?? []), ...map.warnings.map(w => w.text).slice(0, 12), ...(holdings === 0 ? ["Add a statement or identify one holding so I can prepare the next step."] : []), ...(claims > 5 ? ["Review additional claims beyond this run's five-claim limit."] : [])])];
      const warningIds = new Set(map.warnings.flatMap(w => w.nodeIds));
      const source = map.nodes.find(node => warningIds.has(node.id) && node.kind === "field" && node.target?.type === "doc")?.target;
      result = { summary: needs.length ? "I've finished the safe preparation. Your review is the next step." : "I've checked your saved case. Tell me what you want to prepare next.", needs, target: source ? { type: "doc", id: source.id } : result?.target ?? { type: "know" }, fingerprint: map.fingerprint };
      status = needs.length ? "waiting_user" : "succeeded";
    }
    receipts.push({ text: plan[job.cursor]?.label ?? "Preparation finished", at: new Date().toISOString() });
    await db.caseAgentRun.updateMany({ where: fence, data: { status, cursor: job.cursor + 1, plan: JSON.stringify(plan), receipts: JSON.stringify(receipts), result: JSON.stringify(result), error: null, leaseToken: null, leaseUntil: null } });
  } catch {
    const attempts = job.attempts + 1;
    await db.caseAgentRun.updateMany({ where: fence, data: { status: attempts >= 3 ? "failed" : "queued", attempts, error: attempts >= 3 ? "Preparation stopped after three failed attempts. Your saved records are unchanged by this failed checkpoint." : "This checkpoint failed. Keeper will retry it from the saved position.", leaseToken: null, leaseUntil: null } });
  }
  return db.caseAgentRun.findUnique({ where: { caseId } });
}
