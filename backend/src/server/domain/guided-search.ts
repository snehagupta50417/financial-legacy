import type { GuidedSearchResult } from "@shared/guided-search";
export function readSearchResult(description: string): GuidedSearchResult | null {
  try { const value = JSON.parse(description); return value.kind === "guided_search_v1" && value.result?.selfReported === true ? value.result : null; } catch { return null; }
}
