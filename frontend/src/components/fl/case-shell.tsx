"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/client";
import type { CaseWorkspace } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { journeyStages } from "@/lib/journey";
import { DemoBadge } from "./ui-bits";
import AskPanel from "./ask-panel";
import GatePanel from "./gate-panel";
import JourneyRail from "./journey-rail";
import { CaseContext } from "./case-context";
import { areaOf, caseHref, goalArea, type CaseArea } from "./case-nav";
import {
  ArrowLeft,
  Bot,
  CircleAlert,
  FileSignature,
  FolderOpen,
  LifeBuoy,
  MessagesSquare,
  Route,
  Scale,
} from "lucide-react";

const AREA_META: Record<CaseArea, { label: string; icon: React.ElementType; hint: string }> = {
  conversation: { label: "Conversation", icon: MessagesSquare, hint: "Where things stand" },
  records: { label: "Records", icon: FolderOpen, hint: "Holdings and documents" },
  plan: { label: "Plan", icon: FileSignature, hint: "Your legacy record" },
  claims: { label: "Claims", icon: Scale, hint: "One card per holding" },
  steps: { label: "Steps", icon: Route, hint: "What to do, in order" },
  help: { label: "Get help", icon: LifeBuoy, hint: "Talk to a person" },
};

/**
 * Frames every page under /cases/[id]: a sidebar with the case, its areas and
 * the six-step journey on desktop; a compact header and bottom navigation on
 * mobile (DESIGN §2.3). Loads the case once and shares it through context.
 */
