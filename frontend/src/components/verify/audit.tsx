"use client";

import { useEffect, useState } from "react";
import { Btn, Hint } from "@/components/keeper/ui";
import { ConsoleApiError, vapi } from "@/lib/console-client";
import { Notice, fmtDateTime } from "./bits";

interface Row { id: string; claimCode: string; kind: string; actor: string; note: string; createdAt: string }

const KIND: Record<string, string> = {
  received: "Received", checks_run: "Checks run", checks_incomplete: "Check not completed", approved: "Approved", documents_requested: "Documents requested (simulated)", escalated: "Escalated",
};

export function AuditView() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [claim, setClaim] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    vapi.get<{ events: Row[] }>("/api/console/audit")
      .then((r) => { if (live) { setRows(r.events); setError(null); } })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load the audit trail."); });
    return () => { live = false; };
  }, []);

  async function exportCsv() {
    setDone(null);
    try { await vapi.downloadCsv(); setDone("Downloaded verify-audit.csv."); }
    catch (e) { setError(e instanceof ConsoleApiError ? e.message : "Could not export the audit trail."); }
  }

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!rows) return <p className="text-muted-foreground">Loading audit trail…</p>;
  const codes = [...new Set(rows.map((r) => r.claimCode))].sort();
  const shown = rows.filter((r) => claim === "all" || r.claimCode === claim);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="display text-3xl text-ink">Audit trail</h1>
          <Hint>Everything that happened on this desk, newest first: receipts, checks, and every decision with who made it.</Hint>
        </div>
        <label className="flex items-center gap-2 text-[0.9rem]">
          <span className="text-muted-foreground">Claim</span>
          <select value={claim} onChange={(e) => setClaim(e.target.value)} className="min-h-10 rounded-xl border border-line bg-paper px-3">
            <option value="all">All claims</option>
            {codes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <Btn variant="quiet" onClick={exportCsv}>Export CSV</Btn>
      </div>
      {done && <Notice tone="ok">{done}</Notice>}
      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[760px] border-collapse text-left text-[0.92rem]">
          <thead className="bg-secondary text-[0.8rem] uppercase tracking-wide text-muted-foreground">
            <tr>{["When", "Claim", "Event", "By", "Note"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="px-3 py-2.5 whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                <td className="px-3 py-2.5 font-medium">{r.claimCode}</td>
                <td className="px-3 py-2.5">{KIND[r.kind] ?? r.kind}</td>
                <td className="px-3 py-2.5">{r.actor}</td>
                <td className="px-3 py-2.5">{r.note}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Nothing recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
