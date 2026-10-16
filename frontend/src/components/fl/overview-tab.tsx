"use client";

import type { CaseWorkspace } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CircleCheckBig,
  CircleHelp,
  Sparkles,
  History,
  Bot,
  User,
  Cog,
  FileScan,
  PieChart,
  Route,
  Globe,
} from "lucide-react";

const EVENT_ICON: Record<string, React.ElementType> = {
  created: Sparkles,
  document: FileScan,
  asset: PieChart,
  task: Route,
  ai: Bot,
  consent: CircleCheckBig,
  evidence: CircleCheckBig,
  status: Route,
  user: User,
  system: Cog,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function OverviewTab({
  ws,
  onGoto,
  onResources,
}: {
  ws: CaseWorkspace;
  onGoto: (tab: string) => void;
  onResources: () => void;
}) {
  const c = ws.case;
  const activeAssets = ws.assets.filter((a) => a.discoveryStatus !== "dismissed");
  const confirmed = activeAssets.filter((a) => a.verificationStatus === "user_confirmed").length;
  const clues = activeAssets.length - confirmed;
  const done = ws.tasks.filter((t) => t.status === "completed").length;
  const waiting = ws.tasks.filter((t) => t.status === "waiting_institution").length;

  const nextTask = ws.tasks.find((t) => t.isNextBest) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-4">
        {/* Next best action card */}
        {nextTask && (
          <Card className="border-teal-brand/25 bg-teal-soft/40">
            <CardContent className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-brand">
                  <Sparkles className="h-3.5 w-3.5" /> Next best action — why now
                </div>
                <Button size="sm" variant="outline" className="h-7 border-teal-brand/30 text-teal-brand hover:bg-teal-soft" onClick={() => onGoto("journey")}>
                  Open tracker
                </Button>
              </div>
              <div className="font-display text-[17px] font-semibold text-navy">{nextTask.title}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink/75">{nextTask.rationale}</p>
              {nextTask.officialUrl && (
                <div className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  Official destination: <span className="font-medium text-navy">{nextTask.officialName}</span>
                  <a href={nextTask.officialUrl} target="_blank" rel="noopener noreferrer" className="text-teal-brand underline underline-offset-2">
                    open portal ↗
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Assets tracked", value: activeAssets.length, sub: `${confirmed} confirmed · ${clues} clues`, tab: "assets" },
            { label: "Documents", value: ws.documents.length, sub: `${ws.documents.filter((d) => d.extractionStatus === "extracted").length} extracted`, tab: "documents" },
            { label: "Journey tasks", value: `${done}/${ws.tasks.length}`, sub: waiting ? `${waiting} waiting on institutions` : "on schedule", tab: "journey" },
            { label: "Jurisdiction", value: c.jurisdiction, sub: c.relationship ? `You: ${c.relationship}` : "relationship on file", tab: null },
          ].map((s) => (
            <Card key={s.label} className={s.tab ? "cursor-pointer transition-shadow hover:shadow-md" : ""} onClick={s.tab ? () => onGoto(s.tab!) : undefined}>
              <CardContent className="p-4">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className="font-display mt-1 text-[22px] font-semibold leading-none text-navy">{s.value}</div>
                <div className="mt-1 text-[11.5px] text-muted-foreground">{s.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Facts vs assumptions */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-teal-brand">
                <CircleCheckBig className="h-4 w-4" /> Confirmed facts
              </div>
              <ul className="space-y-2">
                {c.confirmedFacts.length ? c.confirmedFacts.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink/85">
                    <CircleCheckBig className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-brand" /> {f}
                  </li>
                )) : <li className="text-[13px] text-muted-foreground">No confirmed facts recorded yet.</li>}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-gold">
                <CircleHelp className="h-4 w-4" /> Assumptions to verify
              </div>
              <ul className="space-y-2">
                {c.assumptions.length ? c.assumptions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink/70">
                    <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" /> {a}
                  </li>
                )) : <li className="text-[13px] text-muted-foreground">No open assumptions — good.</li>}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Timeline */}
      <Card className="self-start">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-navy">
            <History className="h-4 w-4 text-teal-brand" /> Case timeline
          </div>
          <div className="nice-scroll max-h-[520px] overflow-y-auto pr-3">
            <div className="relative space-y-0 pl-4">
              <div className="absolute bottom-2 left-[5px] top-2 w-px bg-border" />
              {ws.events.map((e) => {
                const Icon = EVENT_ICON[e.eventType] ?? Bot;
                return (
                  <div key={e.id} className="relative pb-5">
                    <div className="absolute -left-4 top-0.5 flex h-[11px] w-[11px] items-center justify-center rounded-full border-2 border-teal-brand bg-card" />
                    <div className="flex items-start gap-2">
                      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${e.actor === "user" ? "text-navy" : e.actor === "system" ? "text-muted-foreground" : "text-teal-brand"}`} />
                      <div className="min-w-0">
                        <div className="text-[12.5px] leading-relaxed text-ink/85">{e.description}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                          <Badge variant="outline" className="rounded px-1 py-0 text-[9.5px] uppercase tracking-wide">{e.actor}</Badge>
                          {timeAgo(e.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!ws.events.length && <div className="text-[13px] text-muted-foreground">No events yet.</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
