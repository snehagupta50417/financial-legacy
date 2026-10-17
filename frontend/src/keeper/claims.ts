import { choosePath, parseBand, type PathDecision, type Situation } from "@/server/rules/claim-path";
import { procedureFor, type PackItem, type Procedure } from "@/server/procedures/procedures";
import type { Asset, Case, Claim, Outcome } from "./types";
import { fnv, iso, logActivity, uid } from "./util";

/**
 * Claims for the Keeper prototype. Paths, requirements and sources come from the same pure rules
 * and cited, versioned procedures as the backend (server/rules/claim-path, server/procedures) —
 * Keeper never invents a requirement. Nothing here sends anything anywhere.
 */

const SERVER_CATEGORY = { bank: "bank_deposit", mutual_fund: "mutual_fund", insurance: "insurance", retirement: "other", other: "other" } as const;

export function relKey(label: string): Situation["relationship"] {
  if (/spouse|husband|wife/i.test(label)) return "spouse";
  if (/child|son|daughter/i.test(label)) return "child";
  if (/parent|mother|father/i.test(label)) return "parent";
  if (/sibling|brother|sister/i.test(label)) return "sibling";
  return label ? "other" : "unknown";
}

export function claimSituation(a: Asset, cl: Claim): Situation {
  const value = a.amount?.value;
  const band = cl.situation.amountBand ? parseBand(cl.situation.amountBand) : null;
  return {
    // The holding's nomination is the source of truth once known (conversation, document or claim answer).
    nominee: a.nomination !== "unknown" ? a.nomination : cl.situation.nominee,
    jointHolder: cl.situation.jointHolder,
    relationship: relKey(cl.claimant.relation),
    amount: value !== undefined ? { min: value, max: value, source: "reviewed" } : band ? { ...band, source: "family" } : null,
    demat: false,
    disputed: false,
  };
}

const GENERIC_ITEMS: PackItem[] = [
  { id: "death-certificate", label: "Death certificate", required: true },
  { id: "claimant-id", label: "Your officially valid ID document", required: true },
  { id: "holding-details", label: "Account, policy or folio details", required: true, note: "Not checked against an official procedure. ask the institution what it needs." },
];

export interface ClaimPlan {
  decision: PathDecision;
  items: PackItem[];
  procedure: Procedure | null;
  path: string | null;
  label: string | null;
}

export function claimPlan(a: Asset, cl: Claim, today = iso().slice(0, 10)): ClaimPlan {
  const holding = { category: SERVER_CATEGORY[a.category], institution: a.institution };
  if (cl.backend) {
    const view = cl.backend;
    const procedure = procedureFor(holding.category, holding.institution);
    if (view.decision.kind === "path" && procedure) {
      const path = view.decision.path as keyof typeof procedure.paths;
      return { decision: { kind: "path", path, procedure, reasons: view.decision.reasons }, items: view.pack?.items || procedure.paths[path]?.items || [], procedure, path, label: view.decision.label };
    }
    if (view.decision.kind === "ask" && procedure) return { decision: { kind: "ask", question: view.decision.question as "nominee" | "jointHolder" | "amount" | "relationship", procedure, reasons: view.decision.reasons }, items: [], procedure, path: null, label: null };
    return { decision: { kind: "review", reason: view.decision.kind === "review" ? view.decision.reason : "No checked procedure is available.", procedure }, items: [], procedure, path: null, label: null };
  }
  const decision = choosePath(holding, claimSituation(a, cl), today);
  const procedure = procedureFor(holding.category, holding.institution);
  if (decision.kind === "path") {
    const pp = decision.procedure.paths[decision.path]!;
    return { decision, items: pp.items, procedure: decision.procedure, path: decision.path, label: pp.label };
  }
  return { decision, items: decision.kind === "review" ? GENERIC_ITEMS : [], procedure, path: null, label: null };
}

