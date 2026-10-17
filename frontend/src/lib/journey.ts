/**
 * The six steps of the one-pager (§4) and the action cards on the Conversation
 * page, worked out only from saved case data. Pure functions — no React.
 *
 * Honesty rules (PRD FL-07, DESIGN §1): discovery is never shown as finished,
 * a potential match is never counted as confirmed, and progress means saved
 * steps, not a percentage of assets found.
 */
import type { CaseWorkspace } from "./types";

export type StageState = "done" | "current" | "ongoing" | "upcoming" | "on_hold";

export interface Stage {
  key: "talk" | "verify" | "discover" | "consolidate" | "act" | "track";
  title: string;
  state: StageState;
  detail: string;
}

type Ws = Pick<CaseWorkspace, "gate" | "case" | "assets" | "documents" | "tasks"> & Partial<Pick<CaseWorkspace, "claims">>;

const BEFORE_SUBMISSION = ["draft", "authority_review", "document_collection", "pack_review", "ready_for_submission"];
const FINISHED = ["settled", "transferred", "rejected"];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function activeHoldings(ws: Pick<Ws, "assets">) {
  return ws.assets.filter((a) => a.discoveryStatus !== "dismissed");
}

export function potentialMatches(ws: Pick<Ws, "assets">) {
  return activeHoldings(ws).filter((a) => a.evidenceStatus === "potential_match");
}

/** Extracted documents whose fields nobody has reviewed yet (FL-06). */
export function documentsToReview(ws: Pick<Ws, "documents">) {
  return ws.documents.filter((d) => d.extractionStatus === "extracted" && !d.userVerified && d.extractedFields.length > 0);
}

export function isClaimsCase(ws: Pick<Ws, "case">) {
  return ws.case.holderLiving === false;
}

export function journeyStages(ws: Ws): Stage[] {
  const unlocked = ws.gate.discoveryUnlocked;
  const frozen = !!ws.gate.frozenReason;
  const holdings = activeHoldings(ws);
  const matches = potentialMatches(ws);
  const toReview = documentsToReview(ws);
  const pending = matches.length + toReview.length;
  const reviewed = unlocked && holdings.length > 0 && pending === 0;
  const done = ws.tasks.filter((t) => t.status === "completed").length;
  const waiting = ws.tasks.filter((t) => t.status === "waiting_institution").length;
  const claims = isClaimsCase(ws);

  const verify: Stage = frozen
    ? { key: "verify", title: "Verify identity and authority", state: "on_hold", detail: "Paused for review" }
    : unlocked
      ? { key: "verify", title: "Verify identity and authority", state: "done", detail: "Checks passed (simulated)" }
      : { key: "verify", title: "Verify identity and authority", state: "current", detail: ws.gate.nextLabel ?? "Next check" };

  const discover: Stage = !unlocked
    ? { key: "discover", title: "Discover assets", state: "upcoming", detail: "After verification" }
    : holdings.length === 0 && ws.documents.length === 0
      ? { key: "discover", title: "Discover assets", state: "current", detail: "Upload a document or tell us what you remember" }
      : { key: "discover", title: "Discover assets", state: "ongoing", detail: `${plural(holdings.length, "holding")} found so far` };

  const consolidate: Stage = !unlocked || holdings.length + ws.documents.length === 0
    ? { key: "consolidate", title: "Check and organise", state: "upcoming", detail: "Once something is found" }
    : pending > 0
      ? { key: "consolidate", title: "Check and organise", state: "current", detail: `${plural(pending, "item")} to check` }
      : { key: "consolidate", title: "Check and organise", state: "done", detail: "Everything found so far is checked" };

  // Claims progress independently, so preparing one can start before every holding is checked.
  const started = ws.claims ?? [];
  const sent = started.filter((c) => !BEFORE_SUBMISSION.includes(c.status));
  const finished = started.filter((c) => FINISHED.includes(c.status));
  const claimable = holdings.filter((a) => a.evidenceStatus !== "potential_match");
  const notStarted = claimable.filter((a) => !started.some((c) => c.assetId === a.id)).length;

  const actTitle = claims ? "Prepare claims" : "Prepare your legacy";
  const act: Stage =
    claims && started.length
      ? sent.length === started.length && notStarted === 0
        ? { key: "act", title: actTitle, state: "done", detail: `${plural(sent.length, "claim")} submitted by you` }
        : { key: "act", title: actTitle, state: "current", detail: `${plural(started.length, "claim")} started${sent.length ? `, ${sent.length} submitted` : ""}` }
      : reviewed
        ? { key: "act", title: actTitle, state: "current", detail: claims ? "One claim per holding" : "Notes and gaps for your family" }
        : { key: "act", title: actTitle, state: "upcoming", detail: "After checking" };

  const track: Stage =
    sent.length > 0
      ? finished.length === sent.length && notStarted === 0 && sent.length === started.length
        ? { key: "track", title: "Track to the end", state: "done", detail: `${plural(finished.length, "claim")} closed` }
        : { key: "track", title: "Track to the end", state: "ongoing", detail: `${plural(sent.length - finished.length, "claim")} with the institution or awaiting you` }
      : ws.tasks.length > 0 && done === ws.tasks.length
      ? { key: "track", title: "Track to the end", state: "done", detail: "All saved steps done" }
      : waiting > 0
        ? { key: "track", title: "Track to the end", state: "ongoing", detail: `Waiting on ${plural(waiting, "institution")}` }
        : done > 0
          ? { key: "track", title: "Track to the end", state: "ongoing", detail: `${done} of ${ws.tasks.length} steps done` }
          : { key: "track", title: "Track to the end", state: "upcoming", detail: ws.tasks.length ? `${ws.tasks.length} steps saved` : "No steps yet" };

  return [
    { key: "talk", title: "Tell us what happened", state: "done", detail: ws.case.scenarioLabel ?? "Case started" },
    verify,
    discover,
    consolidate,
    act,
    track,
  ];
}

