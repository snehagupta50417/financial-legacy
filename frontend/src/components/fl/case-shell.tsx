"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/client";
import type { CaseWorkspace } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DemoBadge } from "./ui-bits";
import AskPanel from "./ask-panel";
import GatePanel from "./gate-panel";
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
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const AREA_META: Record<CaseArea, { label: string; icon: React.ElementType }> = {
  conversation: { label: "Conversation", icon: MessagesSquare },
  records: { label: "Records", icon: FolderOpen },
  plan: { label: "Plan", icon: FileSignature },
  claims: { label: "Claims", icon: Scale },
  steps: { label: "Steps", icon: Route },
  help: { label: "Get help", icon: LifeBuoy },
};

/**
 * Loads one case and frames every page under /cases/[id]: case header, trust
 * gates, area navigation (tabs on desktop, bottom bar on mobile — DESIGN §2.3).
 */
export default function CaseShell({ caseId, children }: { caseId: string; children: React.ReactNode }) {
  const pathname = usePathname();
  // Keyed by case id so switching case never shows the previous case's data (DESIGN §2.3).
  const [loaded, setLoaded] = useState<{ id: string; ws: CaseWorkspace } | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const [askOpen, setAskOpen] = useState(false);

  const fetchCase = useCallback(async () => {
    try {
      const ws = await api.get<CaseWorkspace>(`/api/cases/${caseId}`);
      setLoaded({ id: caseId, ws });
      setError(null);
    } catch (e) {
      setError({ id: caseId, message: e instanceof Error ? e.message : "Failed to load case" });
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
      .catch((e) => alive && setError({ id: caseId, message: e instanceof Error ? e.message : "Failed to load case" }));
    return () => {
      alive = false;
    };
  }, [caseId]);

  const ws = loaded?.id === caseId ? loaded.ws : null;

  if (error?.id === caseId && !ws) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <CircleAlert className="h-8 w-8 text-destructive" />
        <h1 className="font-display text-xl font-semibold text-navy">Case unavailable</h1>
        <p className="max-w-sm text-[13.5px] text-muted-foreground">{error.message}</p>
        <Button asChild className="bg-navy text-white hover:bg-navy-deep">
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
          <div className="text-[13px]">Loading your case…</div>
        </div>
      </div>
    );
  }

  const c = ws.case;
  const current = areaOf(pathname, caseId);
  const main: CaseArea[] = ["conversation", "records", goalArea(c.holderLiving), "steps"];
  const compact = current !== "conversation";
  const counts: Partial<Record<CaseArea, string>> = {
    records: ws.gate.discoveryUnlocked
      ? String(ws.assets.filter((a) => a.discoveryStatus !== "dismissed").length + ws.documents.length)
      : undefined,
    steps: ws.tasks.length ? `${ws.tasks.filter((t) => t.status === "completed").length}/${ws.tasks.length}` : undefined,
  };

  return (
    <CaseContext.Provider value={{ ws, reload: fetchCase }}>
      <div className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 md:pb-24 md:pt-6">
        {/* Case header */}
        <div className={cn("rounded-2xl border bg-navy text-white shadow-sm", compact ? "p-4" : "p-4 sm:p-6")}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Link
                  href="/cases"
                  className="-ml-1 inline-flex h-7 items-center rounded-md px-1.5 text-[12px] text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" /> My cases
                </Link>
                {c.isDemo && <DemoBadge />}
                <Badge variant="outline" className="max-w-full truncate rounded-full border-[#7cc5c4]/40 bg-[#7cc5c4]/10 text-[10.5px] text-[#7cc5c4]">
                  {c.scenarioLabel ?? c.caseType}
                </Badge>
                {ws.gate.discoveryUnlocked && ws.gate.journeyKind !== "personal" && (
                  <Badge variant="outline" className="rounded-full border-[#7cc5c4]/40 text-[10.5px] text-[#7cc5c4]">
                    <ShieldCheck className="mr-1 h-3 w-3" /> Relationship verified
                  </Badge>
                )}
                {c.holderLiving === false && (
                  <Badge variant="outline" className="rounded-full border-white/20 text-[10.5px] text-white/75">
                    Holder deceased
                  </Badge>
                )}
              </div>
              <h1 className={cn("font-display font-semibold leading-snug", compact ? "truncate text-[18px]" : "line-clamp-2 text-[20px] sm:text-[22px]")}>
                {c.assetHolderName ?? "Your case"}
              </h1>
              {!compact && (
                <p className="mt-1.5 line-clamp-2 max-w-3xl text-[14px] leading-relaxed text-white/75 sm:line-clamp-3">{c.summary}</p>
              )}
            </div>
            {!compact && (
              <div className="w-full shrink-0 sm:w-64">
                <div className="mb-1 flex items-center justify-between text-[11.5px] text-white/70">
                  <span className="uppercase tracking-wider">Steps done</span>
                  <span className="tabular-nums text-white">{Math.round(c.progress)}%</span>
                </div>
                <Progress value={c.progress} className="h-2 bg-white/10 [&_[data-slot=progress-indicator]]:bg-[#7cc5c4]" />
                <div className="mt-3 rounded-lg bg-white/8 p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7cc5c4]" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7cc5c4]">Next step</div>
                      <div className="mt-0.5 text-[12.5px] leading-relaxed text-white/85">
                        {c.nextBestAction ?? "All saved steps are done."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trust gates: shown until discovery is unlocked (or while frozen) */}
        {!ws.gate.discoveryUnlocked && (
          <div className="mt-5">
            <GatePanel ws={ws} reload={fetchCase} />
          </div>
        )}

        {/* Desktop area tabs */}
        <nav aria-label="Case areas" className="mt-5 hidden flex-wrap gap-1.5 md:flex">
          {[...main, "help" as const].map((area) => {
            const m = AREA_META[area];
            const active = current === area;
            return (
              <Link
                key={area}
                href={caseHref(caseId, area)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors",
                  active ? "border-navy bg-navy text-white" : "border-border bg-card text-ink/75 hover:border-teal-brand/40 hover:bg-teal-soft",
                  area === "help" && "ml-auto"
                )}
              >
                <m.icon className="h-3.5 w-3.5" /> {m.label}
                {counts[area] && (
                  <span className={cn("rounded-full px-1.5 text-[10.5px] tabular-nums", active ? "bg-white/20" : "bg-secondary")}>{counts[area]}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Mobile: help stays one tap away (FL-17) */}
        {compact && (
          <div className="mt-3 flex justify-end md:hidden">
            <Link href={caseHref(caseId, "help")} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-teal-brand hover:bg-teal-soft">
              <LifeBuoy className="h-3.5 w-3.5" /> Get help
            </Link>
          </div>
        )}

        <div className="mt-4 min-w-0">{children}</div>
      </div>

      {/* Mobile bottom navigation — the four main areas (DESIGN §2.3) */}
      <nav
        aria-label="Case areas"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-4">
          {main.map((area) => {
            const m = AREA_META[area];
            const active = current === area;
            return (
              <li key={area}>
                <Link
                  href={caseHref(caseId, area)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11.5px] font-medium",
                    active ? "text-navy" : "text-ink/65 hover:text-navy"
                  )}
                >
                  <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-teal-soft text-teal-brand")}>
                    <m.icon className="h-4.5 w-4.5" />
                  </span>
                  {m.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Floating assistant on desktop; on mobile it lives in Conversation so it never covers content */}
      {current !== "conversation" && (
        <div className="fixed bottom-5 right-5 z-40 hidden md:block">
          {askOpen && <AskPanel caseId={caseId} onClose={() => setAskOpen(false)} />}
          <Button
            onClick={() => setAskOpen((v) => !v)}
            className="h-12 rounded-full bg-navy px-5 text-[13.5px] font-semibold text-white shadow-lg hover:bg-navy-deep"
          >
            {askOpen ? "Close assistant" : <><Bot className="mr-2 h-4.5 w-4.5 text-[#7cc5c4]" /> Ask about this case</>}
          </Button>
        </div>
      )}
    </CaseContext.Provider>
  );
}
