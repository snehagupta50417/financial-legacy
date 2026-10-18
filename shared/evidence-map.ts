export interface EvidenceNode {
  id: string; kind: "case" | "asset" | "document" | "field" | "review" | "observation" | "search" | "claim" | "pack";
  label: string; status: string; detail?: string; excerpt?: string; at?: string;
  target?: { type: "asset" | "doc" | "claim" | "plan"; id?: string };
}
export interface EvidenceMap {
  caseId: string; generatedAt: string; fingerprint: string; truncated: boolean;
  nodes: EvidenceNode[];
  edges: { from: string; to: string; relation: string }[];
  warnings: { id: string; kind: "duplicate" | "rejected" | "conflict" | "unreviewed"; text: string; nodeIds: string[] }[];
}
export interface WorkflowView {
  id: string; claimId: string; status: "queued" | "running" | "waiting_user" | "succeeded" | "failed";
  cursor: number; revision: number; attempts: number; updatedAt: string; error: string | null;
  checkpoints: { step: string; at: string; fingerprint: string }[];
  result: { fingerprint: string; gaps: string[]; next: string; ready: boolean; claimStatus: string; packHash: string | null } | null;
}
export const CLAIM_REVIEW_STEPS = ["Collect source evidence", "Check inconsistencies", "Prepare claim review"] as const;
