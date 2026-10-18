import type { AppState } from "./types";
export interface TurnScope { caseId: string; threadId: string }
export function captureScope(state: AppState | null | undefined): TurnScope | null {
  const c = state?.cases[state.activeCase];
  return c ? { caseId: c.id, threadId: c.activeThread } : null;
}
export function matchesScope(state: AppState | null | undefined, scope: TurnScope | null): boolean {
  const current = captureScope(state);
  return !!scope && !!current && scope.caseId === current.caseId && scope.threadId === current.threadId;
}
export function executionReply(original: string, completed: string[], failed: string[]): string {
  return failed.length ? ["Some steps did not complete.", completed.length ? "Completed: " + completed.join("; ") + "." : "No action completed.", "Failed: " + failed.join("; ") + ". Please review before trying again."].join(" ") : original;
}
