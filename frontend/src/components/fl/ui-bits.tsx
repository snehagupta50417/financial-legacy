"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Landmark,
  ShieldCheck,
  FileText,
  TrendingUp,
  PieChart,
  Wallet,
  HelpCircle,
  Vault,
} from "lucide-react";

export function LeafLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("h-6 w-6", className)} aria-hidden>
      <path
        d="M12 21C7 17.5 4 13.8 4 9.8 4 5.5 7.6 3 12 3s8 2.5 8 6.8c0 4-3 7.7-8 11.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 8v8M12 12c1.6-.4 2.8-1.6 3.2-3.2M12 14.5c-1.6-.4-2.8-1.6-3.2-3.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const CATEGORY_ICON: Record<string, React.ElementType> = {
  bank_deposit: Landmark,
  bank_account: Landmark,
  insurance: ShieldCheck,
  mutual_fund: TrendingUp,
  shares: PieChart,
  provident_fund: Wallet,
  other: Vault,
  unknown: HelpCircle,
};

export const CATEGORY_LABEL: Record<string, string> = {
  bank_deposit: "Bank deposit",
  bank_account: "Bank account",
  insurance: "Insurance",
  mutual_fund: "Mutual fund",
  shares: "Shares & dividends",
  provident_fund: "Provident fund",
  other: "Other asset",
  unknown: "Unclassified",
};

/** Document types (DocumentRecord.category), written for people. */
export const DOC_CATEGORY_LABEL: Record<string, string> = {
  bank_statement: "Bank statement",
  policy_document: "Insurance policy or receipt",
  death_certificate: "Death certificate",
  will: "Will",
  claim_letter: "Letter from an institution",
  receipt: "Receipt",
  other: "Other document",
};

const STATUS_STYLES: Record<string, string> = {
  not_started: "bg-secondary text-secondary-foreground",
  ready: "bg-teal-soft text-teal-brand border border-teal-brand/20",
  in_progress: "bg-gold-soft text-[#7a5a1c] border border-gold/25",
  waiting_institution: "bg-[#f2e8e8] text-[#8a4a45] border border-[#8a4a45]/20",
  needs_expert: "bg-navy/5 text-navy border border-navy/15",
  completed: "bg-teal-brand text-white",
};

export const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  ready: "Ready",
  in_progress: "In progress",
  waiting_institution: "Waiting for institution",
  needs_expert: "Needs expert",
  completed: "Completed",
};

export function TaskStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("rounded-full px-2.5 text-[13px] font-medium", STATUS_STYLES[status] ?? "bg-secondary")}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

/**
 * The four evidence statuses from PRD FL-07 / DESIGN §6. The server sets them
 * (src/server/rules/evidence.ts); the UI only reads them. Always written in words.
 */
export type EvidenceStatus = "self_declared" | "potential_match" | "document_backed" | "institution_verified" | "dismissed";

export function evidenceStatusOf(asset: { discoveryStatus: string; evidenceStatus: string }): EvidenceStatus {
  if (asset.discoveryStatus === "dismissed") return "dismissed";
  const s = asset.evidenceStatus as EvidenceStatus;
  return s in EVIDENCE_LABEL ? s : "self_declared";
}

const EVIDENCE_LABEL: Record<EvidenceStatus, { label: string; hint: string; className: string }> = {
  institution_verified: {
    label: "Institution-verified",
    hint: "The bank, fund house or insurer confirmed it",
    className: "bg-teal-brand text-white",
  },
  document_backed: {
    label: "Document-backed",
    hint: "A document you reviewed supports it",
    className: "border border-teal-brand/40 bg-teal-soft text-[#0b6b6a]",
  },
  self_declared: {
    label: "Self-declared",
    hint: "You told us about it; no document yet",
    className: "border border-navy/20 bg-secondary text-navy",
  },
  potential_match: {
    label: "Potential match",
    hint: "A search or a clue suggests it — not confirmed",
    className: "border border-gold/40 bg-gold-soft text-[#7a5a1c]",
  },
  dismissed: { label: "Dismissed", hint: "You marked this as not relevant", className: "border text-muted-foreground" },
};

export function VerificationBadge({
  asset,
}: {
  asset: { discoveryStatus: string; evidenceStatus: string };
}) {
  const s = EVIDENCE_LABEL[evidenceStatusOf(asset)];
  return (
    <Badge title={s.hint} className={cn("rounded-full text-[13px] font-medium", s.className)}>
      {evidenceStatusOf(asset) === "institution_verified" && <ShieldCheck className="mr-1 h-3 w-3" />}
      {s.label}
    </Badge>
  );
}

export function ConfidenceMeter({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full", pct >= 75 ? "bg-teal-brand" : pct >= 45 ? "bg-gold" : "bg-[#8a4a45]")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[13px] tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

export function EvidenceBox({ children, label = "Evidence" }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="rounded-md border border-teal-brand/15 bg-teal-soft/60 px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-teal-brand">
        <FileText className="h-3 w-3" /> {label}
      </div>
      <div className="text-[14px] leading-relaxed text-ink/80">{children}</div>
    </div>
  );
}

export function TrustFooter({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={cn(
        "mt-auto border-t px-6 py-4 text-[13px] leading-relaxed",
        dark ? "border-white/10 bg-navy-deep text-white/50" : "border-border bg-card text-muted-foreground"
      )}
    >
      Financial Legacy prepares information and guides you to official processes. It never submits claims on your behalf,
      never requests banking credentials or OTPs, and clearly marks AI-generated hypotheses, user-confirmed facts, and
      live official integrations. Demo data is synthetic. Portal availability verified Oct 2026.
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  light = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  light?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow ? <div className="eyebrow mb-2">{eyebrow}</div> : null}
      <h2 className={cn("font-display text-2xl font-semibold leading-tight sm:text-3xl", light ? "text-white" : "text-navy")}>
        {title}
      </h2>
      {sub ? <p className={cn("mt-3 text-[15px] leading-relaxed", light ? "text-white/70" : "text-muted-foreground")}>{sub}</p> : null}
    </div>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge className="rounded-full border border-gold/40 bg-gold-soft px-2.5 text-[12px] font-bold tracking-wider text-[#7a5a1c]">
      DEMO DATA
    </Badge>
  );
}
