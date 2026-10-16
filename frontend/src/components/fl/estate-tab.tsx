"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { CaseWorkspace } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DemoBadge, CATEGORY_LABEL, CATEGORY_ICON } from "./ui-bits";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import {
  CircleAlert,
  FileSignature,
  Loader2,
  Lock,
  Scale,
  UserRound,
  Users,
} from "lucide-react";

export default function EstateTab({ ws }: { ws: CaseWorkspace }) {
  const [beneficiaries, setBeneficiaries] = useState("Spouse: 50% · Child 1: 25% · Child 2: 25%");
  const [executor, setExecutor] = useState("");
  const [context, setContext] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const c = ws.case;
  const isEstateJourney = c.caseType === "estate_planning";
  const inventory = ws.assets.filter((a) => a.discoveryStatus !== "dismissed");

  async function generateWill() {
    setBusy(true);
    try {
      const res = await api.post<{ draft: string; label: string }>("/api/ai/draft", {
        caseId: c.id,
        kind: "will",
        context: `Beneficiary decisions: ${beneficiaries}. Executor: ${executor || "not chosen yet"}. ${context}`,
      });
      setDraft(res.draft);
      toast({ title: "Draft will generated", description: "A template for review — not legal advice. Have complex estates checked by a lawyer." });
    } catch (e) {
      toast({ title: "Generation unavailable", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        {!isEstateJourney && (
          <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold-soft/60 px-4 py-3 text-[12.5px] leading-relaxed text-ink/80">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            This case isn&apos;t classified as an estate-planning journey — the tools below still work and can feed a
            new estate case when you&apos;re ready.
          </div>
        )}

        {/* Inventory snapshot */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-navy">
              <Scale className="h-4 w-4 text-teal-brand" /> Estate inventory ({inventory.length})
            </div>
            {inventory.length ? (
              <div className="space-y-2">
                {inventory.map((a) => {
                  const Icon = CATEGORY_ICON[a.category] ?? CATEGORY_ICON.other;
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-navy" />
                        <div>
                          <div className="text-[13px] font-medium text-navy">{a.institution}</div>
                          <div className="text-[11px] text-muted-foreground">{CATEGORY_LABEL[a.category] ?? a.category}{a.maskedRef ? ` · ${a.maskedRef}` : ""}</div>
                        </div>
                      </div>
                      <span className={`text-[11px] ${a.verificationStatus === "user_confirmed" ? "text-teal-brand" : "text-gold"}`}>
                        {a.verificationStatus === "user_confirmed" ? "confirmed" : "to verify"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12.5px] text-muted-foreground">Add assets in the Asset Inventory to populate the estate plan.</p>
            )}
          </CardContent>
        </Card>

        {/* Beneficiaries + executor */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Beneficiary decisions
              </div>
              <Textarea value={beneficiaries} onChange={(e) => setBeneficiaries(e.target.value)} className="min-h-[64px] text-[13px]" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" /> Executor (and backup)
              </div>
              <Input value={executor} onChange={(e) => setExecutor(e.target.value)} placeholder="Full name of your chosen executor" className="text-[13px]" />
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Special instructions</div>
              <Textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Guardianship for minors, specific gifts, charitable bequests…" className="min-h-[60px] text-[13px]" />
            </div>
            <Button onClick={generateWill} disabled={busy} className="w-full bg-navy text-white hover:bg-navy-deep">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
              Generate draft will from this plan
            </Button>
            <div className="flex items-start gap-2 rounded-lg bg-teal-soft/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink/70">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-brand" />
              The output is a structured draft for review — not a legally executed will. Execution (signing with two
              witnesses) and legal review remain yours; complex estates are flagged for professional help.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Draft output */}
      <Card className="self-start">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[13px] font-semibold text-navy">Draft will — for review only</div>
            {c.isDemo && <DemoBadge />}
          </div>
          {draft ? (
            <div className="nice-scroll max-h-[640px] overflow-y-auto rounded-lg border bg-background p-4 text-[13px] leading-relaxed">
              <ReactMarkdown
                components={{
                  h1: (p) => <h1 className="font-display mb-3 text-[17px] font-bold text-navy" {...p} />,
                  h2: (p) => <h2 className="font-display mb-2 mt-4 text-[15px] font-semibold text-navy" {...p} />,
                  p: (p) => <p className="mb-2.5 text-ink/85" {...p} />,
                  li: (p) => <li className="mb-1 ml-4 list-disc text-ink/85" {...p} />,
                  strong: (p) => <strong className="font-semibold text-navy" {...p} />,
                }}
              >
                {draft}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <FileSignature className="h-7 w-7 text-muted-foreground/40" />
              <p className="max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
                Fill in beneficiaries and an executor, then generate the draft. It uses only your verified inventory —
                placeholders mark anything missing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
