import type { Claim, ClaimPack, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { canSeeFullAsset, journeyKind } from "@/server/core/gate-engine";
import { headlineAmount } from "@/server/core/masking";
import { procedureFor } from "@/server/procedures/procedures";
import { choosePath, EMPTY_SITUATION, parseBand, QUESTION_TEXT, type PathDecision, type Situation } from "@/server/rules/claim-path";
import { buildPack, packGaps, packHash, type ChecklistEntry, type PackContent, type PrefillField } from "@/server/rules/claim-pack";
import {
  canMove,
  derivePreSubmission,
  PRE_SUBMISSION,
  STATUS_LABEL,
  waitingOn,
  type ClaimStatus,
  type Outcome,
} from "@/server/rules/claim-lifecycle";
import { formatInr, parseAmount, toPaise } from "@/server/rules/observations";
import { logEvent } from "./case-service";

/**
 * Claims (PRD FL-12–FL-16, FL-36, FL-37; LLD §11). Applies the claim rules to
 * stored records. The family submits every pack themselves; nothing here sends
 * anything to an institution.
 */

export class ClaimError extends Error {
  constructor(
    message: string,
    public status = 409
  ) {
    super(message);
  }
}

/** Approval lifetime (LLD §11.3 reference: 15 minutes). */
export const APPROVAL_MINUTES = 15;

function json<T>(s: string | null | undefined, fallback: T): T {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

const today = () => new Date().toISOString().slice(0, 10);

async function loadAll(claimId: string) {
  const claim = await db.claim.findUniqueOrThrow({
    where: { id: claimId },
    include: {
      case: { include: { deceasedPerson: true, claimants: { orderBy: { createdAt: "asc" } } } },
      asset: { include: { observations: true } },
      packs: { orderBy: { version: "desc" }, include: { approvals: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  return claim;
}
type Loaded = Awaited<ReturnType<typeof loadAll>>;

/** Facts the path rule needs: what the family told us, the holding's records and its checked amount. */
async function situationOf(c: Loaded): Promise<Situation> {
  const stored = json<Partial<Situation>>(c.situation, {});
  const s: Situation = { ...EMPTY_SITUATION, ...stored };
  if (s.nominee === "unknown" && c.asset.nomineeStatus !== "unknown") s.nominee = c.asset.nomineeStatus as Situation["nominee"];
  if (s.jointHolder === "unknown" && c.asset.jointHolderStatus !== "unknown") s.jointHolder = c.asset.jointHolderStatus as Situation["jointHolder"];
  // The entitlement check (G4) says how the person is entitled.
  if (s.nominee === "unknown" || s.jointHolder === "unknown") {
    const proof = await db.proof.findFirst({ where: { caseId: c.caseId, assetId: c.assetId, kind: "entitlement", status: "verified" }, orderBy: { createdAt: "desc" } });
    if (proof?.provider === "mock_nominee" && s.nominee === "unknown") s.nominee = "recorded";
    if (proof?.provider === "mock_joint_holder" && s.jointHolder === "unknown") s.jointHolder = "surviving";
  }
  // A checked, dated value beats the family's estimate.
  const value = headlineAmount(c.asset.observations);
  if (value && ["cash_balance", "current_value"].includes(value.amountType) && value.asOfDate) {
    const rupees = Number(toPaise(value.amount) / BigInt(100));
    s.amount = { min: rupees, max: rupees, source: "reviewed" };
  }
  return s;
}

async function prefillOf(c: Loaded, s: Situation, decision: PathDecision): Promise<PrefillField[]> {
  const out: PrefillField[] = [];
  const d = c.case.deceasedPerson;
  if (d) {
    const src = d.deathProofStatus === "verified" ? "Death record (checked)" : "What you told us — not yet checked";
    out.push({ label: "Name of the person who died", value: d.name, source: src });
    if (d.dateOfDeath) out.push({ label: "Date of death", value: d.dateOfDeath, source: src });
  } else if (c.case.assetHolderName) {
    out.push({ label: "Name of the person who died", value: c.case.assetHolderName, source: "What you told us — not yet checked" });
  }
  const lead = c.case.claimants.find((x) => x.role === "lead");
  if (lead?.fullName) out.push({ label: "Claimant (you)", value: lead.fullName, source: lead.identityStatus === "verified" ? "Your identity check" : "What you told us" });
  const rel = s.relationship !== "unknown" ? s.relationship : lead?.relationship;
  if (rel) out.push({ label: "Your relationship", value: rel.replace(/_/g, " "), source: "What you told us" });
  out.push({ label: "Institution", value: c.asset.institution, source: "Holding you confirmed" });
  if (c.asset.maskedRef) out.push({ label: "Account / policy / folio", value: c.asset.maskedRef, source: "Last 4 digits only — write the full number yourself" });

  // Names come only from document fields a person checked.
  if (c.asset.sourceDocumentId) {
    const doc = await db.documentRecord.findUnique({ where: { id: c.asset.sourceDocumentId }, include: { fields: true } });
    const holder = doc?.fields.find((f) => /holder|investor|life\s*assured|policy\s*holder/i.test(f.label) && (f.state === "accepted" || f.state === "corrected"));
    if (doc && holder) out.push({ label: "Name on the holding", value: holder.value, source: `Checked in ${doc.fileName}` });
  }
  const value = headlineAmount(c.asset.observations);
  if (value) {
    out.push({
      label: value.meaning,
      value: `${value.display}${value.asOfDate ? ` as of ${value.asOfDate}` : " (date unknown)"}`,
      source: "Amount you checked — the institution's figure will differ",
    });
  }
  out.push({
    label: "Nominee",
    value: s.nominee === "recorded" ? "Recorded" : s.nominee === "none" ? "None recorded" : "Unknown",
    source: "What you told us or the records show",
  });
  if (decision.kind === "path") out.push({ label: "Claim path", value: decision.procedure.paths[decision.path]!.label, source: "Chosen by our rules from the facts above" });
  return out;
}

export interface ClaimView {
  id: string;
  assetId: string;
  institution: string;
  category: string;
  maskedRef: string | null;
  status: ClaimStatus;
  statusLabel: string;
  waitingOn: string | null;
  dueDate: string | null;
  situation: Situation;
  decision:
    | { kind: "path"; path: string; label: string; explanation: string; reasons: string[] }
    | { kind: "ask"; question: string; text: string; options: { value: string; label: string }[]; reasons: string[] }
    | { kind: "review"; reason: string };
  procedure: { id: string; version: string; title: string; authority: string; sourceUrl: string; checkedOn: string; timeline: string; whereToSubmit: string } | null;
  entitled: boolean;
  pack: (PackContent & { version: number; contentHash: string; gaps: string[]; ready: boolean }) | null;
  approval: { id: string; expiresAt: string; contentHash: string } | null;
  submittedAt: string | null;
  submissionChannel: string | null;
  receiptRef: string | null;
  institutionRef: string | null;
  outcome: string | null;
  outcomeAmount: string | null;
  outcomeAmountDisplay: string | null;
  outcomeDate: string | null;
  outcomeNote: string | null;
  remainderTracked: boolean;
  packVersions: { version: number; status: string; createdAt: string }[];
  events: { kind: string; note: string; actor: string; createdAt: string }[];
}

async function event(claimId: string, kind: string, note: string, actor: "family" | "system" | "institution" = "system") {
  await db.claimEvent.create({ data: { claimId, kind, note, actor } });
}

/**
 * Bring a claim up to date: choose the path from current facts, rebuild the
 * pack, save a new pack version when its content changed (invalidating any
 * approval of the old one — FL-14, FL-26), and derive the status.
 */
export async function refreshClaim(claimId: string): Promise<ClaimView> {
  let c = await loadAll(claimId);
  const s = await situationOf(c);
  const decision = choosePath(c.asset, s, today());
  const entitled = canSeeFullAsset(c.case, c.asset);
  const preSubmission = PRE_SUBMISSION.includes(c.status as ClaimStatus);
  const now = new Date();

  // Expire old approvals lazily.
  const expired = c.packs.flatMap((p) => p.approvals).filter((a) => a.state === "active" && a.expiresAt <= now);
  if (expired.length) await db.approval.updateMany({ where: { id: { in: expired.map((a) => a.id) } }, data: { state: "expired" } });

  let content: PackContent | null = null;
  let latest: (ClaimPack & { approvals: { id: string; state: string; expiresAt: Date; contentHash: string }[] }) | null = c.packs[0] ?? null;
  if (decision.kind === "path") {
    const docs = await db.documentRecord.findMany({ where: { caseId: c.caseId }, select: { id: true, fileName: true } });
    content = buildPack({
      procedure: decision.procedure,
      path: decision.path,
      institution: c.asset.institution,
      checklist: json<Record<string, ChecklistEntry>>(c.checklist, {}),
      documentNames: Object.fromEntries(docs.map((d) => [d.id, d.fileName])),
      prefill: await prefillOf(c, s, decision),
      accepted: json<string[]>(c.declarations, []),
    });
    const hash = packHash(content);
    const ready = packGaps(content).length === 0;
    // Packs are frozen once submitted: what was sent stays what was sent. A draft nobody has
    // approved yet is just updated; once a version has been approved it is kept, and a change
    // makes a new version (FL-37).
    if (preSubmission && latest && latest.contentHash !== hash && latest.approvals.length === 0) {
      await db.claimPack.update({
        where: { id: latest.id },
        data: { contentHash: hash, content: JSON.stringify(content), status: ready ? "ready" : "draft" },
      });
      c = await loadAll(claimId);
      latest = c.packs[0];
    } else if (preSubmission && (!latest || latest.contentHash !== hash)) {
      const ops: Prisma.PrismaPromise<unknown>[] = [];
      if (latest) {
        ops.push(db.claimPack.update({ where: { id: latest.id }, data: { status: "superseded" } }));
        ops.push(db.approval.updateMany({ where: { pack: { claimId }, state: "active" }, data: { state: "invalidated" } }));
      }
      ops.push(
        db.claimPack.create({
          data: { claimId, version: (latest?.version ?? 0) + 1, contentHash: hash, content: JSON.stringify(content), status: ready ? "ready" : "draft" },
        })
      );
      await db.$transaction(ops);
      if (latest) {
        const hadApproval = latest.approvals.some((a) => a.state === "active" && a.expiresAt > now);
        await event(claimId, "pack_changed", `Pack updated to version ${latest.version + 1}${hadApproval ? " — your earlier approval no longer applies; please check and approve again" : ""}.`);
      }
      c = await loadAll(claimId);
      latest = c.packs[0];
    } else if (preSubmission && latest && latest.status !== (ready ? "ready" : "draft")) {
      await db.claimPack.update({ where: { id: latest.id }, data: { status: ready ? "ready" : "draft" } });
    }
  }

  const approval =
    latest && content
      ? latest.approvals.find((a) => a.state === "active" && a.expiresAt > now && a.contentHash === latest!.contentHash) ?? null
      : null;
  const gaps = content ? packGaps(content) : [];
  let status = c.status as ClaimStatus;
  if (preSubmission) {
    status = derivePreSubmission({
      pathChosen: decision.kind === "path",
      entitled,
      requiredMissing: content ? content.items.filter((i) => i.required && i.state === "missing").length : 0,
      packReady: !!content && gaps.length === 0,
      approvedForCurrentPack: !!approval,
    });
  }
  const who = waitingOn(status);
  const updates: Prisma.ClaimUpdateInput = {};
  if (status !== c.status) updates.status = status;
  const path = decision.kind === "path" ? decision.path : null;
  if (preSubmission && path !== c.path) updates.path = path;
  const reviewReason = decision.kind === "review" ? decision.reason : null;
  if (reviewReason !== c.reviewReason) updates.reviewReason = reviewReason;
  const proc = decision.procedure;
  if (preSubmission && proc && (proc.id !== c.procedureId || proc.version !== c.procedureVersion)) {
    updates.procedureId = proc.id;
    updates.procedureVersion = proc.version;
    updates.procedureCheckedOn = proc.checkedOn;
  }
  if (who !== c.waitingOn) updates.waitingOn = who;
  if (Object.keys(updates).length) {
    await db.claim.update({ where: { id: claimId }, data: updates });
    if (updates.status) await event(claimId, "status", STATUS_LABEL[status]);
    c = await loadAll(claimId);
  }

  const procedure = proc ?? procedureFor(c.asset.category, c.asset.institution);
  const shown = !preSubmission && c.packs.length ? (JSON.parse(c.packs[0].content) as PackContent) : content;
  return {
    id: c.id,
    assetId: c.assetId,
    institution: c.asset.institution,
    category: c.asset.category,
    maskedRef: entitled ? c.asset.maskedRef : c.asset.last4 ? `••••${c.asset.last4}` : null,
    status,
    statusLabel: STATUS_LABEL[status],
    waitingOn: who,
    dueDate: c.dueDate,
    situation: s,
    decision:
      decision.kind === "path"
        ? {
            kind: "path",
            path: decision.path,
            label: decision.procedure.paths[decision.path]!.label,
            explanation: decision.procedure.paths[decision.path]!.explanation,
            reasons: decision.reasons,
          }
        : decision.kind === "ask"
          ? { kind: "ask", question: decision.question, ...QUESTION_TEXT[decision.question], reasons: decision.reasons }
          : { kind: "review", reason: decision.reason },
    procedure: procedure
      ? {
          id: procedure.id,
          version: procedure.version,
          title: procedure.title,
          authority: procedure.authority,
          sourceUrl: procedure.sourceUrl,
          checkedOn: procedure.checkedOn,
          timeline: `${procedure.timeline.days} days of ${procedure.timeline.from}; if late, ${procedure.timeline.ifLate}.${procedure.timeline.note ? ` ${procedure.timeline.note}` : ""}`,
          whereToSubmit: procedure.whereToSubmit,
        }
      : null,
    entitled,
    // The pack carries names and amounts: shown only once the person may see this holding in full (G4).
    pack:
      entitled && shown && c.packs[0]
        ? { ...shown, version: c.packs[0].version, contentHash: c.packs[0].contentHash, gaps: packGaps(shown), ready: packGaps(shown).length === 0 }
        : null,
    approval: approval ? { id: approval.id, expiresAt: approval.expiresAt.toISOString(), contentHash: approval.contentHash } : null,
    submittedAt: c.submittedAt?.toISOString() ?? null,
    submissionChannel: c.submissionChannel,
    receiptRef: c.receiptRef,
    institutionRef: c.institutionRef,
    outcome: c.outcome,
    outcomeAmount: c.outcomeAmount,
    outcomeAmountDisplay: c.outcomeAmount ? formatInr(c.outcomeAmount) : null,
    outcomeDate: c.outcomeDate,
    outcomeNote: c.outcomeNote,
    remainderTracked: c.remainderTracked,
    packVersions: c.packs.map((p) => ({ version: p.version, status: p.status, createdAt: p.createdAt.toISOString() })),
    events: c.events.map((e) => ({ kind: e.kind, note: e.note, actor: e.actor, createdAt: e.createdAt.toISOString() })),
  };
}

/** Start a claim for a confirmed holding (one per holding — repeating returns the same claim). */
export async function startClaim(caseId: string, assetId: string): Promise<Claim> {
  const c = await db.legacyCase.findUniqueOrThrow({ where: { id: caseId } });
  if (journeyKind(c.caseType) === "personal" || c.holderLiving !== false) {
    throw new ClaimError("Claims are for holdings of someone who has died. For your own holdings, use the steps in your plan.");
  }
  const asset = await db.assetRecord.findFirst({ where: { id: assetId, caseId } });
  if (!asset) throw new ClaimError("Holding not found", 404);
  if (asset.discoveryStatus === "dismissed" || asset.duplicateState === "merged") throw new ClaimError("This holding was set aside or merged.");
  if (asset.evidenceStatus === "potential_match") throw new ClaimError("Confirm this holding first — it is still a possible match.");
  const existing = await db.claim.findFirst({ where: { assetId } });
  if (existing) return existing;
  const claim = await db.claim.create({ data: { caseId, assetId } });
  await event(claim.id, "created", `Claim started for ${asset.institution}.`, "family");
  await logEvent(caseId, "claim", `Claim started for ${asset.institution}`, "user", claim.id);
  return claim;
}

export interface ClaimEdit {
  situation?: { nominee?: string; jointHolder?: string; relationship?: string; amountBand?: string; demat?: boolean; disputed?: boolean };
  checklist?: Record<string, ChecklistEntry>;
  declarations?: string[];
}

/** Answers, documents and declarations. Allowed only before submission (or after reopening). */
export async function editClaim(claimId: string, edit: ClaimEdit) {
  const c = await db.claim.findUniqueOrThrow({ where: { id: claimId }, include: { asset: true } });
  if (!PRE_SUBMISSION.includes(c.status as ClaimStatus)) throw new ClaimError("This claim has been submitted. Record what the institution said instead.");
  const data: Prisma.ClaimUpdateInput = {};
  if (edit.situation) {
    const s = { ...json<Record<string, unknown>>(c.situation, {}) };
    const e = edit.situation;
    if (e.nominee) s.nominee = e.nominee;
    if (e.jointHolder) s.jointHolder = e.jointHolder;
    if (e.relationship) s.relationship = e.relationship;
    if (typeof e.demat === "boolean") s.demat = e.demat;
    if (typeof e.disputed === "boolean") s.disputed = e.disputed;
    if (e.amountBand) {
      const band = parseBand(e.amountBand);
      if (!band) throw new ClaimError("Unknown amount band", 400);
      s.amount = { ...band, source: "family" };
    }
    data.situation = JSON.stringify(s);
    // Nominee and joint-holder facts belong to the holding too (FL-09).
    const assetData: Prisma.AssetRecordUpdateInput = {};
    if (e.nominee) assetData.nomineeStatus = e.nominee;
    if (e.jointHolder) assetData.jointHolderStatus = e.jointHolder;
    if (Object.keys(assetData).length) await db.assetRecord.update({ where: { id: c.assetId }, data: assetData });
    await event(claimId, "answer", "You answered a question about this claim.", "family");
  }
  if (edit.checklist) {
    const current = json<Record<string, ChecklistEntry>>(c.checklist, {});
    for (const [id, entry] of Object.entries(edit.checklist)) {
      if (entry.documentId) {
        const doc = await db.documentRecord.findFirst({ where: { id: entry.documentId, caseId: c.caseId } });
        if (!doc) throw new ClaimError("That document isn't in this case", 400);
      }
      current[id] = entry;
    }
    data.checklist = JSON.stringify(current);
  }
  if (edit.declarations) data.declarations = JSON.stringify([...new Set(edit.declarations)]);
  await db.claim.update({ where: { id: claimId }, data });
  return refreshClaim(claimId);
}

/** Approve exactly this pack (FL-14): bound to its hash, recipient, channel and purpose; expires. */
export async function approvePack(claimId: string, contentHash: string, actor: string) {
  const view = await refreshClaim(claimId);
  if (!view.pack) throw new ClaimError("There is no pack to approve yet.");
  if (!view.entitled) throw new ClaimError("Show you may claim this holding first.");
  if (!view.pack.ready) throw new ClaimError(`The pack isn't ready: ${view.pack.gaps.join("; ")}`);
  if (contentHash !== view.pack.contentHash) throw new ClaimError("The pack changed since you looked at it. Please check it again.");
  const pack = await db.claimPack.findFirstOrThrow({ where: { claimId, version: view.pack.version } });
  await db.approval.updateMany({ where: { packId: pack.id, state: "active" }, data: { state: "invalidated" } });
  await db.approval.create({
    data: {
      packId: pack.id,
      contentHash,
      recipient: view.institution,
      channel: "Submitted by you (in person, by post or on the institution's own site)",
      purpose: `${view.pack.pathLabel} — ${view.pack.procedure.title}`,
      approvedBy: actor,
      expiresAt: new Date(Date.now() + APPROVAL_MINUTES * 60_000),
    },
  });
  await event(claimId, "approved", `You approved pack version ${view.pack.version} for ${view.institution}.`, "family");
  return refreshClaim(claimId);
}

/** The approved pack's content, for the download. Requires a live approval of the current version. */
export async function approvedPack(claimId: string): Promise<{ view: ClaimView; content: PackContent }> {
  const view = await refreshClaim(claimId);
  if (!view.pack || !view.approval || view.approval.contentHash !== view.pack.contentHash) {
    throw new ClaimError("Approve the current pack first (approvals last 15 minutes).", 403);
  }
  const pack = await db.claimPack.findFirstOrThrow({ where: { claimId, version: view.pack.version } });
  return { view, content: JSON.parse(pack.content) as PackContent };
}

/**
 * Record that the family submitted the pack (FL-36). With a receipt it is
 * "submitted"; without one it is "not sure it was received" — check before
 * re-sending. Repeating the same submission changes nothing.
 */
export async function recordSubmission(claimId: string, input: { channel: string; date: string; receiptRef?: string }) {
  const c = await db.claim.findUniqueOrThrow({ where: { id: claimId }, include: { packs: { orderBy: { version: "desc" }, take: 1, include: { approvals: true } } } });
  const receipt = input.receiptRef?.trim() || null;
  if (c.status === "submitted" || c.status === "submission_unknown") {
    if (c.status === "submission_unknown" && receipt) {
      await db.claim.update({ where: { id: claimId }, data: { status: "submitted", receiptRef: receipt } });
      await event(claimId, "receipt", `Receipt recorded: ${receipt}.`, "family");
    }
    return refreshClaim(claimId);
  }
  if (c.status !== "ready_for_submission") {
    throw new ClaimError("Approve the pack before recording a submission.");
  }
  const pack = c.packs[0];
  const used = pack?.approvals.find((a) => a.contentHash === pack.contentHash && a.state !== "invalidated");
  if (!used) throw new ClaimError("Approve the pack before recording a submission.");
  const asset = await db.assetRecord.findUniqueOrThrow({ where: { id: c.assetId } });
  const days = procedureFor(asset.category, asset.institution)?.timeline.days ?? null;
  const due = days ? new Date(Date.parse(input.date) + days * 86_400_000).toISOString().slice(0, 10) : null;
  await db.$transaction([
    db.approval.update({ where: { id: used.id }, data: { state: "used" } }),
    db.claim.update({
      where: { id: claimId },
      data: {
        status: receipt ? "submitted" : "submission_unknown",
        submittedAt: new Date(`${input.date}T00:00:00`),
        submissionChannel: input.channel,
        receiptRef: receipt,
        dueDate: due,
        waitingOn: receipt ? "institution" : "family",
      },
    }),
  ]);
  await event(
    claimId,
    "submitted",
    receipt
      ? `You recorded submitting pack version ${pack.version} (${input.channel}) on ${input.date}, receipt ${receipt}.`
      : `You recorded submitting pack version ${pack.version} (${input.channel}) on ${input.date} without a receipt. Check with the institution that it arrived before sending it again.`,
    "family"
  );
  return refreshClaim(claimId);
}

export interface ClaimUpdate {
  to: ClaimStatus;
  note?: string;
  institutionRef?: string;
  dueDate?: string;
  outcomeAmount?: string;
  outcomeDate?: string;
  outcomeDocumentId?: string;
}

/** Record what the institution did (FL-15, FL-16, FL-37). History is never rewritten. */
export async function recordUpdate(claimId: string, u: ClaimUpdate) {
  const c = await db.claim.findUniqueOrThrow({ where: { id: claimId } });
  const from = c.status as ClaimStatus;
  if (!canMove(from, u.to)) throw new ClaimError(`A claim that is "${STATUS_LABEL[from]}" can't move to "${STATUS_LABEL[u.to]}".`);
  const data: Prisma.ClaimUpdateInput = { status: u.to };
  if (u.institutionRef) data.institutionRef = u.institutionRef.slice(0, 60);
  const isOutcome = ["settled", "transferred", "partially_settled", "rejected", "unresolved_dispute"].includes(u.to);
  if (isOutcome) {
    if (!u.outcomeDate) throw new ClaimError("Say when this happened.", 400);
    const amount = u.outcomeAmount ? parseAmount(u.outcomeAmount, { allowBare: true }) : null;
    if (u.outcomeAmount && !amount) throw new ClaimError("The amount isn't a clear number.", 400);
    // Money received needs its amount; a transfer of units may have none.
    if ((u.to === "settled" || u.to === "partially_settled") && !amount) throw new ClaimError("Enter the amount received.", 400);
    if (u.outcomeDocumentId) {
      const doc = await db.documentRecord.findFirst({ where: { id: u.outcomeDocumentId, caseId: c.caseId } });
      if (!doc) throw new ClaimError("That document isn't in this case", 400);
    }
    data.outcome = u.to;
    data.outcomeAmount = u.to === "rejected" || u.to === "unresolved_dispute" ? null : amount?.amount ?? null;
    data.outcomeDate = u.outcomeDate;
    data.outcomeNote = u.note?.slice(0, 500) ?? null;
    data.outcomeDocumentId = u.outcomeDocumentId ?? null;
    data.remainderTracked = u.to === "partially_settled";
  }
  if (u.to === "more_information_required") {
    if (!u.dueDate) throw new ClaimError("By when does the institution want it?", 400);
    data.dueDate = u.dueDate;
  }
  if (u.to === "document_collection") {
    // Reopened: back to gathering documents; earlier packs and outcomes stay in the history.
    data.outcome = null;
    data.remainderTracked = false;
  }
  data.waitingOn = waitingOn(u.to);
  await db.claim.update({ where: { id: claimId }, data });
  const words: Partial<Record<ClaimStatus, string>> = {
    institution_review: "The institution acknowledged the claim",
    more_information_required: `The institution asked for more${u.dueDate ? ` by ${u.dueDate}` : ""}`,
    settled: `Settled${u.outcomeAmount ? `: ${u.outcomeAmount}` : ""}`,
    transferred: "Transferred",
    partially_settled: `Partly settled${u.outcomeAmount ? `: ${u.outcomeAmount}` : ""} — the rest is still tracked`,
    rejected: "Rejected — this is not a recovery",
    unresolved_dispute: "Dispute not resolved — our team can help",
    document_collection: "Reopened to gather documents again",
    submitted: "Receipt confirmed",
  };
  await event(claimId, u.to, `${words[u.to] ?? STATUS_LABEL[u.to]}${u.note ? ` — ${u.note}` : ""}.`, "family");
  await logEvent(c.caseId, "claim", `Claim update: ${STATUS_LABEL[u.to]}`, "user", claimId);
  return refreshClaim(claimId);
}

/** Short claim rows for the case workspace. */
export async function claimSummaries(caseId: string) {
  const claims = await db.claim.findMany({ where: { caseId }, select: { id: true } });
  const views: ClaimView[] = [];
  for (const c of claims) views.push(await refreshClaim(c.id));
  return views.map((v) => ({
    id: v.id,
    assetId: v.assetId,
    status: v.status,
    statusLabel: v.statusLabel,
    path: v.decision.kind === "path" ? v.decision.label : null,
    waitingOn: v.waitingOn,
    dueDate: v.dueDate,
    outcome: v.outcome,
    outcomeAmountDisplay: v.outcomeAmountDisplay,
  }));
}
