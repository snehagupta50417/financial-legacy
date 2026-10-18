export const SEARCH_OUTCOMES = ["possible_match", "no_match", "partly_checked", "blocked", "failed"] as const;
export type SearchOutcome = typeof SEARCH_OUTCOMES[number];
export interface GuidedSearchResult {
  id: string; caseId: string; taskId: string; sourceUrl: string; sourceName: string;
  outcome: SearchOutcome; scope: string; searchedAt: string; recordedAt: string;
  evidenceNote: string; documentId?: string; summary: string; selfReported: true;
}
export const SEARCH_LABEL: Record<SearchOutcome, string> = {
  possible_match: "Possible match", no_match: "No match in this search", partly_checked: "Partly checked", blocked: "Blocked", failed: "Search failed",
};
