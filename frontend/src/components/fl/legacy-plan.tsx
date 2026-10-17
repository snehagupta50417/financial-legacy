"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/client";
import type { CaseWorkspace } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { activeHoldings, legacyGaps, EVIDENCE_GROUPS } from "@/lib/journey";
import { CATEGORY_ICON, CATEGORY_LABEL, VerificationBadge, evidenceStatusOf } from "./ui-bits";
import { LockedNotice } from "./gate-panel";
import { caseHref } from "./case-nav";
import { ArrowRight, CircleAlert, ClipboardList, FileText, Loader2, NotebookPen, Users } from "lucide-react";

/**
 * Plan — the legacy record for a living person (DESIGN §5.3, §7.1): a dated
 * record of holdings, a gaps checklist, and "Notes for your lawyer" in place
 * of AI will drafting (the PRD rules out drafting binding wills).
 */
export default function LegacyPlan({ ws }: { ws: CaseWorkspace }) {
  const [wishes, setWishes] = useState("");
  const [notes, setNotes] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!ws.gate.discoveryUnlocked) return <LockedNotice ws={ws} what="Your legacy record" />;

  const holdings = activeHoldings(ws);
  const order = (s: string) => EVIDENCE_GROUPS.indexOf(s as (typeof EVIDENCE_GROUPS)[number]);
  const sorted = [...holdings].sort((a, b) => order(evidenceStatusOf(a)) - order(evidenceStatusOf(b)));
  const gaps = legacyGaps(ws);
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const to = (path: string) => caseHref(ws.case.id) + (path ? `/${path}` : "");

  async function draftNotes() {
    setBusy(true);
    try {
      const res = await api.post<{ draft: string }>("/api/ai/draft", { caseId: ws.case.id, kind: "lawyer_notes", context: wishes });
      setNotes(res.draft);
    } catch (e) {
      toast({ title: "Couldn't prepare the notes", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[1000px] space-y-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-[26px] font-semibold text-navy">Your legacy record</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          What your family would need to know: what you hold, how we know it, and what&apos;s still missing. Nothing here is
          shared with anyone.
        </p>
      </div>

      {/* The record */}
      <section aria-labelledby="record-heading" className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="record-heading" className="text-[19px] font-semibold text-navy">What you hold</h2>
          <span className="text-[14px] text-muted-foreground">As of {today}</span>
        </div>
        {sorted.length ? (
          <ul className="mt-4 divide-y">
            {sorted.map((a) => {
              const Icon = CATEGORY_ICON[a.category] ?? CATEGORY_ICON.unknown;
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0 text-navy" aria-hidden />
                    <div className="min-w-0">
                      <div className="break-words text-[16px] font-medium text-ink">{a.institution}</div>
                      <div className="text-[14px] text-muted-foreground">
                        {CATEGORY_LABEL[a.category] ?? a.category}
                        {a.maskedRef ? ` · ${a.maskedRef}` : ""}
                      </div>
                    </div>
                  </div>
                  <VerificationBadge asset={a} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-[15px] text-muted-foreground">Nothing recorded yet. Add documents or holdings in Records.</p>
        )}
        <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
          Possible matches are listed but not treated as confirmed. Amounts are left out on purpose — balances change, and your
          family will get current figures from each institution.
        </p>
      </section>

      {/* Gaps */}
      <section aria-labelledby="gaps-heading">
        <h2 id="gaps-heading" className="flex items-center gap-2 text-[19px] font-semibold text-navy">
          <ClipboardList className="h-5 w-5 text-teal-brand" /> What would make it complete
        </h2>
        {gaps.length ? (
          <ul className="mt-3 space-y-2">
            {gaps.map((g, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
                <span className="flex min-w-0 items-start gap-2.5 text-[15px] leading-relaxed text-ink/90">
                  <CircleAlert className="mt-1 h-4 w-4 shrink-0 text-[#7a5a1c]" /> {g.text}
                </span>
                {g.to && (
                  <Link href={to(g.to)} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-3 text-[15px] font-medium text-teal-brand hover:bg-teal-soft">
                    Go <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border bg-card px-4 py-3 text-[15px] text-muted-foreground">No open gaps in what&apos;s recorded.</p>
        )}
        <p className="mt-2 text-[14px] text-muted-foreground">Nominee details aren&apos;t read automatically yet — check each statement or policy for them.</p>
      </section>

      {/* Trusted contacts — not built */}
      <section aria-labelledby="contacts-heading" className="rounded-2xl border border-dashed bg-card/60 p-5">
        <h2 id="contacts-heading" className="flex items-center gap-2 text-[17px] font-semibold text-navy">
          <Users className="h-5 w-5 text-teal-brand" /> Who should be told
        </h2>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          Coming soon: note who should know about this record. Adding someone will send nothing and give them no access — it&apos;s
          a record of your intent.
        </p>
      </section>

      {/* Notes for your lawyer */}
      <section aria-labelledby="notes-heading" className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <h2 id="notes-heading" className="flex items-center gap-2 text-[19px] font-semibold text-navy">
          <NotebookPen className="h-5 w-5 text-teal-brand" /> Notes for your lawyer
        </h2>
        <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          A plain summary of what you hold and what you want, to take to a lawyer or chartered accountant. <strong className="font-semibold text-ink">It is not a will</strong> — a will needs proper legal advice, your signature and two witnesses.
        </p>
        <label htmlFor="wishes" className="mt-4 block text-[15px] font-medium text-ink/85">Your wishes, in your own words (optional)</label>
        <Textarea
          id="wishes"
          value={wishes}
          onChange={(e) => setWishes(e.target.value)}
          placeholder="For example: I'd like my two children to share things equally, and my wife to keep the house."
          className="mt-1.5 min-h-24 text-[16px]"
        />
        <Button onClick={draftNotes} disabled={busy} className="mt-3 h-11 bg-navy px-5 text-[15px] text-white hover:bg-navy-deep">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Prepare the notes
        </Button>
        {notes && (
          <div className="mt-5 rounded-xl border bg-background p-4 sm:p-5">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[#7a5a1c]">Draft — check it before you use it · not a will</p>
            <div className="text-[15px] leading-relaxed text-ink/90">
              <ReactMarkdown
                components={{
                  h1: (p) => <h3 className="mb-2 mt-1 font-display text-[19px] font-semibold text-navy" {...p} />,
                  h2: (p) => <h4 className="mb-1.5 mt-4 text-[16px] font-semibold text-navy" {...p} />,
                  h3: (p) => <h5 className="mb-1 mt-3 text-[15px] font-semibold text-navy" {...p} />,
                  p: (p) => <p className="mb-2.5" {...p} />,
                  li: (p) => <li className="mb-1 ml-5 list-disc" {...p} />,
                }}
              >
                {notes}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
