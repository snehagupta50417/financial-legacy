/**
 * The case areas and their URLs (DESIGN §2.2–2.3). Pure — shared by the shell,
 * the bottom navigation and tests.
 */

export type CaseArea = "conversation" | "records" | "plan" | "claims" | "steps" | "help";

/** Claims for a deceased holder's case, Plan otherwise — never both (DESIGN §2.2). */
export function goalArea(holderLiving: boolean | null): "plan" | "claims" {
  return holderLiving === false ? "claims" : "plan";
}

export function caseHref(caseId: string, area: CaseArea = "conversation"): string {
  const base = `/cases/${encodeURIComponent(caseId)}`;
  return area === "conversation" ? base : `${base}/${area}`;
}

/** Which area a pathname belongs to, for highlighting the current tab. */
export function areaOf(pathname: string, caseId: string): CaseArea {
  const rest = pathname.slice(caseHref(caseId).length).split("/").filter(Boolean)[0];
  if (rest === "records" || rest === "plan" || rest === "claims" || rest === "steps" || rest === "help") return rest;
  return "conversation";
}

/** Old workspace tab keys (still used by the overview cards) → area URLs. */
export function hrefForTab(caseId: string, tab: string): string {
  switch (tab) {
    case "assets":
      return caseHref(caseId, "records");
    case "documents":
      return `${caseHref(caseId, "records")}/documents`;
    case "journey":
      return caseHref(caseId, "steps");
    case "expert":
      return caseHref(caseId, "help");
    default:
      return caseHref(caseId);
  }
}
