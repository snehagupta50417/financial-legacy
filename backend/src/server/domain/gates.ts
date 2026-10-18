import type { AssetRecord, LegacyCase } from "@prisma/client";
import { db } from "@server/db";
import { canSubmitProof, GATE_LABEL, journeyKind, maxGate, nextGate, canDiscover, type Gate } from "@server/core/gate-engine";
import { matchNames } from "@server/core/name-match";
import { panHash } from "@server/core/crypto";
import { verifyIdentity, type IdentityInput } from "@server/providers/identity";
import { verifyDeath, type DeathInput } from "@server/providers/death-proof";
import { verifyRelationship, type RelationshipInput } from "@server/providers/relationship";
import { verifyEntitlement, type EntitlementInput } from "@server/providers/entitlement";
import type { ProofOutcome } from "@server/providers/types";
import { logEvent } from "./case-service";
import type { GateId, GateSummary, ProofView } from "@shared/types";

export const DUPLICATE_FREEZE_REASON =
  "Another person has opened a case for the same deceased. To protect everyone, disclosure is paused until a reviewer confirms who may proceed.";

export type GateResult =
  | { ok: true; proof: ProofView; gate: GateSummary }
  | { ok: false; status: number; error: string };

export function gateSummary(c: Pick<LegacyCase, "caseType" | "gateReached" | "frozenReason" | "linkedCaseId">): GateSummary {
  const next = nextGate(c);
  return {
    reached: c.gateReached as GateId,
    next,
    nextLabel: next ? GATE_LABEL[next] : null,
    journeyKind: journeyKind(c.caseType),
    discoveryUnlocked: canDiscover(c),
    frozenReason: c.frozenReason ?? null,
    linkedCaseId: c.linkedCaseId ?? null,
  };
}

export function proofView(p: { id: string; kind: string; assetId: string | null; provider: string; status: string; matchedFields: string; note: string | null; createdAt: Date }): ProofView {
  let matched: unknown = {};
  try {
    matched = JSON.parse(p.matchedFields);
  } catch {}
  return {
    ...p,
    kind: p.kind as ProofView["kind"],
    status: p.status as ProofView["status"],
    matchedFields: matched as ProofView["matchedFields"],
    createdAt: p.createdAt.toISOString(),
  };
}

async function recordProof(c: LegacyCase, kind: string, outcome: ProofOutcome, assetId?: string) {
  return db.proof.create({
    data: {
      caseId: c.id,
      kind,
      assetId: assetId ?? null,
      provider: outcome.provider,
      status: outcome.status,
      matchedFields: JSON.stringify(outcome.matchedFields),
      note: outcome.note,
    },
  });
}

async function leadClaimant(caseId: string, sessionId: string) {
  return (
    (await db.claimant.findFirst({ where: { caseId, sessionId, role: "lead" } })) ??
    (await db.claimant.create({ data: { caseId, sessionId, role: "lead" } }))
  );
}

async function advance(c: LegacyCase, to: Gate): Promise<LegacyCase> {
  const reached = maxGate(c.gateReached, to);
  if (reached === c.gateReached) return c;
  const updated = await db.legacyCase.update({ where: { id: c.id }, data: { gateReached: reached } });
  await logEvent(c.id, "gate", `Gate reached: ${reached} — ${GATE_LABEL[reached]}`, "system");
  return updated;
}

function statusWord(s: string) {
  return s === "verified" ? "verified" : s === "needs_review" ? "sent to manual review" : "not completed";
}

// ── G1 ──────────────────────────────────────────────────────────────────────
export async function submitIdentity(c: LegacyCase, sessionId: string, input: IdentityInput): Promise<GateResult> {
  const check = canSubmitProof(c, "identity");
  if (!check.ok) return check;
  const outcome = await verifyIdentity(input);
  const proof = await recordProof(c, "identity", outcome);
  const claimant = await leadClaimant(c.id, sessionId);
  await db.claimant.update({
    where: { id: claimant.id },
    data: {
      fullName: input.fullName.trim().slice(0, 120),
      identityStatus: outcome.status === "verified" ? "verified" : outcome.status === "needs_review" ? "needs_review" : "pending",
      relationshipStatus: journeyKind(c.caseType) === "personal" ? "not_required" : claimant.relationshipStatus,
    },
  });
  await logEvent(c.id, "gate", `Identity check ${statusWord(outcome.status)} (${outcome.provider})`, "user", proof.id);
  const updated = outcome.status === "verified" ? await advance(c, "G1") : c;
  return { ok: true, proof: proofView(proof), gate: gateSummary(updated) };
}

