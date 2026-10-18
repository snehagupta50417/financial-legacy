import type { CheckResult, ClaimRoute, DocKind, Rating, RiskLevel } from "./verify-rules";

/** What the Verify console API returns and the console UI reads. Types only. */

export type VerifyStatus = "awaiting_review" | "documents_requested" | "escalated" | "approved";
export const STATUS_LABEL: Record<VerifyStatus, string> = {
  awaiting_review: "Awaiting review",
  documents_requested: "Documents requested",
  escalated: "Escalated",
  approved: "Approved",
};
export type ClaimSource = "FinLegacy" | "Branch";

export interface QueueRow {
  id: string;
  code: string;
  deceasedName: string;
  claimantName: string;
  relationship: string;
  institution: string;
  productLabel: string;
  productLast4: string;
  receivedAt: string;
  daysRemaining: number;
  dueSoon: boolean;
  risk: RiskLevel;
  status: VerifyStatus;
  source: ClaimSource;
  /** Codes of the other claims for the same deceased and product, if any (data based, before any check is run). */
  duplicateOf: string[];
}
export interface QueueView {
  console: { institution: string; institutionLabel: string; reviewer: string };
  claims: QueueRow[];
  tiles: { awaitingReview: number; highRisk: number; dueSoon: number; avgDecisionDays: number | null };
}

export interface DocField { key: string; label: string; value: string }
export interface DocSignal { fieldKey: string; kind: string; note: string }
export interface DocView { id: string; kind: DocKind; title: string; issuer: string; fields: DocField[]; signals: DocSignal[]; readable: boolean }
export interface RunView { id: string; createdAt: string; rating: Rating; results: CheckResult[] }
export interface TimelineEvent { id: string; kind: string; actor: string; note: string; createdAt: string; meta: Record<string, unknown> }

export interface ClaimDetail {
  claim: QueueRow & {
    contactMasked: string; amountMin: number; amountMax: number; route: ClaimRoute; routeLabel: string;
    dueAt: string; decidedAt: string | null;
  };
  documents: DocView[];
  requiredDocuments: { kind: DocKind; label: string; present: boolean }[];
  latestRun: RunView | null;
  timeline: TimelineEvent[];
}

export type DecisionAction = "approve" | "request_documents" | "escalate";
export type EscalationReason = "suspected_fraud" | "claimant_dispute" | "legal_review";
export const ESCALATION_LABEL: Record<EscalationReason, string> = {
  suspected_fraud: "Suspected fraud",
  claimant_dispute: "Dispute between claimants",
  legal_review: "Needs legal review",
};
export interface DecisionBody {
  action: DecisionAction;
  note?: string;
  reason?: EscalationReason;
  documents?: DocKind[];
  message?: string;
  /** The reviewer has read the warning (approving High risk, or escalating Low risk). */
  acknowledged?: boolean;
}
