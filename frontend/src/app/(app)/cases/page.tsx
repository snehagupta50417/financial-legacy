"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DemoDialog } from "@/components/fl/dialogs";
import { DemoBadge } from "@/components/fl/ui-bits";
import { caseHref } from "@/components/fl/case-nav";
import { api } from "@/lib/client";
import { ArrowRight, FolderOpen, Loader2, PauseCircle, Play, Plus } from "lucide-react";

interface CaseRow {
  id: string;
  scenarioLabel: string | null;
  assetHolderName: string | null;
  nextBestAction: string | null;
  progress: number;
  isDemo: boolean;
  frozenReason: string | null;
  updatedAt: string;
}

/** My cases (DESIGN §2.2): subject, goal, state and next step. No balances or document previews. */
export default function CasesPage() {
  const router = useRouter();
  const [demoOpen, setDemoOpen] = useState(false);
  const [cases, setCases] = useState<CaseRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const open = (id: string) => router.push(caseHref(id));

  useEffect(() => {
    let alive = true;
    api
      .get<{ cases: CaseRow[] }>("/api/cases")
      .then((d) => alive && setCases(d.cases))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="paper-wash flex-1">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[30px] font-semibold text-navy">My cases</h1>
            <p className="mt-1 text-[16px] leading-relaxed text-muted-foreground">
              Each case is about one person&apos;s assets, kept separate. Saved privately in this browser.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDemoOpen(true)} className="h-11 px-4 text-[15px]">
              <Play className="mr-1.5 h-4 w-4" /> See an example
            </Button>
            <Button asChild className="h-11 bg-teal-brand px-4 text-[15px] font-semibold text-white hover:bg-[#0c6a69]">
              <Link href="/start">
                <Plus className="mr-1.5 h-4 w-4" /> New case
              </Link>
            </Button>
          </div>
        </div>

        {cases === null && !failed && (
          <div className="flex items-center justify-center gap-2 py-16 text-[15px] text-muted-foreground" role="status">
            <Loader2 className="h-5 w-5 animate-spin text-teal-brand" /> Loading your cases…
          </div>
        )}
        {failed && <p className="rounded-2xl border bg-card px-5 py-6 text-[15px] text-destructive">We couldn&apos;t load your cases. Please refresh to try again.</p>}

        {cases?.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-14 text-center">
            <FolderOpen className="h-9 w-9 text-muted-foreground/50" />
            <h2 className="text-[19px] font-semibold text-navy">No cases yet</h2>
            <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Start by telling us what happened, or explore an example case with synthetic data first.
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Button asChild className="h-11 bg-teal-brand px-5 text-[15px] text-white hover:bg-[#0c6a69]">
                <Link href="/start">Tell us what happened</Link>
              </Button>
              <Button variant="outline" onClick={() => setDemoOpen(true)} className="h-11 px-5 text-[15px]">See an example</Button>
            </div>
          </div>
        )}

        {cases && cases.length > 0 && (
          <ul className="space-y-3">
            {cases.map((c) => (
              <li key={c.id}>
                <Link
                  href={caseHref(c.id)}
                  className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:p-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words font-display text-[20px] font-semibold leading-snug text-navy">{c.assetHolderName ?? "Untitled case"}</h2>
                      {c.isDemo && <DemoBadge />}
                    </div>
                    <p className="mt-0.5 text-[15px] text-ink/75">{c.scenarioLabel ?? "Case"}</p>
                    {c.frozenReason ? (
                      <p className="mt-3 flex items-center gap-1.5 text-[15px] font-medium text-destructive">
                        <PauseCircle className="h-4 w-4" /> Paused for review
                      </p>
                    ) : (
                      <p className="mt-3 text-[15px] leading-relaxed text-ink/90">
                        <span className="font-semibold text-[#0b6b6a]">Next: </span>
                        {c.nextBestAction ?? "All saved steps are done"}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-6 sm:flex-col sm:items-end sm:gap-1">
                    <div className="text-[14px] text-muted-foreground">
                      <span className="font-semibold tabular-nums text-ink">{Math.round(c.progress)}%</span> of steps done
                    </div>
                    <div className="text-[13px] text-muted-foreground">
                      Updated {new Date(c.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[15px] font-semibold text-teal-brand">
                      Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <DemoDialog open={demoOpen} onOpenChange={setDemoOpen} onLoaded={open} />
    </div>
  );
}