export default function CaseShell({ caseId, children }: { caseId: string; children: React.ReactNode }) {
  const pathname = usePathname();
  // Keyed by case id so switching case never shows the previous case's data (FL-22).
  const [loaded, setLoaded] = useState<{ id: string; ws: CaseWorkspace } | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const [askOpen, setAskOpen] = useState(false);

  const fetchCase = useCallback(async () => {
    try {
      const ws = await api.get<CaseWorkspace>(`/api/cases/${caseId}`);
      setLoaded({ id: caseId, ws });
      setError(null);
    } catch (e) {
      setError({ id: caseId, message: e instanceof Error ? e.message : "We couldn't open this case." });
    }
  }, [caseId]);

  useEffect(() => {
    let alive = true;
    api
      .get<CaseWorkspace>(`/api/cases/${caseId}`)
      .then((ws) => {
        if (!alive) return;
        setLoaded({ id: caseId, ws });
        setError(null);
      })
      .catch((e) => alive && setError({ id: caseId, message: e instanceof Error ? e.message : "We couldn't open this case." }));
    return () => {
      alive = false;
    };
  }, [caseId]);

  const ws = loaded?.id === caseId ? loaded.ws : null;
  const stages = useMemo(() => (ws ? journeyStages(ws) : []), [ws]);

  if (error?.id === caseId && !ws) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <CircleAlert className="h-9 w-9 text-destructive" />
        <h1 className="font-display text-2xl font-semibold text-navy">We couldn&apos;t open this case</h1>
        <p className="max-w-sm text-[15px] text-muted-foreground">{error.message}</p>
        <Button asChild className="h-11 bg-navy px-5 text-white hover:bg-navy-deep">
          <Link href="/cases">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to my cases
          </Link>
        </Button>
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center" role="status">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="typing-dots text-xl text-teal-brand" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <div className="text-[15px]">Loading your case…</div>
        </div>
      </div>
    );
  }

  const c = ws.case;
  const current = areaOf(pathname, caseId);
  const main: CaseArea[] = ["conversation", "records", goalArea(c.holderLiving), "steps"];
  const counts: Partial<Record<CaseArea, string>> = {
    records: ws.gate.discoveryUnlocked ? String(ws.assets.filter((a) => a.discoveryStatus !== "dismissed").length + ws.documents.length) : undefined,
    steps: ws.tasks.length ? `${ws.tasks.filter((t) => t.status === "completed").length}/${ws.tasks.length}` : undefined,
  };

  return (
    <CaseContext.Provider value={{ ws, reload: fetchCase }}>
      <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-1">
        {/* Desktop sidebar */}
        <aside className="nice-scroll sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[272px] shrink-0 flex-col overflow-y-auto border-r bg-card md:flex">
          <div className="border-b px-5 pb-4 pt-5">
            <Link href="/cases" className="-ml-1 inline-flex min-h-8 items-center rounded-md px-1 text-[13px] text-muted-foreground hover:text-navy">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> All cases
            </Link>
            <div className="mt-1.5 font-display text-[19px] font-semibold leading-snug text-navy">{c.assetHolderName ?? "Your case"}</div>
            <div className="mt-1 text-[13px] leading-snug text-muted-foreground">{c.scenarioLabel ?? c.caseType}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.isDemo && <DemoBadge />}
              {c.holderLiving === false && (
                <span className="rounded-full border px-2 py-0.5 text-[12px] text-ink/75">Holder has passed away</span>
              )}
            </div>
          </div>

          <nav aria-label="Case areas" className="px-3 py-3">
            <ul className="space-y-0.5">
              {[...main, "help" as const].map((area) => {
                const m = AREA_META[area];
                const active = current === area;
                return (
                  <li key={area}>
                    <Link
                      href={caseHref(caseId, area)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 transition-colors",
                        active ? "bg-navy text-white" : "text-ink hover:bg-teal-soft"
                      )}
                    >
                      <m.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-[#7cc5c4]" : "text-teal-brand")} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium leading-tight">{m.label}</span>
                        <span className={cn("block text-[12px] leading-tight", active ? "text-white/70" : "text-muted-foreground")}>{m.hint}</span>
                      </span>
                      {counts[area] && (
                        <span className={cn("rounded-full px-2 text-[12px] tabular-nums", active ? "bg-white/15" : "bg-secondary text-ink/80")}>{counts[area]}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-1 border-t px-5 py-4">
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Your journey</h2>
            <JourneyRail stages={stages} />
          </div>

          <p className="mt-auto border-t px-5 py-3 text-[12px] leading-relaxed text-muted-foreground">
            Progress means saved steps — we never claim every asset has been found.
          </p>
        </aside>

        {/* Main column */}
        <div className="paper-wash min-w-0 flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:px-8 md:pb-24 md:pt-7">
          {/* Mobile case header */}
          <div className="mb-4 md:hidden">
            <div className="flex items-center justify-between gap-2">
              <Link href="/cases" className="-ml-1 inline-flex min-h-10 items-center rounded-md px-1 text-[14px] text-muted-foreground">
                <ArrowLeft className="mr-1 h-4 w-4" /> All cases
              </Link>
              <Link href={caseHref(caseId, "help")} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-teal-brand hover:bg-teal-soft">
                <LifeBuoy className="h-4 w-4" /> Get help
              </Link>
            </div>
            <div className="font-display text-[22px] font-semibold leading-tight text-navy">{c.assetHolderName ?? "Your case"}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
              <span>{c.scenarioLabel ?? c.caseType}</span>
              {c.isDemo && <DemoBadge />}
            </div>
          </div>

          {/* Trust gates: shown until discovery is unlocked (or while frozen) */}
          {!ws.gate.discoveryUnlocked && (
            <div id="verification" className="mb-6 scroll-mt-20">
              <GatePanel ws={ws} reload={fetchCase} />
            </div>
          )}

          <div className="min-w-0">{children}</div>
        </div>
      </div>

      {/* Mobile bottom navigation — the four main areas (DESIGN §2.3) */}
      <nav aria-label="Case areas" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-4">
          {main.map((area) => {
            const m = AREA_META[area];
            const active = current === area;
            return (
              <li key={area}>
                <Link
                  href={caseHref(caseId, area)}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex min-h-[60px] flex-col items-center justify-center gap-0.5 px-1 text-[12px] font-medium", active ? "text-navy" : "text-ink/70")}
                >
                  <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-teal-soft text-teal-brand")}>
                    <m.icon className="h-5 w-5" />
                  </span>
                  {m.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Floating assistant on desktop; on mobile and in Conversation it is inline so it never covers content */}
      {current !== "conversation" && (
        <div className="fixed bottom-6 right-6 z-40 hidden md:block">
          {askOpen && <AskPanel caseId={caseId} onClose={() => setAskOpen(false)} />}
          <Button onClick={() => setAskOpen((v) => !v)} className="h-12 rounded-full bg-navy px-5 text-[15px] font-semibold text-white shadow-lg hover:bg-navy-deep">
            {askOpen ? "Close assistant" : <><Bot className="mr-2 h-5 w-5 text-[#7cc5c4]" /> Ask about this case</>}
          </Button>
        </div>
      )}
    </CaseContext.Provider>
  );
}
