import { claimPlan } from "./claims";
import type { AppState, Case, Message } from "./types";

export const plainCopy = (text: string) => text.replace(/\s*\u2014\s*/g, ". ").replace(/\.\s*\./g, ".");

/** Combine consecutive assistant fragments into one turn, retaining the final action. */
export function refineTurns(next: AppState, previous: AppState): AppState {
  for (const c of Object.values(next.cases)) for (const th of c.threads) {
    const old = previous.cases[c.id]?.threads.find(t => t.id === th.id)?.messages.length || 0;
    const before = th.messages.slice(0, old);
    const added: Message[] = [];
    for (const original of th.messages.slice(old)) {
      const m = { ...original, text: original.role === "user" ? original.text : plainCopy(original.text), choices: original.choices?.map(ch => ({ ...ch, label: plainCopy(ch.label) })) };
      const last = added.at(-1);
      if (m.role === "keeper" && last?.role === "keeper") added[added.length - 1] = { ...last, ...m, text: last.text + "\n\n" + m.text };
      else added.push(m);
    }
    th.messages = [...before, ...added];
  }
  return next;
}

export function nextWork(c: Case): { text: string; card: NonNullable<Message["card"]> } | null {
  const claim = c.claims.find(cl => !cl.outcome || cl.backend?.remainderTracked);
  if (claim) {
    const institution = c.assets.find(a => a.id === claim.assetId)?.institution || "Your";
    const pack = claim.backend?.pack;
    if (claim.backend?.remainderTracked) return { text: "Part of your claim was settled. The remaining amount is still being tracked in this case.", card: { type: "claim", id: claim.id } };
    if (!claim.backend) { const holding = c.assets.find(a => a.id === claim.assetId); if (holding) { const plan = claimPlan(holding, claim); const missing = plan.items.filter(i => i.required && !claim.have[i.id]); if (missing.length || plan.decision.kind === "ask") return { text: institution + " claim " + (missing.length ? "still needs " + (missing.length === 1 ? "one document." : missing.length + " documents.") : "needs your input."), card: { type: "claim", id: claim.id } }; } }
    if (claim.backend && !claim.backend.entitled) return { text: institution + " claim needs authority evidence.", card: { type: "claim", id: claim.id } };
    const missing = pack?.items.filter(i => i.required && i.state === "missing");
    if (missing?.length) return { text: institution + " claim needs " + (missing.length === 1 ? "one more document." : missing.length + " documents."), card: { type: "claim", id: claim.id } };
    if (claim.approval?.state === "requested") return { text: "Your claim package is waiting for approval.", card: { type: "claim", id: claim.id } };
    if (claim.submitted) return { text: claim.backend ? "Your claim is awaiting an institution update." : "Your documents are prepared. Submission is the next step.", card: { type: "claim", id: claim.id } };
    if (claim.prepared) return { text: "Your claim package is ready for review.", card: { type: "claim", id: claim.id } };
  }
  const doc = c.docs.find(d => d.state === "ready" && d.fields.some(f => !f.reviewed));
  if (doc) return { text: doc.name + " has details ready for review.", card: { type: "doc", id: doc.id } };
  const asset = c.assets.find(a => !a.confirmed);
  if (asset) return { text: "There is a possible holding at " + asset.institution + " to check.", card: { type: "asset", id: asset.id } };
  const task = c.tasks.find(t => t.state === "open");
  if (task) return { text: "Next: " + plainCopy(task.title) + ".", card: { type: "know" } };
  return null;
}

export function documentTitle(name: string): string {
  const label = name.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_]SAMPLE\b/gi, "").replace(/[-_]+/g, " ").trim();
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "Document";
}