export function declarationsFor(institution: string, path: string | null): { id: string; text: string }[] {
  const base = [
    { id: "true", text: "The information in this package is true to the best of my knowledge." },
    { id: "self-submit", text: `I will submit this package to ${institution} myself. Keeper does not submit claims for me.` },
    { id: "no-guarantee", text: `I understand ${institution} decides the claim; preparing a package does not guarantee payment.` },
  ];
  if (path === "nominee" && /mutual/i.test(institution))
    base.push({ id: "nominee-trustee", text: "I understand a nominee holds mutual fund units as trustee for the legal heirs." });
  return base;
}

/** Fingerprint of exactly what would be sent. Any change makes the old approval invalid. */
export function claimHash(a: Asset, cl: Claim, plan: ClaimPlan): string {
  const items = plan.items.filter((i) => cl.have[i.id]).map((i) => i.id);
  return fnv(JSON.stringify({ a: a.id, p: plan.path, items, d: [...cl.declarations].sort(), c: cl.claimant }));
}

export function isPrepared(a: Asset, cl: Claim): boolean {
  const plan = claimPlan(a, cl);
  if (plan.decision.kind === "ask") return false;
  const decls = declarationsFor(a.institution, plan.path);
  return plan.items.filter((i) => i.required).every((i) => cl.have[i.id]) && decls.every((d) => cl.declarations.includes(d.id));
}

export function startClaim(c: Case, assetId: string): Claim | null {
  const a = c.assets.find((x) => x.id === assetId);
  if (!a) return null;
  const existing = c.claims.find((x) => x.assetId === assetId);
  if (existing) return existing;
  const both = c.facts.authority?.value === "both";
  const cl: Claim = {
    id: uid(),
    assetId,
    claimant: { name: "You", relation: c.facts.relation?.value ?? "", verification: "awaiting_review" },
    situation: { nominee: a.nomination, jointHolder: "unknown", amountBand: null },
    have: both ? { "death-certificate": true, "claimant-id": true } : {},
    declarations: [],
    approval: null,
    prepared: false,
    submitted: null,
    acknowledged: null,
    outcome: null,
    lastConfirmed: null,
    nextFollowUp: null,
  };
  c.claims.push(cl);
  logActivity(c, "prepared", `Keeper started a claim for ${a.institution}.`);
  return cl;
}

/** Any change to a prepared package cancels an earlier approval. it must be reviewed again. */
function invalidate(c: Case, cl: Claim, why: string) {
  if (cl.approval && (cl.approval.state === "approved" || cl.approval.state === "requested")) {
    cl.approval.state = "invalidated";
    logActivity(c, "prepared", `The package changed (${why}), so the earlier approval no longer applies. Please review it again.`);
  }
}

export function editClaim(
  c: Case,
  cl: Claim,
  e: { situation?: Partial<Claim["situation"]>; have?: Record<string, boolean>; declarations?: string[]; claimant?: Partial<Claim["claimant"]> }
) {
  const a = c.assets.find((x) => x.id === cl.assetId);
  if (!a || cl.submitted) return;
  if (e.situation) {
    Object.assign(cl.situation, e.situation);
    if (e.situation.nominee && e.situation.nominee !== "unknown") a.nomination = e.situation.nominee;
  }
  if (e.have) Object.assign(cl.have, e.have);
  if (e.declarations) cl.declarations = e.declarations;
  if (e.claimant) Object.assign(cl.claimant, e.claimant);
  invalidate(c, cl, "your answers or documents changed");
  cl.prepared = isPrepared(a, cl);
}

export function requestApproval(c: Case, cl: Claim): string | null {
  const a = c.assets.find((x) => x.id === cl.assetId);
  if (!a || !cl.prepared) return "The package isn't ready yet.";
  const plan = claimPlan(a, cl);
  cl.approval = {
    id: uid(),
    hash: claimHash(a, cl, plan),
    recipient: a.institution,
    channel: "You submit it yourself",
    includes: plan.items.filter((i) => cl.have[i.id]).map((i) => i.label),
    declarations: declarationsFor(a.institution, plan.path).map((d) => d.text),
    state: "requested",
  };
  logActivity(c, "prepared", `Keeper prepared the ${a.institution} package for your approval.`);
  return null;
}

