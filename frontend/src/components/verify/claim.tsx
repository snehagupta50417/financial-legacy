"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Btn, Card, Hint, Pill } from "@/components/keeper/ui";
import { cn } from "@/lib/utils";
import { ConsoleApiError, vapi } from "@/lib/console-client";
import { CHECKS, CHECK_LABEL, CHECK_QUESTION, INCOMPLETE_TEXT, RISK_RULES, type CheckKey, type CheckResult, type EvidenceRef, type Finding } from "@shared/verify-rules";
import type { ClaimDetail, DocView, RunView, TimelineEvent } from "@shared/verify-view";
import { DecisionBar } from "./decision";
import { DaysLeft, Notice, RiskBadge, StatusBadge, amountRange, fmtDate, fmtDateTime } from "./bits";

const EVENT: Record<string, string> = {
  received: "Received", checks_run: "Checks run", checks_incomplete: "Check not completed", approved: "Approved", documents_requested: "Documents requested", escalated: "Escalated",
};
const STEP_MS = 450;
const key = (docId: string, field: string) => `${docId}:${field}`;

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-line/60 py-1.5 text-[0.92rem] last:border-0"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>;
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="space-y-3 border-l-2 border-line pl-4" aria-label="Timeline">
      {events.map((e) => (
        <li key={e.id} className="relative text-[0.9rem]">
          <span className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full bg-moss" aria-hidden />
          <p className="font-semibold">{EVENT[e.kind] ?? e.kind} <span className="font-normal text-muted-foreground">· {e.actor}</span></p>
          <p className="text-[0.82rem] text-muted-foreground">{fmtDateTime(e.createdAt)}</p>
          {e.note && <p className="mt-0.5">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}

function Documents({ detail, flagged, focus, docRefs }: { detail: ClaimDetail; flagged: Map<string, Finding[]>; focus: Set<string>; docRefs: React.MutableRefObject<Map<string, HTMLElement>> }) {
  return (
    <div className="space-y-3">
      {detail.documents.map((d: DocView) => (
        <div key={d.id} className="rounded-xl border border-line bg-paper p-3">
          <p className="font-semibold">{d.title}</p>
          <p className="text-[0.8rem] text-muted-foreground">{d.issuer}</p>
          {!d.readable && <p className="mt-1 text-[0.85rem] text-[#7a3e14]">⚠ This document could not be read.</p>}
          <dl className="mt-2 space-y-1">
            {d.fields.map((f) => {
              const k = key(d.id, f.key);
              const hit = flagged.has(k), on = focus.has(k);
              return (
                <div key={f.key} ref={(el) => { if (el) docRefs.current.set(k, el); else docRefs.current.delete(k); }}
                  className={cn("flex justify-between gap-3 rounded-lg px-2 py-1 text-[0.9rem]", hit && "bg-[#fbe9dc]", on && "bg-[#f7d3b3] ring-2 ring-apricot-deep font-semibold")}>
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="text-right">{hit && <span className="mr-1.5 text-[0.75rem] font-semibold uppercase text-[#7a3e14]">{on ? "Look here" : "Flagged"}</span>}{f.value}</dd>
                </div>
              );
            })}
          </dl>
          {d.signals.length > 0 && <p className="mt-2 text-[0.8rem] text-muted-foreground">Signals shown come from demo metadata. They are not proof of anything.</p>}
        </div>
      ))}
      <div className="rounded-xl border border-line bg-paper p-3">
        <p className="font-semibold">Required for this route</p>
        <p className="text-[0.8rem] text-muted-foreground">{detail.claim.routeLabel}</p>
        <ul className="mt-2 space-y-1">
          {detail.requiredDocuments.map((r) => (
            <li key={r.kind} ref={(el) => { const k = `req:${r.kind}`; if (el) docRefs.current.set(k, el); else docRefs.current.delete(k); }}
              className={cn("flex justify-between rounded-lg px-2 py-1 text-[0.9rem]", !r.present && "bg-[#fbe9dc]", focus.has(`req:${r.kind}`) && "ring-2 ring-apricot-deep font-semibold")}>
              <span>{r.label}</span><span>{r.present ? "✓ In the pack" : "✕ Missing"}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatusLine({ r }: { r: CheckResult }) {
  if (r.status === "pass") return <Pill tone="ok">✓ Pass</Pill>;
  if (r.status === "flag") return <Pill tone="warn">⚑ Flagged</Pill>;
  return <Pill tone="plain">⚠ {INCOMPLETE_TEXT}</Pill>;
}

function Verification({ detail, run, running, step, onRun, onFocus, ruling }: {
  detail: ClaimDetail; run: RunView | null; running: boolean; step: number; ruling: boolean;
  onRun: (simulate?: CheckKey) => void; onFocus: (f: Finding) => void;
}) {
  const open = detail.claim.status === "awaiting_review" || detail.claim.status === "documents_requested";
  return (
    <div className="space-y-4">
      {running ? (
        <ol className="space-y-2" aria-live="polite" aria-label="Running checks">
          {CHECKS.map((c, i) => (
            <li key={c} className={cn("flex items-center gap-2 text-[0.92rem]", i > step && "text-muted-foreground")}>
              <span aria-hidden className="w-5">{i < step ? "✓" : i === step ? "…" : "○"}</span>{CHECK_LABEL[c]}{i === step && <span className="text-[0.8rem] text-muted-foreground"> (checking)</span>}
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Btn variant="ink" onClick={() => onRun()} disabled={!open || ruling}>{run ? "Run checks again" : "Run checks"}</Btn>
          {open && <button type="button" className="text-[0.82rem] underline underline-offset-4" onClick={() => onRun("duplicate")}>Demo: make a check fail to complete</button>}
        </div>
      )}

      {!run && !running && <Hint>Four checks look at the documents and the other claims. The rating follows fixed rules, not a model.</Hint>}

      {run && !running && (
        <>
          <div className="space-y-2">
            <RiskBadge level={run.rating.level} />
            <p className="text-[0.95rem] leading-relaxed">{run.rating.explanation}</p>
            <p className="text-[0.8rem] text-muted-foreground">Run {fmtDateTime(run.createdAt)}. Signals and flags are things to look at, not proof. A person decides.</p>
          </div>
          <div className="space-y-3">
            {run.results.map((r) => (
              <div key={r.check} className="rounded-xl border border-line bg-paper p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{CHECK_LABEL[r.check]}</p><StatusLine r={r} />
                </div>
                <p className="mt-1 text-[0.85rem] text-muted-foreground">{CHECK_QUESTION[r.check]}</p>
                <p className="mt-1 text-[0.9rem]">{r.summary}</p>
                {r.findings.map((f) => (
                  <div key={f.id} className="mt-2 rounded-lg bg-secondary p-2.5 text-[0.88rem]">
                    <p className="font-semibold">{f.label}</p>
                    <p><span className="text-muted-foreground">Expected:</span> {f.expected}</p>
                    <p><span className="text-muted-foreground">Observed:</span> {f.observed}</p>
                    <FindingLink f={f} onFocus={onFocus} />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <details className="rounded-xl border border-line bg-paper p-3 text-[0.9rem]">
            <summary className="cursor-pointer font-semibold">How is this rated?</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">{RISK_RULES.map((r) => <li key={r.level} className={cn(r.level === run.rating.level && "font-semibold")}>{r.text}</li>)}</ol>
            <p className="mt-2 text-muted-foreground">Rule applied here: {run.rating.rule} The rating is never set by an AI model and never approves or rejects a claim.</p>
          </details>
        </>
      )}
    </div>
  );
}

function FindingLink({ f, onFocus }: { f: Finding; onFocus: (f: Finding) => void }) {
  const claimRef = f.evidence.find((e): e is Extract<EvidenceRef, { kind: "claim" }> => e.kind === "claim");
  return (
    <div className="mt-1.5 flex flex-wrap gap-3">
      {f.evidence.some((e) => e.kind !== "claim") && <button type="button" className="font-semibold underline underline-offset-4" onClick={() => onFocus(f)}>Show evidence</button>}
      {claimRef && <Link className="font-semibold underline underline-offset-4" href={`/verify/claims/${claimRef.claimId}`}>Open claim {claimRef.code}</Link>}
    </div>
  );
}

export function ClaimView({ id }: { id: string }) {
  const [detail, setDetail] = useState<ClaimDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<Set<string>>(new Set());
  const docRefs = useRef(new Map<string, HTMLElement>());

  const [tick, setTick] = useState(0);
  const load = useCallback(async () => setTick((t) => t + 1), []);
  useEffect(() => {
    let live = true;
    vapi.get<ClaimDetail>(`/api/console/claims/${id}`)
      .then((d) => { if (live) { setDetail(d); setError(null); } })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load this claim."); });
    return () => { live = false; };
  }, [id, tick]);

  const run = detail?.latestRun ?? null;
  const flagged = useMemo(() => {
    const m = new Map<string, Finding[]>();
    for (const r of run?.results ?? []) for (const f of r.findings) for (const e of f.evidence) if (e.kind === "document") m.set(key(e.documentId, e.fieldKey), [...(m.get(key(e.documentId, e.fieldKey)) ?? []), f]);
    return m;
  }, [run]);

  async function runChecks(simulate?: CheckKey) {
    setRunning(true); setStep(0); setNotice(null); setError(null); setFocus(new Set());
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, CHECKS.length - 1)), STEP_MS);
    try {
      const [, fresh] = await Promise.all([new Promise((r) => setTimeout(r, STEP_MS * CHECKS.length)), vapi.post<RunView>(`/api/console/claims/${id}/checks`, simulate ? { simulateFailure: simulate } : {})]);
      setDetail(await vapi.get<ClaimDetail>(`/api/console/claims/${id}`));
      setNotice(fresh.rating.level === "not_checked" ? `Checks did not all finish. ${INCOMPLETE_TEXT}.` : `Checks finished. ${fresh.rating.explanation}`);
    } catch (e) { setError(e instanceof ConsoleApiError ? e.message : "Could not run the checks."); }
    finally { clearInterval(timer); setRunning(false); }
  }

  function showEvidence(f: Finding) {
    const keys = new Set(f.evidence.flatMap((e) => e.kind === "document" ? [key(e.documentId, e.fieldKey)] : e.kind === "requirement" ? [`req:${e.docKind}`] : []));
    setFocus(keys);
    const first = [...keys][0];
    requestAnimationFrame(() => docRefs.current.get(first)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  if (error && !detail) return <Notice tone="error">{error}</Notice>;
  if (!detail) return <p className="text-muted-foreground">Loading claim…</p>;
  const c = detail.claim;
  const open = c.status === "awaiting_review" || c.status === "documents_requested";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/verify/queue" className="text-[0.9rem] underline underline-offset-4">← All claims</Link>
        <h1 className="display text-3xl text-ink">{c.code}</h1>
        <RiskBadge level={c.risk} /><StatusBadge status={c.status} />
      </div>
      {notice && <Notice tone="ok">{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {c.duplicateOf.length > 0 && <Notice>This claim covers the same deceased person and product as {c.duplicateOf.join(", ")}. Review them together.</Notice>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-4">
          <h2 className="display text-xl">Claim</h2>
          <dl>
            <Row k="Deceased" v={c.deceasedName} />
            <Row k="Claimant" v={`${c.claimantName}, ${c.relationship.toLowerCase()}`} />
            <Row k="Contact" v={c.contactMasked} />
            <Row k="Product" v={`${c.productLabel}, ending ${c.productLast4}`} />
            <Row k="Amount (range)" v={amountRange(c.amountMin, c.amountMax)} />
            <Row k="Route" v={c.routeLabel} />
            <Row k="Source" v={c.source === "FinLegacy" ? "Via FinLegacy" : "Branch"} />
            <Row k="Received" v={fmtDate(c.receivedAt)} />
            <Row k="Decision due" v={fmtDate(c.dueAt)} />
            <Row k="Days left" v={<DaysLeft days={c.daysRemaining} open={open} dueSoon={c.dueSoon} />} />
          </dl>
          <h3 className="display text-lg">Timeline</h3>
          <Timeline events={detail.timeline} />
        </Card>

        <Card className="space-y-3">
          <h2 className="display text-xl">Documents</h2>
          <Documents detail={detail} flagged={flagged} focus={focus} docRefs={docRefs} />
        </Card>

        <Card className="space-y-3">
          <h2 className="display text-xl">Verification</h2>
          <Verification detail={detail} run={run} running={running} step={step} ruling={false} onRun={runChecks} onFocus={showEvidence} />
        </Card>
      </div>

      <DecisionBar key={`${c.id}:${c.status}:${run?.id ?? "none"}`} detail={detail} onDone={(m) => { setNotice(m); void load(); }} />
    </div>
  );
}
