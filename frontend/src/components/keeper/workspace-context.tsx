"use client";

import { useState } from "react";
import { ArrowRight, Brain, FileText } from "lucide-react";
import { FACT_META } from "@/keeper/catalog";
import { dispatch } from "@/keeper/store";
import type { Case, Message } from "@/keeper/types";
import type { nextWork } from "@/keeper/presentation";

type Open = (type: NonNullable<Message["card"]>["type"], id?: string) => void;

/** Memory uses the same guarded write path as the existing case details editor. */
export function CaseMemory({ c, busy }: { c: Case; busy: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const facts = Object.values(c.facts).filter(f => f.value !== null && f.value !== "");
  if (!facts.length) return null;
  const save = async () => {
    if (!editing || !value.trim() || busy) return;
    setError("");
    try {
      const ok = await Promise.resolve(dispatch({ t: "fact.edit", key: editing, value: value.trim() }));
      if (ok === false) { setError("That correction was not saved. Check the case requirements and try again."); return; }
      setEditing(null);
    } catch { setError("Could not save the correction. Your edit is still here."); }
  };
  return <details className="mb-3 rounded-2xl border border-line bg-paper">
    <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium"><Brain className="h-4 w-4 text-moss" aria-hidden />What Keeper remembers <span className="ml-auto text-xs text-muted-foreground">{facts.length} saved details · Review or correct</span></summary>
    <div className="space-y-3 border-t border-line p-4">
      <p className="text-xs text-muted-foreground">Saved for {c.name}. Your statements and document clues do not establish institution verification.</p>
      {facts.map(f => <div key={f.key} className="rounded-xl bg-ivory p-3">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-muted-foreground">{FACT_META[f.key]?.label ?? f.key.replace(/[_-]/g, " ")}</p><p className="break-words text-sm font-medium">{f.value}</p></div><button disabled={busy} onClick={() => { setEditing(f.key); setValue(f.value ?? ""); setError(""); }} className="min-h-10 shrink-0 px-2 text-sm font-medium text-moss">Correct</button></div>
        <p className="mt-1 text-xs text-muted-foreground">{f.source}{f.state === "needs_confirmation" ? " · Needs your confirmation" : f.state === "document_supported" ? " · Document-backed" : f.state === "confirmed" ? " · Confirmed by you" : ""}</p>
        {f.note && <p className="mt-1 text-xs">{f.note}</p>}
        {editing === f.key && <form className="mt-2 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); void save(); }}><input aria-label={"Correct " + (FACT_META[f.key]?.label ?? f.key)} value={value} onChange={e => setValue(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-input bg-paper px-3 text-sm" /><button disabled={busy || !value.trim()} className="min-h-11 px-3 text-sm font-semibold text-moss disabled:opacity-40">Save correction</button><button type="button" onClick={() => setEditing(null)} className="min-h-11 px-2 text-sm">Cancel</button></form>}
      </div>)}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </div>
  </details>;
}

export function WorkCard({ c, work, onOpen }: { c: Case; work: NonNullable<ReturnType<typeof nextWork>>; onOpen: Open }) {
  const doc = work.card.type === "doc" ? c.docs.find(d => d.id === work.card.id) : undefined;
  const field = doc?.fields.find(f => !f.reviewed);
  const asset = work.card.type === "asset" ? c.assets.find(a => a.id === work.card.id) : undefined;
  const evidence = asset ? ({ self_declared: "Self-declared", potential_match: "Potential match", document_backed: "Document-backed", institution_verified: "Institution-verified" } as const)[asset.evidence] : undefined;
  return <section aria-label="Suggested next step" className="mt-2 rounded-2xl border border-moss/30 bg-moss-soft/40 p-4">
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-moss">Suggested next step</p>
    <p className="text-sm font-medium">{work.text}</p>
    {field && <div className="mt-3 rounded-xl border border-line bg-paper p-3"><p className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="h-3 w-3" aria-hidden />From {doc?.name} · Needs review</p><p className="mt-2 break-words text-sm">{field.label}: {field.value}</p>{field.excerpt && <blockquote className="mt-2 border-l-2 border-moss/30 pl-3 text-xs text-muted-foreground">{field.excerpt.slice(0, 320)}</blockquote>}</div>}
    {asset && <p className="mt-2 text-xs text-muted-foreground">{evidence} · {asset.confirmed ? "Confirmed by you" : "Needs your review"}</p>}
    <button onClick={() => onOpen(work.card.type, work.card.id)} className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold text-moss">{doc ? "Review extracted details" : work.card.type === "claim" ? "Review claim requirements" : asset ? "Review possible holding" : "Review next step"}<ArrowRight className="h-4 w-4" aria-hidden /></button>
  </section>;
}