// ── G2 ──────────────────────────────────────────────────────────────────────
export async function submitDeath(
  c: LegacyCase,
  sessionId: string,
  input: DeathInput & { pan?: string | null }
): Promise<GateResult> {
  const check = canSubmitProof(c, "death");
  if (!check.ok) return check;
  const outcome = await verifyDeath(input);
  const proof = await recordProof(c, "death", outcome);

  const name = (outcome.record?.name ?? input.deceasedName).slice(0, 120);
  const dob = input.dob ?? outcome.record?.dob ?? null;
  const dateOfDeath = input.dateOfDeath ?? outcome.record?.dateOfDeath ?? null;
  const ph = panHash(input.pan);
  const deathProofStatus = outcome.status === "verified" ? "verified" : "needs_review";

  // One case per deceased: find an existing record for the same person.
  const candidates = await db.deceasedPerson.findMany({
    where: { OR: [...(ph ? [{ panHash: ph }] : []), ...(dob ? [{ dob }] : [])] },
    include: { cases: { select: { id: true, sessionId: true, linkedCaseId: true, isDemo: true } } },
  });
  const same = candidates.find(
    (d) =>
      (ph && d.panHash === ph) ||
      (!!dob && d.dob === dob && matchNames(d.name, name).outcome === "match")
  );

  let personId: string;
  if (same) {
    personId = same.id;
    await db.deceasedPerson.update({
      where: { id: same.id },
      data: {
        nameVariants: JSON.stringify([...new Set([...safeArray(same.nameVariants), name])]),
        panHash: same.panHash ?? ph,
      },
    });
  } else if (c.deceasedPersonId) {
    personId = c.deceasedPersonId;
    await db.deceasedPerson.update({
      where: { id: personId },
      data: { name, dob, dateOfDeath, panHash: ph, deathProofStatus },
    });
  } else {
    const p = await db.deceasedPerson.create({
      data: { name, nameVariants: JSON.stringify([name]), dob, dateOfDeath, panHash: ph, deathProofStatus },
    });
    personId = p.id;
  }

  let updated = await db.legacyCase.update({
    where: { id: c.id },
    data: { deceasedPersonId: personId, assetHolderName: c.assetHolderName ?? name },
  });

  // Demo cases never freeze each other: many visitors replay the same synthetic
  // persona from different browsers. (The impostor story is shown in Verify.)
  const rivals = c.isDemo
    ? []
    : (same?.cases ?? []).filter((x) => x.id !== c.id && x.sessionId !== sessionId && !x.isDemo);
  if (rivals.length) {
    updated = await db.legacyCase.update({
      where: { id: c.id },
      data: { frozenReason: DUPLICATE_FREEZE_REASON, linkedCaseId: rivals[0].id },
    });
    for (const r of rivals) {
      await db.legacyCase.update({
        where: { id: r.id },
        data: { frozenReason: DUPLICATE_FREEZE_REASON, linkedCaseId: r.linkedCaseId ?? c.id },
      });
      await logEvent(r.id, "gate", "Case frozen: another claimant opened a case for the same deceased person", "system");
    }
    await logEvent(c.id, "gate", "Case frozen: another claimant already has a case for this deceased person", "system");
  }

  await logEvent(c.id, "gate", `Death proof ${statusWord(outcome.status)} (${outcome.provider})`, "user", proof.id);
  if (outcome.status === "verified") updated = await advance(updated, "G2");
  return { ok: true, proof: proofView(proof), gate: gateSummary(updated) };
}

// ── G3 ──────────────────────────────────────────────────────────────────────
export async function submitRelationship(c: LegacyCase, sessionId: string, input: RelationshipInput): Promise<GateResult> {
  const check = canSubmitProof(c, "relationship");
  if (!check.ok) return check;
  const kind = journeyKind(c.caseType);
  if (kind === "caregiver" && input.method !== "relative_consent") {
    return { ok: false, status: 400, error: "Caregiver journeys need the relative's own consent (method: relative_consent)." };
  }
  if (kind !== "caregiver" && input.method === "relative_consent") {
    return { ok: false, status: 400, error: "relative_consent applies only to caregiver journeys." };
  }
  const person = c.deceasedPersonId ? await db.deceasedPerson.findUnique({ where: { id: c.deceasedPersonId } }) : null;
  const claimant = await leadClaimant(c.id, sessionId);
  const outcome = await verifyRelationship(input, { deceasedName: person?.name ?? null, claimantName: claimant.fullName });
  const proof = await recordProof(c, "relationship", outcome);
  await db.claimant.update({
    where: { id: claimant.id },
    data: {
      relationship: input.relationship.slice(0, 60),
      relationshipStatus: outcome.status === "verified" ? "verified" : outcome.status === "needs_review" ? "needs_review" : "pending",
    },
  });
  if (kind === "caregiver" && outcome.status === "verified") {
    await db.consentRecord.create({
      data: {
        sessionId,
        caseId: c.id,
        purpose: `Consent from ${input.relativeName} for caregiver access`,
        scope: "caregiver",
      },
    });
  }
  await logEvent(c.id, "gate", `Relationship proof ${statusWord(outcome.status)} (${outcome.provider})`, "user", proof.id);
  let updated = await db.legacyCase.update({ where: { id: c.id }, data: { relationship: c.relationship ?? input.relationship.slice(0, 60) } });
  if (outcome.status === "verified") updated = await advance(updated, "G3");
  return { ok: true, proof: proofView(proof), gate: gateSummary(updated) };
}

// ── G4 (per asset) ──────────────────────────────────────────────────────────
export async function submitEntitlement(c: LegacyCase, asset: AssetRecord, input: EntitlementInput): Promise<GateResult> {
  const check = canSubmitProof(c, "entitlement");
  if (!check.ok) return check;
  const outcome = await verifyEntitlement(input, asset);
  const proof = await recordProof(c, "entitlement", outcome, asset.id);
  if (outcome.status === "verified") {
    await db.assetRecord.update({ where: { id: asset.id }, data: { entitled: true } });
  }
  await logEvent(c.id, "gate", `Entitlement for ${asset.institution} ${statusWord(outcome.status)} (${outcome.provider})`, "user", proof.id);
  const updated = outcome.status === "verified" ? await advance(c, "G4") : c;
  return { ok: true, proof: proofView(proof), gate: gateSummary(updated) };
}

function safeArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
