import type { Case } from "./types";
import { nextWork } from "./presentation";

export const claimStillOpen = (claim: Case["claims"][number]) => !claim.outcome || ["partially_settled", "unresolved_dispute"].includes(claim.outcome.kind) || !!claim.backend?.remainderTracked;

/** Read only from this case. A saved preference is not background monitoring. */
export function caseBriefing(c: Case) {
  const assets = c.assets.filter(a => !a.duplicateOf);
  const openClaims = c.claims.filter(claimStillOpen);
  const unreviewed = c.docs.filter(d => d.state === "ready").reduce((n, d) => n + d.fields.filter(f => !f.reviewed).length, 0);
  const followUps = Object.entries(c.followUps ?? {}).filter(([key, value]) => value.enabled && (key.startsWith("claim:") ? openClaims.some(cl => cl.id === key.slice(6)) : c.plan.some(p => p.id === key.slice(7))));
  const next = nextWork(c);
  const parts = [assets.length ? `${assets.length} holding${assets.length === 1 ? "" : "s"} noted` : null, openClaims.length ? `${openClaims.length} open claim${openClaims.length === 1 ? "" : "s"}` : null, unreviewed ? `${unreviewed} detail${unreviewed === 1 ? "" : "s"} to review` : null].filter(Boolean);
  const summary = parts.length ? parts.join(" · ") : "Your conversation and saved details are here.";
  return { summary, next, openClaims: openClaims.length, unreviewed, followUps: followUps.length,
    greeting: "Welcome back. " + (parts.length ? "We have " + parts.join(", ") + ". " : "We can carry on from your saved conversation. ") + (next ? next.text + " Shall we work through that together?" : "What would you like to work on next?") };
}
