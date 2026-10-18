"use client";

import { cn } from "@/lib/utils";
import { RISK_LABEL, type RiskLevel } from "@shared/verify-rules";
import { STATUS_LABEL, type VerifyStatus } from "@shared/verify-view";
import { Pill } from "@/components/keeper/ui";

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** 03 Mar 2026 (Indian order, two-digit day). */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${String(d.getDate()).padStart(2, "0")} ${MONTH[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${fmtDate(iso)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const amountRange = (min: number, max: number) => `${rupees(min)} to ${rupees(max)}`;

const RISK: Record<RiskLevel, { cls: string; mark: string }> = {
  high: { cls: "border-[#a03a2a]/40 bg-[#fbeceb] text-[#8a2f21]", mark: "▲" },
  medium: { cls: "border-[#e8a477]/60 bg-[#fbe9dc] text-[#7a3e14]", mark: "◆" },
  low: { cls: "border-moss/30 bg-moss-soft text-ink", mark: "●" },
  not_checked: { cls: "border-line bg-secondary text-ink", mark: "○" },
};
/** Colour is never the only signal: every badge carries a symbol and the words. */
export function RiskBadge({ level }: { level: RiskLevel }) {
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[0.8rem] font-semibold", RISK[level].cls)}><span aria-hidden>{RISK[level].mark}</span>{RISK_LABEL[level]}</span>;
}

export function StatusBadge({ status }: { status: VerifyStatus }) {
  return <Pill tone={status === "approved" ? "ok" : status === "escalated" ? "warn" : "plain"}>{STATUS_LABEL[status]}</Pill>;
}

export function DaysLeft({ days, open, dueSoon }: { days: number; open: boolean; dueSoon: boolean }) {
  if (!open) return <span className="text-muted-foreground">Closed</span>;
  const text = days < 0 ? `${-days} ${-days === 1 ? "day" : "days"} overdue` : days === 0 ? "Due today" : `${days} ${days === 1 ? "day" : "days"}`;
  return <span className={cn("whitespace-nowrap", dueSoon && "rounded-md bg-[#fbe9dc] px-1.5 py-0.5 font-semibold text-[#7a3e14]")}>{dueSoon ? "⚠ " : ""}{text}</span>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "ok"; children: React.ReactNode }) {
  const cls = { info: "border-line bg-secondary", ok: "border-moss/30 bg-moss-soft", error: "border-[#a03a2a]/40 bg-[#fbeceb] text-[#8a2f21]" }[tone];
  return <p role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-[0.92rem]", cls)}>{children}</p>;
}
