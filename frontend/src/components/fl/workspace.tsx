"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { CaseWorkspace } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DemoBadge, LeafLogo } from "./ui-bits";
import OverviewTab from "./overview-tab";
import AssetsTab from "./assets-tab";
import DocumentsTab from "./documents-tab";
import JourneyTab from "./journey-tab";
import EstateTab from "./estate-tab";
import ExpertTab from "./expert-tab";
import AskPanel from "./ask-panel";
import GatePanel, { LockedNotice } from "./gate-panel";
import {
  ArrowLeft,
  Bot,
  CircleAlert,
  LayoutDashboard,
  PieChart,
  FileScan,
  Route,
  FileSignature,
  Scale,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "assets", label: "Asset Inventory", icon: PieChart },
  { key: "documents", label: "Documents", icon: FileScan },
  { key: "journey", label: "Journey Tracker", icon: Route },
  { key: "estate", label: "Estate Planning", icon: FileSignature },
  { key: "expert", label: "Expert Escalation", icon: Scale },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Workspace({
  caseId,
  onHome,
  onResources,
}: {
  caseId: string;
  onHome: () => void;
  onResources: () => void;
}) {
  const [ws, setWs] = useState<CaseWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [askOpen, setAskOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .get<CaseWorkspace>(`/api/cases/${caseId}`)
      .then((data) => {
        if (!alive) return;
        setWs(data);
        setError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load case");
      });
    return () => {
      alive = false;
    };
  }, [caseId, tick]);

  const reload = useCallback(async () => {
    setTick((t) => t + 1);
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <CircleAlert className="h-8 w-8 text-destructive" />
        <div className="font-display text-xl font-semibold text-navy">Case unavailable</div>
        <p className="max-w-sm text-[13.5px] text-muted-foreground">{error}</p>
        <Button onClick={onHome} className="bg-navy text-white hover:bg-navy-deep">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to home
        </Button>
      </div>
    );
  }

  if (!ws) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="typing-dots text-xl text-teal-brand">
            <span />
            <span />
            <span />
          </div>
          <div className="text-[13px]">Loading your case workspace…</div>
        </div>
      </div>
    );
  }

  const c = ws.case;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      {/* Case header */}
      <div className="rounded-2xl border bg-navy p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onHome}
                className="h-7 -ml-2 px-2 text-[12px] text-white/60 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Home
              </Button>
              {c.isDemo && <DemoBadge />}
              <Badge variant="outline" className="rounded-full border-[#7cc5c4]/40 bg-[#7cc5c4]/10 text-[10.5px] text-[#7cc5c4]">
                {c.scenarioLabel ?? c.caseType}
              </Badge>
              {ws.gate.discoveryUnlocked && ws.gate.journeyKind !== "personal" && (
                <Badge variant="outline" className="rounded-full border-[#7cc5c4]/40 text-[10.5px] text-[#7cc5c4]">
                  <ShieldCheck className="mr-1 h-3 w-3" /> Verified heir · assets masked until entitlement
                </Badge>
              )}
              {c.holderLiving === false && (
                <Badge variant="outline" className="rounded-full border-white/20 text-[10.5px] text-white/70">
                  Holder deceased
                </Badge>
              )}
            </div>
            <h1 className="font-display truncate text-[22px] font-semibold leading-snug">
              {c.assetHolderName ? `${c.assetHolderName} — ` : ""}
              Legacy case
            </h1>
            <p className="mt-1.5 line-clamp-3 max-w-3xl text-[13px] leading-relaxed text-white/65">{c.summary}</p>
          </div>
          <div className="w-full shrink-0 sm:w-64">
            <div className="mb-1 flex items-center justify-between text-[11.5px] text-white/60">
              <span className="uppercase tracking-wider">Journey progress</span>
              <span className="tabular-nums text-white">{Math.round(c.progress)}%</span>
            </div>
            <Progress value={c.progress} className="h-2 bg-white/10 [&_[data-slot=progress-indicator]]:bg-[#7cc5c4]" />
            <div className="mt-3 rounded-lg bg-white/8 p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7cc5c4]" />
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#7cc5c4]">Next best action</div>
                  <div className="mt-0.5 text-[12.5px] leading-relaxed text-white/85">
                    {c.nextBestAction ?? "All actions completed — well done."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust gates: shown until discovery is unlocked (or while frozen) */}
      {!ws.gate.discoveryUnlocked && (
        <div className="mt-5">
          <GatePanel ws={ws} reload={reload} />
        </div>
      )}

      {/* Tabs */}
      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1 nice-scroll">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
              tab === t.key
                ? "border-navy bg-navy text-white"
                : "border-border bg-card text-ink/70 hover:border-teal-brand/40 hover:bg-teal-soft"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
            {t.key === "assets" && ws.assets.length > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 text-[10.5px] tabular-nums">{ws.assets.filter((a) => a.discoveryStatus !== "dismissed").length}</span>
            )}
            {t.key === "documents" && ws.documents.length > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 text-[10.5px] tabular-nums">{ws.documents.length}</span>
            )}
            {t.key === "journey" && ws.tasks.length > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 text-[10.5px] tabular-nums">
                {ws.tasks.filter((t2) => t2.status === "completed").length}/{ws.tasks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {tab === "overview" && <OverviewTab ws={ws} onGoto={(t2) => setTab(t2 as TabKey)} onResources={onResources} />}
        {tab === "assets" && (ws.gate.discoveryUnlocked ? <AssetsTab ws={ws} reload={reload} /> : <LockedNotice ws={ws} what="Assets" />)}
        {tab === "documents" && (ws.gate.discoveryUnlocked ? <DocumentsTab ws={ws} reload={reload} /> : <LockedNotice ws={ws} what="Documents" />)}
        {tab === "journey" && <JourneyTab ws={ws} reload={reload} />}
        {tab === "estate" && <EstateTab ws={ws} />}
        {tab === "expert" && <ExpertTab ws={ws} />}
      </div>

      {/* Floating ask-the-agent */}
      <div className="fixed bottom-5 right-5 z-40">
        {askOpen && <AskPanel caseId={caseId} onClose={() => setAskOpen(false)} />}
        <Button
          onClick={() => setAskOpen((v) => !v)}
          className="h-12 rounded-full bg-navy px-5 text-[13.5px] font-semibold text-white shadow-lg hover:bg-navy-deep"
        >
          {askOpen ? "Close assistant" : <><Bot className="mr-2 h-4.5 w-4.5 text-[#7cc5c4]" /> Ask about this case</>}
        </Button>
      </div>
    </div>
  );
}
