"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, Hint, Pill } from "@/components/keeper/ui";
import { cn } from "@/lib/utils";
import { vapi } from "@/lib/console-client";
import { RISK_LABEL, type RiskLevel } from "@shared/verify-rules";
import { STATUS_LABEL, type ClaimSource, type QueueView, type VerifyStatus } from "@shared/verify-view";
import { DaysLeft, Notice, RiskBadge, StatusBadge, fmtDate } from "./bits";

const isOpen = (s: VerifyStatus) => s === "awaiting_review" || s === "documents_requested";

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[0.85rem] text-muted-foreground">{label}</p>
      <p className="display mt-1 text-3xl text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[0.8rem] text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function Filter<T extends string>({ label, value, onChange, options }: { label: string; value: T | "all"; onChange: (v: T | "all") => void; options: { key: T; label: string }[] }) {
  return (
    <label className="flex items-center gap-2 text-[0.9rem]">
      <span className="text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T | "all")} className="min-h-10 rounded-xl border border-line bg-paper px-3">
        <option value="all">All</option>
        {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function ClaimsQueue() {
  const router = useRouter();
  const [view, setView] = useState<QueueView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<VerifyStatus | "all">("all");
  const [risk, setRisk] = useState<RiskLevel | "all">("all");
  const [source, setSource] = useState<ClaimSource | "all">("all");

  useEffect(() => {
    let live = true;
    vapi.get<QueueView>("/api/console/queue")
      .then((v) => { if (live) { setView(v); setError(null); } })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load the claims."); });
    return () => { live = false; };
  }, []);

  const rows = useMemo(() => (view?.claims ?? []).filter((c) => (status === "all" || c.status === status) && (risk === "all" || c.risk === risk) && (source === "all" || c.source === source)), [view, status, risk, source]);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!view) return <p className="text-muted-foreground">Loading claims…</p>;
  const t = view.tiles;
  const filtered = status !== "all" || risk !== "all" || source !== "all";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-3xl text-ink">Claims</h1>
        <Hint>Most urgent first, counted from the day each claim arrived in a 15-day window. Claims for the same deceased person and product sit together.</Hint>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Awaiting review" value={String(t.awaitingReview)} />
        <Tile label="High risk" value={String(t.highRisk)} hint={t.highRisk ? "Checked and rated High" : "Run checks to rate claims"} />
        <Tile label="Due within 3 days" value={String(t.dueSoon)} />
        <Tile label="Average decision time" value={t.avgDecisionDays === null ? "No decisions yet" : `${t.avgDecisionDays} days`} />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2" role="group" aria-label="Filters">
        <Filter label="Status" value={status} onChange={setStatus} options={(Object.keys(STATUS_LABEL) as VerifyStatus[]).map((k) => ({ key: k, label: STATUS_LABEL[k] }))} />
        <Filter label="Risk" value={risk} onChange={setRisk} options={(["high", "medium", "low", "not_checked"] as RiskLevel[]).map((k) => ({ key: k, label: RISK_LABEL[k] }))} />
        <Filter label="Source" value={source} onChange={setSource} options={[{ key: "FinLegacy", label: "Via FinLegacy" }, { key: "Branch", label: "Branch" }]} />
        {filtered && <button type="button" className="text-[0.9rem] underline underline-offset-4" onClick={() => { setStatus("all"); setRisk("all"); setSource("all"); }}>Clear filters</button>}
      </div>

      {rows.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="display text-xl text-ink">{filtered ? "No claims match these filters" : "No claims are waiting"}</p>
          <Hint>{filtered ? "Clear a filter to see the rest of the queue." : "New claims will appear here as they arrive."}</Hint>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[960px] border-collapse text-left text-[0.92rem]">
            <thead className="bg-secondary text-[0.8rem] uppercase tracking-wide text-muted-foreground">
              <tr>{["Claim", "Deceased", "Claimant", "Product", "Received", "Days left", "Risk", "Status", "Source"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} onClick={() => router.push(`/verify/claims/${c.id}`)} className={cn("cursor-pointer border-t border-line align-top hover:bg-secondary/60", c.duplicateOf.length > 0 && "border-l-4 border-l-apricot", c.dueSoon && "bg-[#fdf3ea]")}>
                  <td className="px-3 py-3">
                    <Link href={`/verify/claims/${c.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold underline underline-offset-4">{c.code}</Link>
                    {c.duplicateOf.length > 0 && <div className="mt-1"><Pill tone="warn" title={`Same deceased and product as ${c.duplicateOf.join(", ")}`}>Duplicate · {c.duplicateOf.join(", ")}</Pill></div>}
                  </td>
                  <td className="px-3 py-3">{c.deceasedName}</td>
                  <td className="px-3 py-3">{c.claimantName}<div className="text-[0.82rem] text-muted-foreground">{c.relationship}</div></td>
                  <td className="px-3 py-3">{c.productLabel}<div className="text-[0.82rem] text-muted-foreground">ending {c.productLast4}</div></td>
                  <td className="px-3 py-3 whitespace-nowrap">{fmtDate(c.receivedAt)}</td>
                  <td className="px-3 py-3"><DaysLeft days={c.daysRemaining} open={isOpen(c.status)} dueSoon={c.dueSoon} /></td>
                  <td className="px-3 py-3"><RiskBadge level={c.risk} /></td>
                  <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-3 py-3 whitespace-nowrap">{c.source === "FinLegacy" ? "Via FinLegacy" : "Branch"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
