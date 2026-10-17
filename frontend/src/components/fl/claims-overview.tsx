"use client";

import Link from "next/link";
import type { CaseWorkspace } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CATEGORY_ICON, CATEGORY_LABEL, VerificationBadge, evidenceStatusOf } from "./ui-bits";
import { LockedNotice } from "./gate-panel";
import { caseHref } from "./case-nav";
import { CircleAlert, FolderOpen, Info, Lock, Route } from "lucide-react";

/**
 * Interim Claims area: one card per holding with its evidence, entitlement and
 * the next saved step. Claim paths, packs, approval and tracking (DESIGN §7.2)
 * come in a later round.
 */
export default function ClaimsOverview({ ws }: { ws: CaseWorkspace }) {
  if (!ws.gate.discoveryUnlocked) return <LockedNotice ws={ws} what="Claims" />;

  const holdings = ws.assets.filter((a) => a.discoveryStatus !== "dismissed");
  const records = caseHref(ws.case.id, "records");

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-navy/15 bg-card px-4 py-3 text-[13px] leading-relaxed text-ink/85">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-brand" />
        <p>
          One card for each holding we know about. Claim packs and tracking are coming next; for now, follow each
          claim&apos;s saved steps. Your family submits every claim to the institution — we never submit one for you.
        </p>
      </div>

      {holdings.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FolderOpen className="h-7 w-7 text-muted-foreground/50" />
            <div className="text-[14px] font-medium text-navy">No holdings to claim yet</div>
            <p className="max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
              Upload a statement or policy in Records, or add a holding you already know about.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href={records}>Open Records</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {holdings.map((a) => {
          const Icon = CATEGORY_ICON[a.category] ?? CATEGORY_ICON.unknown;
          const steps = ws.tasks.filter(
            (t) => (t.assetCategory && t.assetCategory === a.category) || (t.institution && a.institution.toLowerCase().includes(t.institution.toLowerCase()))
          );
          const own = steps.find((t) => t.status !== "completed") ?? null;
          // Most saved steps cover the whole case rather than one holding.
          const caseNext = ws.tasks.find((t) => t.isNextBest) ?? null;
          const potential = evidenceStatusOf(a) === "potential_match";
          return (
            <Card key={a.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[14.5px] font-semibold leading-snug text-navy">{a.institution}</h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                        <span>{CATEGORY_LABEL[a.category] ?? a.category}</span>
                        {a.maskedRef && <><span>·</span><span className="font-mono text-[11.5px]">{a.maskedRef}</span></>}
                        {a.valueBand && <><span>·</span><span>{a.valueBand}</span></>}
                      </div>
                    </div>
                  </div>
                  <VerificationBadge asset={a} />
                </div>

                <dl className="grid gap-1.5 text-[12.5px]">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-ink/70">Entitlement:</dt>
                    <dd className="text-ink">
                      {a.entitled ? "Recorded (simulated check)" : (
                        <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Not proven yet — prove it in Records</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-ink/70">Next step:</dt>
                    <dd className="min-w-0 text-ink">
                      {own ? own.title : caseNext ? <>{caseNext.title} <span className="text-muted-foreground">(for the whole case)</span></> : "No open step"}
                    </dd>
                  </div>
                </dl>

                {potential && (
                  <div className="flex items-start gap-2 rounded-lg border border-gold/40 bg-gold-soft/60 px-3 py-2 text-[12px] leading-relaxed text-[#7a5a1c]">
                    <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    This is a possible match — please check the source in Records before starting a claim.
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button asChild size="sm" variant="outline" className="h-9 text-[12px]">
                    <Link href={records}><FolderOpen className="mr-1 h-3.5 w-3.5" /> Open in Records</Link>
                  </Button>
                  <Button asChild size="sm" className="h-9 bg-navy text-[12px] text-white hover:bg-navy-deep">
                    <Link href={caseHref(ws.case.id, "steps")}><Route className="mr-1 h-3.5 w-3.5" /> See steps</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
