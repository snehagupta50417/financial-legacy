"use client";

import Link from "next/link";
import type { CaseWorkspace } from "@/lib/types";
import { cn } from "@/lib/utils";
import { activeHoldings, caseActions, currentStage, journeyStages, potentialMatches, type CaseAction } from "@/lib/journey";
import { evidenceStatusOf, LeafLogo } from "./ui-bits";
import { caseHref } from "./case-nav";
import AskPanel from "./ask-panel";
import JourneyRail from "./journey-rail";
import {
  ArrowRight,
  CircleAlert,
  CircleCheckBig,
  CircleHelp,
  FileScan,
  FileWarning,
  FolderPlus,
  LifeBuoy,
  Route,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";

const ACTION_ICON: Record<CaseAction["kind"], React.ElementType> = {
  hold: LifeBuoy,
  gate: ShieldCheck,
  review_document: FileScan,
  check_matches: SearchCheck,
  failed_document: FileWarning,
  next_step: Route,
  add_records: FolderPlus,
};

function when(iso: string): string {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function holdingsSentence(ws: CaseWorkspace): string {
  if (!ws.gate.discoveryUnlocked) return "Nothing about the assets is looked up until verification is complete.";
  const all = activeHoldings(ws);
  if (all.length === 0) return "We haven't found any holdings yet.";
  const counts = { institution_verified: 0, document_backed: 0, self_declared: 0, potential_match: 0 };
  for (const a of all) {
    const s = evidenceStatusOf(a);
    if (s in counts) counts[s as keyof typeof counts] += 1;
  }
  const parts = [
    counts.institution_verified && `${counts.institution_verified} institution-verified`,
    counts.document_backed && `${counts.document_backed} document-backed`,
    counts.self_declared && `${counts.self_declared} self-declared`,
    counts.potential_match && `${counts.potential_match} still ${counts.potential_match === 1 ? "a possible match" : "possible matches"} to confirm`,
  ].filter(Boolean);
  return `So far: ${all.length} ${all.length === 1 ? "holding" : "holdings"} — ${parts.join(", ")}. This is what we've found from the sources checked, not a complete list.`;
}

/** Conversation — the default entry to a case (DESIGN §2.2): the case manager's summary, action cards, facts and the assistant. */
export default function ConversationHome({ ws }: { ws: CaseWorkspace }) {
  const c = ws.case;
  const stages = journeyStages(ws);
  const now = currentStage(stages);
  const stepNo = stages.findIndex((s) => s.key === now.key) + 1;
  const actions = caseActions(ws);
  const matches = potentialMatches(ws).length;
  const firstName = ws.gate.journeyKind === "personal" ? null : c.assetHolderName?.split(/[ (]/)[0];

  const href = (to: string) => (to.startsWith("#") ? to : caseHref(c.id) + (to ? `/${to}` : ""));

  return (
    <div className="grid min-w-0 grid-cols-1 gap-8 xl:grid-cols-[minmax(0,760px)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-8">
        {/* The case manager speaks first */}
        <section aria-labelledby="standing-heading" className="flex gap-3">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-[#7cc5c4]" aria-hidden>
            <LeafLogo className="h-5 w-5" />
          </span>
          <div className="assistant-bubble min-w-0 flex-1 p-5 shadow-sm sm:p-6">
            <div className="text-[13px] font-semibold text-teal-brand">Your case manager</div>
            <h1 id="standing-heading" className="mt-1 font-display text-[24px] font-semibold leading-tight text-navy sm:text-[28px]">
              Here&apos;s where things stand{firstName ? ` with ${firstName}'s case` : " with your case"}.
            </h1>
            <p className="mt-3 text-[16px] leading-relaxed text-ink/85">{c.summary}</p>
            <p className="mt-3 text-[16px] leading-relaxed text-ink/85">{holdingsSentence(ws)}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-teal-soft/70 px-4 py-3 text-[15px] text-ink">
              <span className="font-semibold text-[#0b6b6a]">Step {stepNo} of 6:</span>
              <span className="font-medium">{now.title}</span>
              <span className="text-ink/70">— {now.detail}</span>
            </div>
            {/* Mobile has no sidebar, so the journey lives here */}
            <details className="mt-3 md:hidden">
              <summary className="min-h-10 cursor-pointer py-2 text-[15px] font-medium text-teal-brand">See all six steps</summary>
              <div className="pt-2">
                <JourneyRail stages={stages} />
              </div>
            </details>
          </div>
        </section>

        {/* What needs you now */}
        {actions.length > 0 && (
          <section aria-labelledby="needs-heading">
            <h2 id="needs-heading" className="mb-3 text-[20px] font-semibold text-navy">What needs you now</h2>
            <ul className="space-y-3">
              {actions.map((a, i) => {
                const Icon = ACTION_ICON[a.kind];
                const urgent = a.kind === "hold" || a.kind === "failed_document";
                return (
                  <li key={`${a.kind}-${i}`}>
                    <div className={cn("flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center", i === 0 && !urgent && "border-teal-brand/40 ring-1 ring-teal-brand/20", urgent && "border-destructive/30")}>
                      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", urgent ? "bg-destructive/10 text-destructive" : "bg-teal-soft text-teal-brand")} aria-hidden>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-[17px] font-semibold leading-snug text-navy">{a.title}</h3>
                        <p className="mt-1 text-[15px] leading-relaxed text-ink/75">{a.body}</p>
                      </div>
                      <Link
                        href={href(a.to)}
                        className={cn(
                          "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-[15px] font-semibold",
                          i === 0 ? "bg-teal-brand text-white hover:bg-[#0c6a69]" : "border bg-card text-navy hover:bg-teal-soft"
                        )}
                      >
                        {a.cta} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* What we know vs what still needs checking */}
        <section aria-labelledby="facts-heading">
          <h2 id="facts-heading" className="mb-3 text-[20px] font-semibold text-navy">What we know so far</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-[#0b6b6a]">
                <CircleCheckBig className="h-4 w-4" /> Facts you've confirmed
              </h3>
              <ul className="mt-3 space-y-2.5">
                {c.confirmedFacts.length ? (
                  c.confirmedFacts.map((f, i) => (
                    <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-ink/90">
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-brand" aria-hidden /> {f}
                    </li>
                  ))
                ) : (
                  <li className="text-[15px] text-muted-foreground">Nothing confirmed yet.</li>
                )}
              </ul>
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-[#7a5a1c]">
                <CircleHelp className="h-4 w-4" /> Still to check
              </h3>
              <ul className="mt-3 space-y-2.5">
                {c.assumptions.length || matches ? (
                  <>
                    {c.assumptions.map((a, i) => (
                      <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-ink/80">
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden /> {a}
                      </li>
                    ))}
                    {matches > 0 && (
                      <li className="flex gap-2 text-[15px] leading-relaxed text-ink/80">
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                        {matches} possible {matches === 1 ? "holding needs" : "holdings need"} confirming
                      </li>
                    )}
                  </>
                ) : (
                  <li className="text-[15px] text-muted-foreground">Nothing open.</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* The assistant */}
        <section aria-labelledby="assistant-heading">
          <h2 id="assistant-heading" className="mb-3 text-[20px] font-semibold text-navy">Ask about this case</h2>
          <AskPanel caseId={c.id} />
        </section>
      </div>

      {/* Right rail: recent activity */}
      <aside aria-labelledby="activity-heading" className="min-w-0">
        <div className="rounded-2xl border bg-card p-5 xl:sticky xl:top-20">
          <h2 id="activity-heading" className="text-[17px] font-semibold text-navy">Recent activity</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Everything saved on this case, newest first.</p>
          <ol className="mt-4 space-y-3.5">
            {ws.events.slice(0, 8).map((e) => (
              <li key={e.id} className="border-l-2 border-teal-brand/25 pl-3">
                <div className="text-[14px] leading-snug text-ink/90">{e.description}</div>
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {e.actor === "user" ? "You" : e.actor === "ai" ? "Assistant" : "System"} · {when(e.createdAt)}
                </div>
              </li>
            ))}
            {!ws.events.length && <li className="text-[14px] text-muted-foreground">Nothing yet.</li>}
          </ol>
          {c.isDemo && (
            <p className="mt-4 flex gap-2 rounded-xl bg-gold-soft px-3 py-2.5 text-[13px] leading-relaxed text-[#7a5a1c]">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Demonstration — synthetic records. No real identity verification, asset discovery or claim submission.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
