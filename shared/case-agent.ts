export interface CaseAgentStep { label: string; claimId?: string }
export interface CaseAgentResult { summary: string; needs: string[]; target: { type: "know" | "doc" | "asset" | "claim"; id?: string }; fingerprint?: string }
export interface CaseAgentView {
  id: string; status: "queued" | "running" | "paused" | "waiting_user" | "succeeded" | "failed";
  cursor: number; revision: number; attempts: number; updatedAt: string;
  plan: CaseAgentStep[]; receipts: { text: string; at: string }[]; result: CaseAgentResult | null; error: string | null;
}
