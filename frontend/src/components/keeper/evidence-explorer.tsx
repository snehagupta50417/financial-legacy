"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileSearch, GitBranch, RefreshCw } from "lucide-react";
import { api } from "@/lib/client";
import { dispatch, refreshBackend } from "@/keeper/store";
import { exampleEvidence } from "@/keeper/evidence";
import type { Case } from "@/keeper/types";
import type { EvidenceMap, EvidenceNode, WorkflowView } from "@shared/evidence-map";
import { CLAIM_REVIEW_STEPS } from "@shared/evidence-map";
import { Btn } from "./ui";

const label = (value: string) => value.replace(/_/g, " ");
const route = (node: EvidenceNode) => node.target?.type === "doc" ? "/app/documents" : node.target?.type === "claim" ? "/app/claims" : "/app/assets";
export function EvidenceExplorer({ c, assetId }: { c: Case; assetId?: string }) {
  return <EvidenceContent key={c.id + ":" + assetId} c={c} assetId={assetId} />;
}
function EvidenceContent({ c, assetId }: { c: Case; assetId?: string }) {
  const [remote, setRemote] = useState<EvidenceMap | null>(null), [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0), [selected, setSelected] = useState<string | null>(assetId ? "asset:" + assetId : null);
  const sample = useMemo(() => c.backendId ? null : exampleEvidence(c), [c]);
  useEffect(() => {
    if (!c.backendId) return;
    let active = true;
    api.get<{ map: EvidenceMap }>("/api/cases/" + c.backendId + "/evidence").then(result => { if (active) { setRemote(result.map); setError(""); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Could not load evidence."); });
    return () => { active = false; };
  }, [c.backendId, refresh]);
  const map = sample ?? remote;
  const chosen = map?.nodes.find(n => n.id === selected) ?? map?.nodes.find(n => n.kind === "asset") ?? map?.nodes[0];
  const neighbours = map && chosen ? map.edges.filter(e => e.from === chosen.id || e.to === chosen.id) : [];
  return <section className="keeper-evidence" aria-label="Evidence map"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="keeper-overline">{c.backendId ? "SOURCE-BACKED CASE RECORD" : "SIMULATED EVIDENCE MAP"}</p><h3 className="mt-1 flex items-center gap-2 font-semibold"><GitBranch className="h-4 w-4 text-moss" aria-hidden />Why Keeper believes this</h3></div>{c.backendId && <button className="min-h-11 px-2 text-xs font-semibold text-moss" onClick={() => setRefresh(n => n + 1)}><RefreshCw className="mr-1 inline h-3 w-3" aria-hidden />Refresh</button>}</div><p className="mt-2 text-xs text-muted-foreground">Follow a holding to its documents, extracted details, corrections and claim. Links show recorded provenance, not inferred ownership.</p>
    {error && <p role="alert" className="mt-3 text-sm">{error}</p>}
    {!map && !error && <p role="status" className="mt-3 text-sm">Loading canonical evidence…</p>}
    {map && <><p className="mt-3 text-xs text-muted-foreground">{map.nodes.length} records · {map.edges.length} source links{map.truncated ? " · Limited preview: some records are omitted" : ""}</p>
      {map.warnings.length > 0 && <details className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><summary className="cursor-pointer text-sm font-semibold">{map.warnings.length} evidence issues need review</summary><ul className="mt-2 space-y-2 text-xs">{map.warnings.map(w => <li key={w.id}>{w.text}</li>)}</ul></details>}
      <div className="keeper-evidence-layout mt-4"><nav aria-label="Evidence records" className="keeper-evidence-list">{["asset", "document", "claim", "search"].map(kind => <div key={kind}><p className="keeper-overline px-2 py-2">{kind === "asset" ? "Holdings" : kind === "document" ? "Documents" : kind === "claim" ? "Claims" : "Official searches"}</p>{map.nodes.filter(n => n.kind === kind).map(n => <button key={n.id} aria-pressed={chosen?.id === n.id} onClick={() => setSelected(n.id)} className="keeper-evidence-node"><span className="block truncate text-xs font-medium">{n.label}</span><span className="text-[10px] text-muted-foreground">{label(n.status)}</span></button>)}</div>)}</nav>
      <div className="min-w-0 rounded-xl border border-line bg-paper p-4">{chosen ? <><p className="keeper-overline">{chosen.kind}</p><h4 className="mt-1 break-words text-sm font-semibold">{chosen.label}</h4><p className="mt-1 text-xs text-moss">{label(chosen.status)}</p>{chosen.detail && <p className="mt-3 break-words text-sm">{chosen.detail}</p>}{chosen.excerpt && <blockquote className="mt-3 border-l-2 border-moss/30 pl-3 text-xs text-muted-foreground">{chosen.excerpt}</blockquote>}{chosen.at && <p className="mt-2 text-[10px] text-muted-foreground">Recorded {new Date(chosen.at).toLocaleString()}</p>}
        {chosen.target && <Link className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-moss" href={route(chosen)} onClick={() => dispatch({ t: "focus", focus: chosen.target! })}>Review original record <ArrowRight className="h-3 w-3" aria-hidden /></Link>}
        <p className="keeper-overline mt-4">Connected evidence</p><ul className="mt-2 space-y-2">{neighbours.map((e, i) => { const other = map.nodes.find(n => n.id === (e.from === chosen.id ? e.to : e.from)); return other ? <li key={i}><button className="w-full rounded-lg border border-line px-3 py-2 text-left hover:bg-secondary" onClick={() => setSelected(other.id)}><span className="block text-[10px] text-muted-foreground">{label(e.relation)} {e.to === chosen.id ? "· source" : ""}</span><span className="block break-words text-xs">{other.label}</span><span className="text-[10px] text-moss">{label(other.status)}</span></button></li> : null; })}</ul>{!neighbours.length && <p className="mt-2 text-xs text-muted-foreground">No source link recorded yet.</p>}</> : <p className="text-sm">Add a document or holding to begin the map.</p>}</div></div></>}
  </section>;
}

export function DurableClaimReview({ c, claimId }: { c: Case; claimId: string }) {
  return <ReviewContent key={c.id + claimId} c={c} claimId={claimId} />;
}
function ReviewContent({ c, claimId }: { c: Case; claimId: string }) {
  const [job, setJob] = useState<WorkflowView | null>(null), [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!c.backendId) return;
    let active = true, timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await api.get<{ workflow: WorkflowView | null }>("/api/claims/" + claimId + "/workflow");
        if (!active) return;
        setJob(result.workflow); setError("");
        if (result.workflow?.result && ["waiting_user", "succeeded"].includes(result.workflow.status)) refreshBackend();
        if (result.workflow && ["queued", "running"].includes(result.workflow.status)) {
          await api.post("/api/workflows/" + result.workflow.id + "/advance");
          if (active) timer = setTimeout(poll, 1600);
        }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Could not load saved review."); }
    };
    void poll(); return () => { active = false; clearTimeout(timer); };
  }, [c.backendId, claimId, refresh]);
  const start = async () => {
    if (busy) return; setBusy(true); setError("");
    try {
      const result = job ? await api.post<{ workflow: WorkflowView }>("/api/workflows/" + job.id + "/restart", { revision: job.revision }) : await api.post<{ workflow: WorkflowView }>("/api/claims/" + claimId + "/workflow");
      setJob(result.workflow); setRefresh(n => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start review."); }
    finally { setBusy(false); }
  };
  return <section className="keeper-durable-review" aria-label="Durable claim review"><p className="keeper-overline">SAVED CHECKPOINTS · HUMAN APPROVAL</p><h3 className="mt-1 flex items-center gap-2 font-semibold"><FileSearch className="h-4 w-4 text-moss" aria-hidden />Prepare a reliable claim review</h3><p className="mt-2 text-xs text-muted-foreground">Collect evidence, flag inconsistencies, and refresh the existing claim package. Nothing is approved or submitted automatically.</p>
    {!c.backendId ? <p className="mt-3 text-sm">This is a browser-only example. Durable reviews run on saved account cases.</p> : <><ol className="mt-4 space-y-2" aria-label="Review checkpoints">{CLAIM_REVIEW_STEPS.map((step, i) => <li key={step} className="flex items-center gap-3 text-xs"><span className="keeper-checkpoint" data-done={!!job && i < job.cursor}>{job && i < job.cursor ? "✓" : i + 1}</span>{step}<span className="ml-auto text-muted-foreground">{job && i < job.cursor ? "Saved" : job && i === job.cursor && ["queued", "running"].includes(job.status) ? "In progress" : ""}</span></li>)}</ol>
      {job && <p role="status" className="mt-3 text-xs font-medium text-moss">{label(job.status)} · revision {job.revision} · {job.attempts} failed attempts</p>}
      {job?.result && <div className="mt-3 rounded-xl border border-line bg-paper p-3"><p className="text-sm font-medium">{job.result.next}</p>{job.result.gaps.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">{job.result.gaps.map((gap, i) => <li key={i}>{gap}</li>)}</ul>}<p className="mt-2 break-all text-[10px] text-muted-foreground">Evidence snapshot: {job.result.fingerprint.slice(0, 16)}…{job.result.packHash ? " · Package " + job.result.packHash.slice(0, 12) + "…" : ""}</p></div>}
      {job?.error && <p role="alert" className="mt-3 text-sm">{job.error}</p>}{error && <p role="alert" className="mt-3 text-sm">{error}</p>}
      <Btn className="mt-4" variant="quiet" disabled={busy || (!!job && ["queued", "running"].includes(job.status))} onClick={() => void start()}>{busy ? "Saving…" : !job ? "Start saved review" : ["queued", "running"].includes(job.status) ? "Review running…" : "Recheck with latest evidence"}</Btn>
      <p className="mt-2 text-[10px] text-muted-foreground">Progress survives a restart. On hosts that suspend idle work, returning here resumes the saved review. New evidence needs a fresh review.</p></>}
  </section>;
}
