"use client";

import { useEffect, useRef, useState } from "react";

import { ArrowRight, Check, LoaderCircle, Pause, Play, Sparkles } from "lucide-react";

import type { CaseAgentView } from "@shared/case-agent";

import type { Case, Message } from "@/keeper/types";

import { api } from "@/lib/client";

import { refreshBackend } from "@/keeper/store";



export function CaseAgent({ c, onOpen }: { c: Case; onOpen: (type: NonNullable<Message["card"]>["type"], id?: string) => void }) {

  return c.backendId ? <CaseAgentControl key={c.backendId} caseId={c.backendId} contextVersion={JSON.stringify([c.docs.map(d => [d.id, d.fields.map(f => [f.id, f.reviewed, f.value])]), c.assets.map(a => [a.id, a.confirmed, a.evidence]), c.claims.map(cl => [cl.id, cl.backend?.status, cl.backend?.pack?.contentHash])])} onOpen={onOpen} /> : null;

}

function CaseAgentControl({ caseId, contextVersion, onOpen }: { caseId: string; contextVersion: string; onOpen: (type: NonNullable<Message["card"]>["type"], id?: string) => void }) {

  const [run, setRun] = useState<CaseAgentView | null>(null);

  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);

  const [refresh, setRefresh] = useState(0);

  const refreshed = useRef("");

  const active = !!run && ["queued", "running"].includes(run.status);

  useEffect(() => {

    const ctrl = new AbortController(); let live = true; let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async (first = false) => {

      try {

        let response = first ? await api.get<{ run: CaseAgentView | null }>(`/api/cases/${caseId}/agent-work`) : await api.post<{ run: CaseAgentView | null }>(`/api/cases/${caseId}/agent-work`, { action: "advance" }, { signal: ctrl.signal });

        if (!live) return;

        if (first && response.run?.status === "waiting_user") {

          response = await api.post<{ run: CaseAgentView | null }>(`/api/cases/${caseId}/agent-work`, { action: "reconcile" }, { signal: ctrl.signal });

          if (!live) return;

        }

        setRun(response.run); setError("");

        if (response.run && ["queued", "running"].includes(response.run.status)) timer = setTimeout(() => void tick(), 1200);

        else if (response.run && ["waiting_user", "succeeded"].includes(response.run.status)) {

          const key = response.run.id + ":" + response.run.revision;

          if (refreshed.current !== key) { refreshed.current = key; void refreshBackend(); }

        }

      } catch { if (live) setError("Connection interrupted. Your checkpoints are saved. Reconnect to continue."); }

    };

    void tick(true);

    return () => { live = false; ctrl.abort(); clearTimeout(timer); };

  }, [caseId, contextVersion, refresh]);

  const act = async (action: "start" | "pause") => {

    if (busy) return; setBusy(true); setError("");

    try {

      const response = await api.post<{ run: CaseAgentView | null }>(`/api/cases/${caseId}/agent-work`, { action, ...(action === "start" && run ? { revision: run.revision } : {}) });

      setRun(response.run); setRefresh(n => n + 1);

    } catch { setError("Could not save that request. Try again; existing progress is preserved."); }

    finally { setBusy(false); }

  };

  return <section aria-label="Keeper case agent" className="rounded-2xl border border-moss/30 bg-paper p-4 sm:p-5">

    <div className="flex items-center gap-2 text-sm font-semibold text-moss"><Sparkles className="h-4 w-4" aria-hidden />Let Keeper move this forward<span className="ml-auto rounded-full bg-moss-soft px-2 py-1 text-[10px] font-medium">{active ? "Working" : run?.status === "paused" ? "Paused" : run?.status === "waiting_user" ? "Your review" : run?.status === "succeeded" ? "Prepared" : "Saved progress"}</span></div>

    <p className="mt-2 text-sm text-muted-foreground">I can check saved evidence, spot missing details, and refresh existing claim drafts. I’ll stop when I need your review.</p>

    {run && <><progress className="mt-4 h-1.5 w-full accent-[var(--moss)]" aria-label="Case preparation progress" max={Math.max(run.plan.length, 1)} value={run.cursor} /><ol className="mt-3 space-y-2 text-xs">{run.plan.map((step, i) => <li key={i} className="flex items-center gap-2">{i < run.cursor ? <Check className="h-3.5 w-3.5 text-moss" aria-hidden /> : active && i === run.cursor ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <span className="h-3.5 w-3.5 rounded-full border border-line" aria-hidden />}<span>{step.label}</span><span className="ml-auto text-muted-foreground">{i < run.cursor ? "Saved" : active && i === run.cursor ? "In progress" : ""}</span></li>)}</ol></>}

    {run?.result && !active && <div className="mt-3 rounded-xl bg-moss-soft/40 p-3"><p className="text-sm font-medium">{run.result.summary}</p>{run.result.needs.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">{run.result.needs.map((need, i) => <li key={i}>{need}</li>)}</ul>}<button onClick={() => onOpen(run.result!.target.type, run.result!.target.id)} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-moss">Review next step<ArrowRight className="h-4 w-4" aria-hidden /></button></div>}

    <div className="mt-3 flex flex-wrap items-center gap-3"><button disabled={busy} onClick={() => void act(active ? "pause" : "start")} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-moss px-4 text-sm font-semibold text-white disabled:opacity-40">{active ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}{busy ? "Saving…" : active ? "Pause" : !run ? "Work on this case" : run.status === "paused" ? "Resume preparation" : "Recheck latest records"}</button>{run && ["waiting_user", "succeeded"].includes(run.status) && <button disabled={busy} className="min-h-11 text-sm font-semibold text-moss underline" onClick={() => void act("pause")}>Pause agent</button>}{error && <button className="min-h-11 text-sm font-semibold text-moss underline" onClick={() => setRefresh(n => n + 1)}>Reconnect</button>}</div>

    {(error || run?.error) && <p role="alert" className="mt-2 text-sm">{error || run?.error}</p>}

    {run && !active && <p className="mt-2 text-[11px] text-muted-foreground">Saved run · {new Date(run.updatedAt).toLocaleString()}. Recheck after changing records.</p>}

    <p className="mt-3 text-[11px] text-muted-foreground">After you review or add evidence, I can continue the saved preparation when you return. Pause stops this delegation. Evidence confirmation, approval and institution submission stay with you.</p>

  </section>;

}

