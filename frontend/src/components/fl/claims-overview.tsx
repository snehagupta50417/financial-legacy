"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { CaseWorkspace } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CATEGORY_ICON, CATEGORY_LABEL, VerificationBadge, evidenceStatusOf } from "./ui-bits";
import { LockedNotice } from "./gate-panel";
import { caseHref } from "./case-nav";
import { ArrowRight, CircleAlert, FolderOpen, Info, Loader2 } from "lucide-react";

const WAITING: Record<string, string> = {
  family: "Waiting on you",
  institution: "Waiting on the institution",
  financial_legacy: "Our team will help",
};

const NOMINEE: Record<string, string> = { recorded: "Recorded", none: "None recorded", unknown: "Unknown" };

function day(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Claims: one card per holding, each claim tracked on its own to an outcome (DESIGN §7.2, FL-12–FL-16). */
export default function ClaimsOverview({ ws }: { ws: CaseWorkspace }) {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);
  if (!ws.gate.discoveryUnlocked) return <LockedNotice ws={ws} what="Claims" />;

  const holdings = ws.assets.filter((a) => a.discoveryStatus !== "dismissed" && a.duplicateState !== "merged");
  const records = caseHref(ws.case.id, "records");
  const received = ws.claims.filter((c) => ["settled", "transferred", "partially_settled"].includes(c.outcome ?? "") && c.outcomeAmountDisplay);
  const rejected = ws.claims.filter((c) => c.outcome === "rejected").length;

  async function start(assetId: string) {
    setStarting(assetId);
    try {
      const r = await api.post<{ claim: { id: string } }>("/api/claims", { caseId: ws.case.id, assetId });
      router.push(`${caseHref(ws.case.id, "claims")}/${r.claim.id}`);
    } catch (e) {
      toast({ title: "Couldn't start the claim", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
      setStarting(null);
    }
  }

  return (
    <div className="max-w-[1000px] space-y-6">
      <div className="max-w-2xl">
        <h1 className="font-display text-[26px] font-semibold text-navy">Claims</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          One claim for each holding, tracked on its own. We choose the claim path from official rules and prepare the paperwork with you.
        </p>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-navy/15 bg-card px-4 py-3 text-[15px] leading-relaxed text-ink/85">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-brand" />
        <p>Your family submits every claim to the institution — we never submit one for you. One claim&apos;s result never changes another&apos;s.</p>
      </div>

      {(received.length > 0 || rejected > 0) && (
        <div className="rounded-xl border bg-card px-4 py-3 text-[15px]">
          {received.length > 0 ? (
            <p>
              <span className="font-semibold text-navy">Received so far:</span> {received.map((c) => c.outcomeAmountDisplay).join(" + ")} from{" "}
              {received.length} {received.length === 1 ? "claim" : "claims"}.
            </p>
          ) : (
            <p className="text-ink/80">Nothing received yet.</p>
          )}
          {rejected > 0 && <p className="text-[14px] text-muted-foreground">{rejected} rejected {rejected === 1 ? "claim is" : "claims are"} not counted as money recovered.</p>}
        </div>
      )}

      {holdings.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FolderOpen className="h-9 w-7 text-muted-foreground/50" />
            <div className="text-[16px] font-medium text-navy">No holdings to claim yet</div>
            <p className="max-w-md text-[14px] leading-relaxed text-muted-foreground">Upload a statement or policy in Records, or add a holding you already know about.</p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href={records}>Open Records</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {holdings.map((a) => {
          const Icon = CATEGORY_ICON[a.category] ?? CATEGORY_ICON.unknown;
          const claim = ws.claims.find((c) => c.assetId === a.id);
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
                      <h3 className="text-[16px] font-semibold leading-snug text-navy">{a.institution}</h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[14px] text-muted-foreground">
                        <span>{CATEGORY_LABEL[a.category] ?? a.category}</span>
                        {a.maskedRef && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-[13px]">{a.maskedRef}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <VerificationBadge asset={a} />
                </div>

                <dl className="grid gap-1.5 text-[14px]">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-medium text-ink/70">Nominee:</dt>
                    <dd className="text-ink">{NOMINEE[a.nomineeStatus] ?? "Unknown"}</dd>
                  </div>
                  {claim ? (
                    <>
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-medium text-ink/70">Claim:</dt>
                        <dd className="text-ink">
                          {claim.statusLabel}
                          {claim.path ? ` · ${claim.path}` : ""}
                        </dd>
                      </div>
                      {claim.waitingOn && (
                        <div className="flex flex-wrap gap-x-2">
                          <dt className="font-medium text-ink/70">Next:</dt>
                          <dd className="text-ink">
                            {WAITING[claim.waitingOn]}
                            {claim.dueDate ? ` · due ${day(claim.dueDate)}` : ""}
                          </dd>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-ink/70">Claim:</dt>
                      <dd className="text-ink">Not started</dd>
                    </div>
                  )}
                </dl>

                {potential && (
                  <div className="flex items-start gap-2 rounded-lg border border-gold/40 bg-gold-soft/60 px-3 py-2 text-[14px] leading-relaxed text-[#7a5a1c]">
                    <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    This is a possible match — confirm it in Records before starting a claim.
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-1.5">
                  {potential ? (
                    <Button asChild size="sm" variant="outline" className="h-10 text-[14px]">
                      <Link href={records}>Check it in Records</Link>
                    </Button>
                  ) : claim ? (
                    <Button asChild size="sm" className="h-10 bg-navy text-[14px] text-white hover:bg-navy-deep">
                      <Link href={`${caseHref(ws.case.id, "claims")}/${claim.id}`}>
                        Open claim <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" disabled={starting === a.id} onClick={() => start(a.id)} className="h-10 bg-teal-brand text-[14px] text-white hover:bg-[#0c6a69]">
                      {starting === a.id && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Start claim
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
