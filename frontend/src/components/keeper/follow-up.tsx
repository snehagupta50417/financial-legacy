"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, ExternalLink, RefreshCw } from "lucide-react";
import { dispatch, useBackendStatus } from "@/keeper/store";
import type { Case, Message } from "@/keeper/types";
import { Btn } from "./ui";

export function OfficialHandoff({ title, url, instruction }: { title: string; url?: string; instruction: string }) {
  return <section className="keeper-handoff" aria-label="Continue with the official provider"><p className="keeper-overline">YOUR NEXT STEP, WITH THE OFFICIAL PROVIDER</p><h3>{title}</h3><p>{instruction}</p>{url && <a href={url} target="_blank" rel="noopener noreferrer" className="keeper-official-link">Open official instructions <ExternalLink className="h-4 w-4" aria-hidden /></a>}<p className="keeper-handoff-footnote">Opens separately. Keeper sends no documents or identifiers. Return here to record what happened.</p></section>;
}

export function FollowUpChoice({ c, target, resolved = false }: { c: Case; target: string; resolved?: boolean }) {
  const saved = c.followUps?.[target];
  const backend = useBackendStatus();
  const [date, setDate] = useState(saved?.nextCheckOn ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (enabled: boolean) => {
    if (saving || backend.busy) return;
    setSaving(true); setError("");
    try {
      const ok = await Promise.resolve(dispatch({ t: "followup.set", target, enabled, nextCheckOn: date || null }));
      if (ok === false) setError("Could not save your choice. Please try again.");
    } catch { setError("Could not save your choice. Your selected date is still here."); }
    finally { setSaving(false); }
  };
  if (resolved) return <div className="keeper-followup-choice"><p className="font-semibold">Outcome recorded</p><p className="text-sm">This item is no longer in your active follow-up list. Its history stays in the case.</p></div>;
  return <section className="keeper-followup-choice" aria-label="Keep this in the loop"><div className="flex items-center gap-2 text-moss"><RefreshCw className="h-4 w-4" aria-hidden /><h3 className="font-semibold">{saved?.enabled ? "We’re keeping this in the loop" : saved ? "Follow-up is paused" : "Shall we keep this in the loop?"}</h3></div><p className="mt-2 text-sm">Keep the next step in your case until you record an outcome. Bring back any receipt, missing-document request, or decision.</p><label className="mt-3 block text-sm">When would you like to review it? <span className="text-muted-foreground">(optional)</span><input type="date" className="mt-1 block min-h-11 rounded-xl border border-input bg-paper px-3" value={date} onChange={e => setDate(e.target.value)} /></label><div className="mt-3 flex flex-wrap gap-2"><Btn disabled={saving || backend.busy} onClick={() => void save(true)}>{saving ? "Saving…" : saved?.enabled ? "Save review date" : "Yes, keep it in the loop"}</Btn><Btn variant="quiet" disabled={saving || backend.busy} onClick={() => void save(false)}>{saved?.enabled ? "Pause follow-up" : "Not for now"}</Btn></div><p className="mt-2 text-xs text-muted-foreground">Saved in Keeper. No background portal checks or external notifications.</p>{error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}</section>;
}

export function FollowUpQueue({ c, onOpen }: { c: Case; onOpen: (type: NonNullable<Message["card"]>["type"], id?: string) => void }) {
  const entries = Object.entries(c.followUps ?? {}).filter(([, value]) => value.enabled).flatMap<{ key: string; value: NonNullable<Case["followUps"]>[string]; title: string; type: "claim" | "plan"; id: string | undefined }>(([key, value]) => {
    if (key.startsWith("claim:")) {
      const claim = c.claims.find(x => x.id === key.slice(6));
      if (!claim || (claim.outcome && !["partially_settled", "unresolved_dispute"].includes(claim.outcome.kind) && !claim.backend?.remainderTracked)) return [];
      return [{ key, value, title: (c.assets.find(a => a.id === claim.assetId)?.institution ?? "Institution") + " claim", type: "claim" as const, id: claim.id }];
    }
    const source = c.plan.find(x => x.id === key.slice(7));
    return source ? [{ key, value, title: source.label, type: "plan" as const, id: undefined }] : [];
  }).sort((a, b) => (a.value.nextCheckOn ?? "9999").localeCompare(b.value.nextCheckOn ?? "9999"));
  if (!entries.length) return null;
  const today = new Date().toLocaleDateString("en-CA");
  return <section className="keeper-followup-queue" aria-label="In your loop"><div className="flex items-center gap-2 text-sm font-semibold text-moss"><CalendarDays className="h-4 w-4" aria-hidden />In your loop <span className="ml-auto text-xs font-normal">{entries.length} open</span></div><p className="mt-1 text-xs text-muted-foreground">Pick up where you left off.</p>{entries.map(entry => <button key={entry.key} onClick={() => onOpen(entry.type, entry.id)} className="mt-3 flex min-h-11 w-full items-center gap-3 border-t border-line pt-3 text-left"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{entry.title}</p><p className="text-xs text-muted-foreground">{entry.value.nextCheckOn ? (entry.value.nextCheckOn <= today ? "Ready for review · " : "Review on ") + entry.value.nextCheckOn : "Waiting for your next update"}</p></div><ArrowRight className="h-4 w-4 text-moss" aria-hidden /></button>)}</section>;
}
