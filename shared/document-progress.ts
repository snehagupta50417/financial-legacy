export interface DocumentProgress {
  summary: string;
  steps: { key: string; label: string; state: "done" | "action" | "waiting" | "external"; detail: string }[];
  next: { type: "doc" | "asset" | "claim"; id: string; label: string };
  claimId?: string;
}
