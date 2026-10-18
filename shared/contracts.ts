/**
 * Shapes the backend returns and the frontend reads. They live here, in neither package, so each side can
 * be built and deployed alone and a change to a contract is a visible change to one shared file.
 * Types only: nothing in this file runs.
 */
import type { ClaimStatus } from "./claim-lifecycle";
import type { PackContent } from "./claim-pack";
import type { Situation } from "./claim-path";

/** A claim as the API returns it (GET /api/claims/:id). */
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

export type AgentCard = "know" | "plan" | "asset" | "doc" | "claim" | "family";
export type AgentCategory = "bank" | "mutual_fund" | "insurance" | "retirement" | "other";

/** What the voice agent may propose. The backend vets each one; the browser runs the ones it returns. */
export type AgentActionBody =
  | { type: "open"; card: AgentCard; id?: string }
  | { type: "remember"; key: string; value: string }
  | { type: "look_up"; question: string }
  | { type: "add_asset"; institution: string; category: AgentCategory; ref?: string }
  | { type: "confirm_asset"; assetId: string }
  | { type: "start_claim"; assetId: string }
  | { type: "complete_task"; taskId: string };

/** A vetted proposal. `confirm` means the person must say or tap yes before it runs. */
export type AgentAction = AgentActionBody & { confirm: boolean; label: string };

/** POST /api/ai/agent response. */
export interface AgentTurn {
  say: string;
  actions: AgentAction[];
  listen: boolean;
  finish: boolean;
  /** Keeper wants to offer a person (could not follow, or a matter it should not handle alone). */
  handoff: boolean;
}
