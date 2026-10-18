import type { CaseWorkspace } from "@shared/types";
import type { ClaimView } from "@shared/contracts";
/**
 * Keeper prototype data model. Everything the UI shows — conversation, facts, assets,
 * documents, family record, claims, tasks, approvals, activity — lives in one case record,
 * so conversation and structured views are always the same work. Synthetic data only.
 */

export type Journey = "discover" | "prepare" | "claim";

export type FactState =
  | "unknown" // "I don't know" — creates a follow-up task
  | "not_provided" // skipped for now
  | "not_applicable"
  | "needs_confirmation"
  | "confirmed" // confirmed by the user
  | "document_supported"
  | "verified"; // through an implemented source (none in the prototype)

export type FactSource = "You said" | "Keeper inferred" | "Document" | "Sample record";

export interface Fact {
  key: string;
  value: string | null;
  state: FactState;
  source: FactSource;
  date: string; // ISO
  note?: string; // conflict or uncertainty
  evidence?: string; // document id
}

export type Category = "bank" | "mutual_fund" | "insurance" | "retirement" | "other";
export type Evidence = "self_declared" | "potential_match" | "document_backed" | "institution_verified";

export interface Asset {
  id: string;
  institution: string;
  category: Category;
  ref: string | null; // masked only
  owner: string;
  evidence: Evidence;
  confirmed: boolean; // false for clues found in a document until the user confirms
  amount: { value: number; type: string; asOf: string } | null;
  nomination: "recorded" | "none" | "unknown";
  docIds: string[];
  lastChecked: string | null;
  next: string;
  duplicateOf?: string;
  history: { at: string; text: string }[];
}

export interface DocField {
  id: string;
  label: string;
  value: string;
  excerpt: string;
  reviewed: boolean;
  corrected?: boolean;
}

export interface Doc {
  id: string;
  name: string;
  kind: string;
  state: "processing" | "ready" | "unreadable" | "password" | "duplicate";
  sample: true;
  text: string;
  fields: DocField[];
  assetId?: string;
  addedAt: string;
}

export type Milestone = "understand" | "gather" | "review" | "prepare" | "claims" | "follow";

export interface Task {
  id: string;
  title: string;
  why: string;
  milestone: Milestone;
  state: "open" | "done";
  blocker?: string;
}

export interface Contact {
  id: string;
  name: string;
  relation: string;
  sees: { assets: boolean; documents: boolean; instructions: boolean; claims: boolean };
}

export type ClaimStage = "intake" | "authority" | "requirements" | "documents" | "review" | "submission" | "followup" | "outcome";
export type Outcome = "settled" | "transferred" | "partially_settled" | "rejected" | "withdrawn" | "unresolved_dispute";

export interface Approval {
  id: string;
  hash: string;
  recipient: string;
  channel: string;
  includes: string[];
  declarations: string[];
  state: "requested" | "approved" | "invalidated" | "used" | "cancelled";
}

export interface Claim {
  backend?: ClaimView;
  id: string;
  assetId: string;
  claimant: { name: string; relation: string; verification: "not_started" | "awaiting_review" | "sample_reviewed" };
  situation: { nominee: "recorded" | "none" | "unknown"; jointHolder: "surviving" | "none" | "unknown"; amountBand: string | null };
  have: Record<string, boolean>; // requirement id → user has it
  declarations: string[]; // accepted declaration ids
  approval: Approval | null;
  prepared: boolean;
  submitted: { at: string; ref: string; method: string } | null;
  acknowledged: { at: string; note: string } | null;
  outcome: { kind: Outcome; at: string; note: string } | null;
  lastConfirmed: string | null;
  nextFollowUp: string | null;
}

export type ActivityKind = "prepared" | "confirmed" | "approved" | "sent" | "institution";
export interface Activity {
  id: string;
  at: string;
  kind: ActivityKind;
  text: string;
}

export interface Choice {
  id: string;
  label: string;
}

export interface Message {
  id: string;
  role: "user" | "keeper" | "note";
  text: string;
  ts: string;
  choices?: Choice[];
  /** Which slot this message asks about (renders "I don't know / Skip / Why?"). */
  pending?: string;
  card?: { type: "know" | "plan" | "asset" | "doc" | "claim" | "family"; id?: string };
  voice?: boolean;
}

export interface Thread {
  id: string;
  title: string;
  journey: Journey | null;
  pending: string | null;
  messages: Message[];
}

export interface PlanSource {
  id: string;
  label: string;
  type: "uploaded" | "connected" | "guided" | "manual";
  state: "needs_info" | "awaiting_consent" | "ready" | "in_progress" | "completed" | "unavailable" | "planned";
  note: string;
  url?: string;
  result?: string; // what the user recorded, with its scope
}

export interface Case {
  uiTasks?: Task[];
  backendId?: string;
  gate?: CaseWorkspace["gate"];
  proofs?: CaseWorkspace["proofs"];
  id: string;
  name: string; // "My financial record" | "Estate of …"
  kind: "self" | "estate";
  subject: string; // whose information this is
  facts: Record<string, Fact>;
  assets: Asset[];
  docs: Doc[];
  tasks: Task[];
  contacts: Contact[];
  claims: Claim[];
  activity: Activity[];
  plan: PlanSource[];
  threads: Thread[];
  activeThread: string;
  family: { instructions: string; reviewedAt: string | null; cadence: string | null };
  context: string[]; // minor manual edits, mentioned at the next natural moment
  focus: { type: "know" | "asset" | "doc" | "claim" | "family" | "plan"; id?: string } | null;
}

export interface Session {
  mode: "sample" | "signin";
  name: string;
}

export interface AppState {
  attachments?: Record<string, { id: string; name: string; threadId: string; state: "ready" | "uploading" | "failed"; error?: string }>;
  drafts?: Record<string, string>;
  v: 1;
  session: Session | null;
  activeCase: string;
  order: string[];
  cases: Record<string, Case>;
  voiceDisclosed: boolean;
  speakReplies: boolean;
}
