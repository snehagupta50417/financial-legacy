"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { EVIDENCE_LABEL, FACT_STATE_LABEL } from "@/keeper/catalog";
import type { Evidence, FactState } from "@/keeper/types";

/** Typographic wordmark: lowercase serif with an apricot "keeping" curve under it. */
export function Wordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex flex-col leading-none", className)} aria-label="Keeper home">
      <span className="display text-[1.7rem] font-semibold tracking-tight text-ink">keeper</span>
      <svg viewBox="0 0 64 8" className="-mt-0.5 h-2 w-14 text-apricot" aria-hidden>
        <path d="M2 2 C 18 8, 46 8, 62 2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </Link>
  );
}

type Tone = "ok" | "warn" | "plain" | "moss";
const TONE: Record<Tone, string> = {
  ok: "bg-moss-soft text-ink border-moss/30",
  moss: "bg-moss text-white border-moss",
  warn: "bg-[#fbe9dc] text-[#7a3e14] border-[#e8a477]/60",
  plain: "bg-secondary text-ink border-line",
};

export function Pill({ tone = "plain", children, title, className }: { tone?: Tone; children: React.ReactNode; title?: string; className?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[0.8rem] font-medium", TONE[tone], className)}>
      {children}
    </span>
  );
}

const EVIDENCE_TONE: Record<Evidence, Tone> = { self_declared: "plain", potential_match: "warn", document_backed: "ok", institution_verified: "moss" };
export function EvidenceBadge({ e }: { e: Evidence }) {
  return <Pill tone={EVIDENCE_TONE[e]} title={EVIDENCE_LABEL[e].hint}>{EVIDENCE_LABEL[e].label}</Pill>;
}

export function FactBadge({ s }: { s: FactState }) {
  const tone: Tone = s === "unknown" || s === "needs_confirmation" ? "warn" : s === "not_provided" || s === "not_applicable" ? "plain" : s === "verified" ? "moss" : "ok";
  return <Pill tone={tone}>{FACT_STATE_LABEL[s]}</Pill>;
}

export function Btn({ variant = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "quiet" | "ink" | "danger"; ref?: React.Ref<HTMLButtonElement> }) {
  const v = {
    primary: "bg-apricot text-ink hover:bg-[#dd9566] font-semibold",
    ink: "bg-ink text-ivory hover:bg-[#3a403a] font-semibold",
    quiet: "border border-line bg-paper text-ink hover:bg-secondary",
    danger: "border border-[#a03a2a]/40 bg-paper text-[#a03a2a] hover:bg-[#fbeceb]",
  }[variant];
  return <button type="button" {...p} className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-[0.95rem] transition-colors disabled:cursor-not-allowed disabled:opacity-50", v, className)} />;
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return <section {...rest} className={cn("rounded-2xl border border-line bg-card p-5 shadow-[0_1px_0_rgba(36,40,36,0.04)]", className)}>{children}</section>;
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.9rem] leading-relaxed text-muted-foreground">{children}</p>;
}

/** Warm editorial illustration of an Indian family at home — decorative only. */
export function FamilyScene({ variant = "table", className }: { variant?: "table" | "porch" | "desk"; className?: string }) {
  const skin = ["#c58c63", "#a8714b", "#d9a47c", "#8d5a3b"];
  const wall = variant === "porch" ? "#efe3cf" : variant === "desk" ? "#ece4d3" : "#f0e6d4";
  return (
    <svg viewBox="0 0 520 380" role="img" aria-label="" aria-hidden className={className}>
      <rect width="520" height="380" rx="26" fill={wall} />
      <circle cx="400" cy="92" r="64" fill="#f6d9bd" opacity=".9" />
      <rect x="60" y="48" width="130" height="150" rx="10" fill="#fbf4e6" stroke="#d9cfba" strokeWidth="3" />
      <path d="M125 48v150M60 123h130" stroke="#d9cfba" strokeWidth="3" />
      <path d="M0 292h520v88H0z" fill="#d9c7a8" />
      <path d="M0 292h520" stroke="#c6b18c" strokeWidth="3" />
      {/* lamp */}
      <path d="M452 212l22 0 14 40h-50z" fill="#e8a477" />
      <rect x="462" y="252" width="4" height="60" fill="#526653" />
      <ellipse cx="464" cy="314" rx="22" ry="5" fill="#526653" opacity=".85" />
      {/* table */}
      <rect x="110" y="258" width="300" height="16" rx="8" fill="#7a5a3c" />
      <rect x="140" y="274" width="12" height="84" fill="#6a4d33" /><rect x="368" y="274" width="12" height="84" fill="#6a4d33" />
      {/* papers + chai */}
      <rect x="176" y="238" width="56" height="22" rx="3" fill="#fbf8f2" stroke="#d9cfba" /><rect x="190" y="230" width="56" height="24" rx="3" fill="#fff" stroke="#d9cfba" />
      <rect x="318" y="236" width="22" height="22" rx="4" fill="#fbf8f2" stroke="#d9cfba" /><path d="M340 243h6a5 5 0 010 10h-6" fill="none" stroke="#d9cfba" strokeWidth="3" />
      {/* people: elder, parent, young adult, child */}
      {[
        { x: 150, h: 82, c: "#526653", s: skin[0], hair: "#cfcac0" },
        { x: 222, h: 96, c: "#e8a477", s: skin[1], hair: "#2a2a26" },
        { x: 306, h: 100, c: "#7b8f7c", s: skin[2], hair: "#2a2a26" },
        { x: 372, h: 66, c: "#c8553d", s: skin[3], hair: "#2a2a26" },
      ].map((p, i) => (
        <g key={i}>
          <rect x={p.x - 30} y={246 - p.h * 0.55} width="60" height={p.h * 0.7} rx="26" fill={p.c} />
          <circle cx={p.x} cy={228 - p.h * 0.62} r="19" fill={p.s} />
          <path d={`M${p.x - 19} ${224 - p.h * 0.62}a19 19 0 0138 0z`} fill={p.hair} />
        </g>
      ))}
    </svg>
  );
}

/** Shared by the product conversation and its landing-page preview. */
export function ChatBubble({ user, children, className }: { user?: boolean; children: React.ReactNode; className?: string }) {
  return <div className={cn("keeper-bubble whitespace-pre-wrap rounded-2xl px-4 py-3 leading-relaxed", user ? "keeper-bubble-user ml-auto max-w-[85%] rounded-br-md bg-ink text-ivory" : "keeper-bubble-assistant mr-auto max-w-[92%] rounded-bl-md bg-paper", className)}>{children}</div>;
}
