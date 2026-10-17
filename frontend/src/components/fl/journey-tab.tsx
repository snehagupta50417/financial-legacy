"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { CaseWorkspace } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TaskStatusBadge, CATEGORY_LABEL } from "./ui-bits";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  Info,
  ListChecks,
  Loader2,
  Sparkles,
  UserCheck,
} from "lucide-react";

export default function JourneyTab({ ws, reload }: { ws: CaseWorkspace; reload: () => Promise<void> }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [evidenceFor, setEvidenceFor] = useState<string | null>(null);
  const [evidenceText, setEvidenceText] = useState("");

  const done = ws.tasks.filter((t) => t.status === "completed");
  const open = ws.tasks.filter((t) => t.status !== "completed");

  async function setStatus(taskId: string, status: string) {
    setBusyId(taskId);
    try {
      await api.patch(`/api/tasks/${taskId}`, { status });
      const label = status === "completed" ? "Task completed — journey recalculated" : `Task marked ${status.replace(/_/g, " ")}`;
      toast({ title: label, description: "Progress, next best action and timeline updated." });
      await reload();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function completeWithEvidence() {
    if (!evidenceFor) return;
    setBusyId(evidenceFor);
    try {
      await api.patch(`/api/tasks/${evidenceFor}`, {
        status: "completed",
        completionEvidence: evidenceText.trim() || "User-confirmed completion with acknowledgement",
      });
      toast({ title: "Completed with evidence", description: "External action logged in the case timeline." });
      setEvidenceFor(null);
      setEvidenceText("");
      await reload();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  const depTitles = new Map(ws.tasks.map((t) => [t.id, t.title]));

  function TaskCard({ t, dimmed = false }: { t: CaseWorkspace["tasks"][number]; dimmed?: boolean }) {
    const isDone = t.status === "completed";
    return (
      <Card className={cn("overflow-hidden", t.isNextBest && !isDone && "border-teal-brand/40 shadow-[0_0_0_1px_rgba(14,124,123,0.25)]", dimmed && "opacity-80")}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {isDone ? <CheckCircle2 className="h-5 w-5 text-teal-brand" /> : t.isNextBest ? <Sparkles className="h-5 w-5 text-teal-brand" /> : <Circle className="h-5 w-5 text-muted-foreground/40" />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-[14.5px] font-semibold leading-snug", isDone ? "text-muted-foreground line-through decoration-teal-brand/40" : "text-navy")}>
                    {t.title}
                  </span>
                  {t.isNextBest && !isDone && (
                    <Badge className="rounded-full bg-teal-soft px-2 text-[10px] font-semibold text-teal-brand">NEXT BEST ACTION</Badge>
                  )}
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink/75">{t.instructions}</p>

                <div className="mt-2.5 rounded-lg bg-gold-soft/60 px-3 py-2 text-[12px] leading-relaxed text-ink/75">
                  <span className="font-semibold text-gold">Why this step: </span>
                  {t.rationale}
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  {t.institution && <Badge variant="outline" className="rounded-full text-[11px] text-navy">{t.institution}</Badge>}
                  {t.assetCategory && t.assetCategory !== "multi" && (
                    <Badge variant="outline" className="rounded-full text-[11px] text-navy">{CATEGORY_LABEL[t.assetCategory] ?? t.assetCategory}</Badge>
                  )}
                  <Badge variant="outline" className={cn("rounded-full text-[11px]", t.integrationType === "public_api" ? "border-teal-brand/40 text-teal-brand" : "text-muted-foreground")}>
                    {t.integrationType === "official_website" ? "Official website — you act, we prepare" : t.integrationType === "public_api" ? "Live API" : "Guided workflow"}
                  </Badge>
                  {t.dependencies.length > 0 && (
                    <span className="flex items-center gap-1">
                      <ArrowDown className="h-3 w-3" /> after: {t.dependencies.map((d) => depTitles.get(d)).filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>

                {(t.requiredDocs.length > 0 || t.missingInfo.length > 0) && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {t.requiredDocs.length > 0 && (
                      <div className="rounded-lg border bg-background px-3 py-2">
                        <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-teal-brand">
                          <ListChecks className="h-3 w-3" /> Required documents
                        </div>
                        <ul className="space-y-0.5">
                          {t.requiredDocs.map((r, i) => (
                            <li key={i} className="text-[12px] leading-relaxed text-ink/75">· {r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {t.missingInfo.length > 0 && (
                      <div className="rounded-lg border border-gold/30 bg-gold-soft/50 px-3 py-2">
                        <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-gold">
                          <Info className="h-3 w-3" /> Missing information
                        </div>
                        <ul className="space-y-0.5">
                          {t.missingInfo.map((r, i) => (
                            <li key={i} className="text-[12px] leading-relaxed text-ink/75">· {r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {isDone && t.completionEvidence && (
                  <div className="mt-2.5 rounded-md border border-teal-brand/20 bg-teal-soft/50 px-3 py-2 text-[12px] text-ink/75">
                    <UserCheck className="mr-1.5 inline h-3.5 w-3.5 text-teal-brand" />
                    Evidence: {t.completionEvidence}
                  </div>
                )}
              </div>
            </div>
            <TaskStatusBadge status={t.status} />
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
            {!isDone && t.status !== "in_progress" && (
              <Button size="sm" variant="outline" disabled={busyId === t.id} onClick={() => setStatus(t.id, "in_progress")} className="h-8 text-[12px]">
                Start
              </Button>
            )}
            {!isDone && (
              <Button
                size="sm"
                disabled={busyId === t.id}
                onClick={() => {
                  setEvidenceFor(t.id);
                  setEvidenceText("");
                }}
                className="h-8 bg-teal-brand text-[12px] text-white hover:bg-[#0c6a69]"
              >
                {busyId === t.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                Mark completed
              </Button>
            )}
            {!isDone && (
              <Button size="sm" variant="outline" disabled={busyId === t.id} onClick={() => setStatus(t.id, "waiting_institution")} className="h-8 text-[12px]">
                <Clock3 className="mr-1 h-3.5 w-3.5" /> Waiting for institution
              </Button>
            )}
            {t.officialUrl && (
              <>
                <a href={t.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                  <Button size="sm" variant="outline" className="h-8 border-navy/25 text-[12px] text-navy hover:bg-teal-soft">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open official portal ↗
                  </Button>
                </a>
                <span className="text-[11px] text-muted-foreground">{t.officialName}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {open.length > 0 && (
        <div className="space-y-3">
          {open.map((t) => (
            <div key={t.id}>
              <TaskCard t={t} />
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-brand" /> Completed ({done.length})
          </div>
          <div className="space-y-3 opacity-90">
            {done.map((t) => (
              <TaskCard key={t.id} t={t} dimmed />
            ))}
          </div>
        </div>
      )}

      {!ws.tasks.length && (
        <Card>
          <CardContent className="py-12 text-center text-[13px] text-muted-foreground">
            No journey tasks yet — describe your situation in the AI intake and the engine will build your plan.
          </CardContent>
        </Card>
      )}

      {/* Evidence dialog */}
      <Dialog open={!!evidenceFor} onOpenChange={(v) => !v && setEvidenceFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-navy">Log completion evidence</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            What happened when you completed this step outside Financial Legacy? Reference numbers, acknowledgement IDs or a
            short note — this becomes part of the auditable case timeline. Nothing is sent to any institution.
          </p>
          <Textarea
            value={evidenceText}
            onChange={(e) => setEvidenceText(e.target.value)}
            placeholder="e.g., Submitted claim form at PNB Connaught Place branch; acknowledgement no. PNB/CL/2026/1142"
            className="min-h-[90px] text-[13px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvidenceFor(null)}>Cancel</Button>
            <Button onClick={completeWithEvidence} disabled={busyId !== null} className="bg-teal-brand text-white hover:bg-[#0c6a69]">
              Save completion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
