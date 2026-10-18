import { z } from "zod";
import { redactIdentifiers } from "@server/core/masking";
import { db } from "@server/db";

/**
 * Keeper's saved conversation and draft state for a case (PRD FL-01, FL-02). It lives on the case
 * itself (LegacyCase.keeperUi) — NOT in CaseEvent, which is the append-only audit trail.
 *
 *  - Identifiers are redacted before anything is stored ("read, extract, forget"): a full account
 *    number typed into the chat is kept as its last four digits only.
 *  - It is self-reported draft state, so it can never carry a verification status.
 *  - Assets, proofs and approvals are not stored here; they use their own gated APIs.
 */

const Fact = z.object({
  key: z.string().max(80),
  value: z.string().max(2000).nullable(),
  state: z.enum(["unknown", "not_provided", "not_applicable", "needs_confirmation", "confirmed", "document_supported", "verified"]),
  source: z.enum(["You said", "Keeper inferred", "Document", "Sample record"]),
  date: z.string().max(40),
  note: z.string().max(2000).optional(),
  evidence: z.string().max(100).optional(),
});

const Message = z.object({
  id: z.string().max(100),
  role: z.enum(["user", "keeper", "note"]),
  text: z.string().max(20000),
  ts: z.string().max(40),
  choices: z.array(z.object({ id: z.string().max(200), label: z.string().max(300) })).max(30).optional(),
  pending: z.string().max(100).optional(),
  card: z.object({ type: z.enum(["know", "plan", "asset", "doc", "claim", "family"]), id: z.string().max(100).optional() }).optional(),
  voice: z.boolean().optional(),
});

export const KeeperUiBody = z.object({
  uiTasks: z
    .array(
      z.object({
        id: z.string().regex(/^followup:/).max(100),
        title: z.string().max(300),
        why: z.string().max(1000),
        milestone: z.enum(["understand", "gather", "review", "prepare", "claims", "follow"]),
        state: z.enum(["open", "done"]),
        blocker: z.string().max(300).optional(),
      })
    )
    .max(100)
    .default([]),
  facts: z.record(z.string().max(80), Fact),
  threads: z
    .array(
      z.object({
        id: z.string().max(100),
        title: z.string().max(300),
        journey: z.enum(["discover", "prepare", "claim"]).nullable(),
        pending: z.string().max(100).nullable(),
        messages: z.array(Message).max(1000),
      })
    )
    .min(1)
    .max(100),
  activeThread: z.string().max(100),
  contacts: z
    .array(
      z.object({
        id: z.string().max(100),
        name: z.string().max(120),
        relation: z.string().max(120),
        sees: z.object({ assets: z.boolean(), documents: z.boolean(), instructions: z.boolean(), claims: z.boolean() }),
      })
    )
    .max(100),
  family: z.object({ instructions: z.string().max(20000), reviewedAt: z.string().max(40).nullable(), cadence: z.string().max(100).nullable() }),
  plan: z
    .array(
      z.object({
        id: z.string().max(100),
        label: z.string().max(300),
        type: z.enum(["uploaded", "connected", "guided", "manual"]),
        state: z.enum(["needs_info", "awaiting_consent", "ready", "in_progress", "completed", "unavailable", "planned"]),
        note: z.string().max(3000),
        url: z.string().url().max(1000).optional(),
        result: z.string().max(3000).optional(),
      })
    )
    .max(100),
});

export type KeeperUi = z.infer<typeof KeeperUiBody>;

const r = (s: string) => redactIdentifiers(s);
const rOpt = (s: string | undefined) => (s === undefined ? undefined : r(s));

/** Draft state is self-reported: never a verification, never a document or sample source. Identifiers are redacted. */
export function sanitizeKeeperUi(ui: KeeperUi): KeeperUi {
  const facts: KeeperUi["facts"] = {};
  for (const [k, f] of Object.entries(ui.facts)) {
    facts[k] = {
      ...f,
      value: f.value === null ? null : r(f.value),
      note: rOpt(f.note),
      state: f.state === "verified" || f.state === "document_supported" ? "needs_confirmation" : f.state,
      source: f.source === "Document" || f.source === "Sample record" ? "You said" : f.source,
    };
  }
  return {
    ...ui,
    facts,
    uiTasks: ui.uiTasks.map((t) => ({ ...t, title: r(t.title), why: r(t.why), blocker: rOpt(t.blocker) })),
    threads: ui.threads.map((t) => ({ ...t, title: r(t.title), messages: t.messages.map((m) => ({ ...m, text: r(m.text) })) })),
    family: { ...ui.family, instructions: r(ui.family.instructions) },
    plan: ui.plan.map((p) => ({ ...p, note: r(p.note), result: rOpt(p.result) })),
  };
}

/** Saved state for a case, or null. First read moves any copy the old code left in the audit table. */
export async function loadKeeperUi(caseId: string): Promise<KeeperUi | null> {
  const c = await db.legacyCase.findUnique({ where: { id: caseId }, select: { keeperUi: true } });
  if (c?.keeperUi) {
    try {
      return JSON.parse(c.keeperUi) as KeeperUi;
    } catch {
      return null;
    }
  }
  const legacy = await db.caseEvent.findMany({ where: { caseId, eventType: "keeper_ui" }, orderBy: { createdAt: "desc" } });
  if (!legacy.length) return null;
  let ui: KeeperUi | null = null;
  try {
    const parsed = KeeperUiBody.safeParse(JSON.parse(legacy[0].description));
    if (parsed.success) ui = sanitizeKeeperUi(parsed.data);
  } catch {
    /* unreadable old copy: dropped */
  }
  if (ui) await db.legacyCase.update({ where: { id: caseId }, data: { keeperUi: JSON.stringify(ui) } });
  await db.caseEvent.deleteMany({ where: { caseId, eventType: "keeper_ui" } }); // these were UI blobs, not audit events
  return ui;
}

export async function saveKeeperUi(caseId: string, ui: KeeperUi): Promise<void> {
  await db.legacyCase.update({ where: { id: caseId }, data: { keeperUi: JSON.stringify(sanitizeKeeperUi(ui)) } });
}