/** The step to point the person at: the first one that needs them. */
export function currentStage(stages: Stage[]): Stage {
  return stages.find((s) => s.state === "current" || s.state === "on_hold") ?? stages.find((s) => s.state === "ongoing") ?? stages[stages.length - 1];
}

export type ActionKind = "hold" | "gate" | "review_document" | "check_matches" | "failed_document" | "next_step" | "add_records";

export interface CaseAction {
  kind: ActionKind;
  title: string;
  body: string;
  cta: string;
  /** Path relative to the case, e.g. "records/documents/abc"; "" is the case home. */
  to: string;
}

/** Action cards for the Conversation page, most urgent first. Built from data only. */
export function caseActions(ws: Ws): CaseAction[] {
  if (ws.gate.frozenReason) {
    return [{ kind: "hold", title: "This case is paused", body: "A person on our team needs to look at it. Nothing about the assets is shown until then.", cta: "Get help", to: "help" }];
  }
  const out: CaseAction[] = [];
  if (!ws.gate.discoveryUnlocked) {
    out.push({
      kind: "gate",
      title: ws.gate.nextLabel ? `Next: ${ws.gate.nextLabel}` : "Next: verification",
      body:
        ws.gate.journeyKind === "personal"
          ? "One identity check, then we start looking for your assets."
          : "Before anything about the assets is looked up, we check who you are, the death and your relationship.",
      cta: "Continue verification",
      to: "#verification",
    });
    return out;
  }
  for (const d of documentsToReview(ws).slice(0, 3)) {
    out.push({
      kind: "review_document",
      title: `Check what we read from ${d.fileName}`,
      body: `${plural(d.extractedFields.length, "value")} to confirm. Nothing counts as a fact until you've checked it.`,
      cta: "Check values",
      to: `records/documents/${d.id}`,
    });
  }
  const matches = potentialMatches(ws);
  if (matches.length) {
    out.push({
      kind: "check_matches",
      title: `${plural(matches.length, "possible holding")} to confirm`,
      body: "These were suggested by a document or a search. Please check each one before it is treated as real.",
      cta: "Review in Records",
      to: "records",
    });
  }
  for (const d of ws.documents.filter((x) => x.extractionStatus === "failed").slice(0, 2)) {
    out.push({
      kind: "failed_document",
      title: `We couldn't read ${d.fileName}`,
      body: d.extractionNote ?? "Please try a clearer copy.",
      cta: "Try another copy",
      to: "records/documents",
    });
  }
  const next = ws.tasks.find((t) => t.isNextBest && t.status !== "completed");
  if (next) out.push({ kind: "next_step", title: next.title, body: next.rationale ?? next.instructions, cta: "Open steps", to: "steps" });
  if (activeHoldings(ws).length === 0 && ws.documents.length === 0) {
    out.push({
      kind: "add_records",
      title: "Add what you have",
      body: "A bank statement, policy receipt or fund statement is the quickest way to start. You can also add a holding you already know about.",
      cta: "Upload a document",
      to: "records/documents",
    });
  }
  return out;
}

/** Holdings grouped the way DESIGN §6 asks: by evidence status, potential matches kept apart. */
export const EVIDENCE_GROUPS = ["institution_verified", "document_backed", "self_declared", "potential_match"] as const;

export interface Gap {
  kind: "confirm_matches" | "review_document" | "add_document" | "check" | "missing_info";
  text: string;
  /** Path relative to the case, as in CaseAction.to. */
  to: string;
}

/**
 * The legacy gaps checklist (DESIGN §5.3, §7.1): what would make the record
 * more useful to the family. Built only from saved data; no guesses.
 */
export function legacyGaps(ws: Ws): Gap[] {
  const gaps: Gap[] = [];
  const matches = potentialMatches(ws);
  if (matches.length) {
    gaps.push({ kind: "confirm_matches", text: `Confirm or set aside ${plural(matches.length, "possible holding")}`, to: "records" });
  }
  for (const d of documentsToReview(ws)) {
    gaps.push({ kind: "review_document", text: `Check the values read from ${d.fileName}`, to: `records/documents/${d.id}` });
  }
  for (const a of activeHoldings(ws)) {
    if (a.discoveryStatus === "confirmed" && a.evidenceStatus === "self_declared") {
      gaps.push({ kind: "add_document", text: `Add a statement or policy for ${a.institution}`, to: "records/documents" });
    }
  }
  for (const s of ws.case.assumptions) gaps.push({ kind: "check", text: s, to: "" });
  const seen = new Set<string>();
  for (const t of ws.tasks) {
    if (t.status === "completed") continue;
    for (const m of t.missingInfo) {
      if (seen.has(m)) continue;
      seen.add(m);
      gaps.push({ kind: "missing_info", text: m, to: "steps" });
    }
  }
  return gaps;
}