export function approve(c: Case, cl: Claim): string | null {
  const a = c.assets.find((x) => x.id === cl.assetId);
  if (!a || !cl.approval || cl.approval.state !== "requested") return "There is nothing to approve.";
  if (cl.approval.hash !== claimHash(a, cl, claimPlan(a, cl))) {
    cl.approval.state = "invalidated";
    return "The package changed. Please review it again.";
  }
  cl.approval.state = "approved";
  logActivity(c, "approved", `You approved the exact ${a.institution} package.`);
  return null;
}

export function submit(c: Case, cl: Claim, method: string): string | null {
  const a = c.assets.find((x) => x.id === cl.assetId);
  if (!a || cl.approval?.state !== "approved") return "Approve the package first.";
  if (cl.approval.hash !== claimHash(a, cl, claimPlan(a, cl))) {
    cl.approval.state = "invalidated";
    return "The package changed since you approved it.";
  }
  cl.approval.state = "used";
  const at = iso();
  cl.submitted = { at, ref: "Not submitted", method };
  cl.nextFollowUp = null;
  cl.lastConfirmed = null;
  logActivity(c, "sent", `Submission step previewed for ${a.institution}. Nothing was sent.`);
  return null;
}

export function acknowledge(c: Case, cl: Claim, note: string) {
  const a = c.assets.find((x) => x.id === cl.assetId);
  if (!a || !cl.submitted) return;
  cl.acknowledged = { at: iso(), note };
  cl.lastConfirmed = iso();
  logActivity(c, "institution", `You recorded that ${a.institution} acknowledged the claim${note ? `: “${note}”` : ""}.`);
}

export function recordOutcome(c: Case, cl: Claim, kind: Outcome, note: string) {
  const a = c.assets.find((x) => x.id === cl.assetId);
  if (!a || !cl.submitted) return;
  cl.outcome = { kind, at: iso(), note };
  cl.lastConfirmed = iso();
  cl.nextFollowUp = null;
  logActivity(c, "institution", `You recorded the outcome with ${a.institution}: ${kind.replace(/_/g, " ")}.`);
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  settled: "Settled",
  partially_settled: "Partially settled",
  transferred: "Transferred",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  unresolved_dispute: "Unresolved dispute",
};

export type ClaimStep = "intake" | "authority" | "requirements" | "documents" | "review" | "submission" | "followup" | "outcome";
export const CLAIM_STEPS: { id: ClaimStep; label: string }[] = [
  { id: "intake", label: "Intake" },
  { id: "authority", label: "Authority review" },
  { id: "requirements", label: "Requirements" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "Your review" },
  { id: "submission", label: "Submission" },
  { id: "followup", label: "Follow-up" },
  { id: "outcome", label: "Outcome" },
];

/** Where a claim is now, derived from its facts so it can't drift. */
export function claimStep(c: Case, cl: Claim): ClaimStep {
  const a = c.assets.find((x) => x.id === cl.assetId);
  if (cl.backend && !cl.backend.entitled) return "authority";
  if (cl.outcome) return "outcome";
  if (cl.acknowledged || (cl.backend && cl.submitted)) return "followup";
  if (cl.submitted) return "submission";
  if (cl.approval?.state === "approved") return "submission";
  if (!a) return "intake";
  const plan = claimPlan(a, cl);
  if (plan.decision.kind === "ask") return "intake";
  if (cl.claimant.verification === "awaiting_review") return "authority";
  if (!plan.items.filter((i) => i.required).every((i) => cl.have[i.id])) return "documents";
  if (!cl.prepared) return "requirements";
  return "review";
}
