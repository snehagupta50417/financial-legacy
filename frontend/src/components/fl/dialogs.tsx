"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Play, ScrollText, ShieldX, FileSignature } from "lucide-react";

const SCENARIOS = [
  {
    key: "demo-a",
    icon: ScrollText,
    title: "A family in Delhi after a father's death",
    desc: "An old Punjab National Bank statement, an LIC premium receipt and a 2019 mutual fund statement. See the four accounts appear with their evidence, the PNB account flagged for an RBI UDGAM search, and fund values worked out from real NAVs.",
    tag: "Family after a death",
  },
  {
    key: "demo-b",
    icon: ShieldX,
    title: "An LIC claim held up in Lucknow",
    desc: "LIC wrote asking for five documents before settling a death claim. See what each one is, the IRDAI 15-day rule and late-payment interest, a covering letter to review, and the complaint path if it isn't resolved.",
    tag: "Delayed claim",
  },
  {
    key: "demo-c",
    icon: FileSignature,
    title: "Organising your own records in Pune",
    desc: "A joint HDFC account and FD, shares, a fund folio inherited from your father without a nominee, and his unregistered will. See the record come together, the nominee gaps flagged, and what needs a lawyer.",
    tag: "Planning ahead",
  },
];

export function DemoDialog({
  open,
  onOpenChange,
  onLoaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLoaded: (caseId: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function load(scenario: string) {
    setBusy(scenario);
    try {
      const res = await api.post<{ caseId: string }>("/api/demo", { scenario });
      onOpenChange(false);
      onLoaded(res.caseId);
      toast({ title: "Demo case loaded", description: "Everything in it is synthetic and labelled DEMO — safe to explore end-to-end." });
    } catch (e) {
      toast({ title: "Could not load demo", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-navy">Explore with demo data</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            Three example cases. The banks, branches, funds and NAVs are real public data; the people and account numbers are made up, and every document is marked as a sample. Your progress is saved in this browser.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {SCENARIOS.map((s) => (
            <div key={s.key} className="flex items-start gap-4 rounded-xl border p-4 transition-colors hover:border-teal-brand/40">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal-brand">
                <s.icon className="h-5.5 w-5.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold text-navy">{s.title}</span>
                  <Badge variant="outline" className="rounded-full border-gold/40 bg-gold-soft text-[10px] text-gold">{s.tag}</Badge>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
              <Button
                size="sm"
                disabled={busy !== null}
                onClick={() => load(s.key)}
                className="h-9 shrink-0 bg-teal-brand text-[12.5px] text-white hover:bg-[#0c6a69]"
              >
                {busy === s.key ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
                Load
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CasesList({ onOpen, tall = false }: { onOpen: (caseId: string) => void; tall?: boolean }) {
  const [cases, setCases] = useState<
    { id: string; scenarioLabel: string | null; assetHolderName: string | null; progress: number; isDemo: boolean; updatedAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get<{ cases: typeof cases }>("/api/cases")
      .then((d) => {
        if (!alive) return;
        setCases(d.cases);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-teal-brand" />
      </div>
    );
  if (failed)
    return <p className="py-6 text-center text-[13px] text-destructive">Could not load your cases — please retry.</p>;
  if (cases.length === 0)
    return (
      <p className="py-6 text-center text-[13px] text-muted-foreground">
        No cases yet — start a journey or load a demo scenario.
      </p>
    );
  return (
    <div className={tall ? "space-y-2" : "nice-scroll max-h-[320px] space-y-2 overflow-y-auto"}>
      {cases.map((c) => (
        <button
          key={c.id}
          onClick={() => onOpen(c.id)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:border-teal-brand/40 hover:bg-teal-soft/40"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13.5px] font-semibold text-navy">{c.assetHolderName ?? "Legacy case"}</span>
              {c.isDemo && <Badge className="rounded bg-gold-soft px-1.5 text-[9.5px] font-bold text-gold">DEMO</Badge>}
            </div>
            <div className="truncate text-[11.5px] text-muted-foreground">{c.scenarioLabel}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[13px] font-semibold tabular-nums text-teal-brand">{Math.round(c.progress)}%</div>
            <div className="text-[10.5px] text-muted-foreground">{new Date(c.updatedAt).toLocaleDateString()}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

export function CasesDialog({
  open,
  onOpenChange,
  onOpen,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpen: (caseId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-navy">My legacy cases</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Stored privately under your session — progress persists across refreshes.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <CasesList
            onOpen={(id) => {
              onOpenChange(false);
              onOpen(id);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
