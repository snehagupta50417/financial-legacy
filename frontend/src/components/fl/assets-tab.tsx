"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import type { CaseWorkspace } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfidenceMeter, EvidenceBox, CATEGORY_ICON, CATEGORY_LABEL, VerificationBadge } from "./ui-bits";
import { toast } from "@/hooks/use-toast";
import { CircleCheckBig, CircleX, RotateCcw, Plus, BookCheck } from "lucide-react";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "bank_deposit", label: "Bank deposits" },
  { key: "insurance", label: "Insurance" },
  { key: "mutual_fund", label: "Mutual funds" },
  { key: "shares", label: "Shares" },
  { key: "unknown", label: "Unknown" },
];

export default function AssetsTab({ ws, reload }: { ws: CaseWorkspace; reload: () => Promise<void> }) {
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newInstitution, setNewInstitution] = useState("");
  const [newCategory, setNewCategory] = useState("bank_deposit");
  const [newRef, setNewRef] = useState("");

  const shown = useMemo(() => {
    const active = ws.assets.filter((a) => a.discoveryStatus !== "dismissed");
    if (filter === "all") return active;
    if (filter === "unknown") return active.filter((a) => a.category === "unknown" || a.category === "other");
    return active.filter((a) => a.category === filter);
  }, [ws.assets, filter]);

  const dismissed = ws.assets.filter((a) => a.discoveryStatus === "dismissed");

  async function act(id: string, action: "confirm" | "dismiss" | "reopen") {
    setBusyId(id);
    try {
      await api.patch(`/api/assets/${id}`, { action });
      toast({
        title: action === "confirm" ? "Asset confirmed" : action === "dismiss" ? "Clue dismissed" : "Clue re-opened",
        description:
          action === "confirm"
            ? "Recorded as user-confirmed and reflected in the journey plan."
            : action === "dismiss"
              ? "Removed from the active inventory. You can re-open it from the dismissed list."
              : "Back in the active inventory as an unverified clue.",
      });
      await reload();
    } catch (e) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function addManual() {
    if (!newInstitution.trim()) return;
    try {
      await api.post("/api/assets", { caseId: ws.case.id, institution: newInstitution, category: newCategory, maskedRef: newRef });
      setAdding(false);
      setNewInstitution("");
      setNewRef("");
      toast({ title: "Asset added", description: "Manually added and marked user-confirmed." });
      await reload();
    } catch (e) {
      toast({ title: "Could not add asset", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                filter === f.key ? "border-navy bg-navy text-white" : "border-border bg-card text-ink/70 hover:bg-teal-soft"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)} className="border-teal-brand/30 text-teal-brand hover:bg-teal-soft">
          <Plus className="mr-1 h-3.5 w-3.5" /> Add asset manually
        </Button>
      </div>

      {adding && (
        <Card className="border-teal-brand/25">
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <div className="min-w-[180px] flex-1">
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">Institution</div>
              <Input value={newInstitution} onChange={(e) => setNewInstitution(e.target.value)} placeholder="e.g., HDFC Bank" />
            </div>
            <div className="w-[150px]">
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">Category</div>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["bank_deposit", "bank_account", "insurance", "mutual_fund", "shares", "provident_fund", "other"].map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[150px]">
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">Masked reference</div>
              <Input value={newRef} onChange={(e) => setNewRef(e.target.value)} placeholder="A/c **1234" />
            </div>
            <Button onClick={addManual} disabled={!newInstitution.trim()} className="bg-navy text-white hover:bg-navy-deep">Save</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((a) => {
          const Icon = CATEGORY_ICON[a.category] ?? CATEGORY_ICON.unknown;
          const srcDoc = ws.documents.find((d) => d.id === a.sourceDocumentId);
          return (
            <Card key={a.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[14.5px] font-semibold leading-snug text-navy">{a.institution}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                        <span>{CATEGORY_LABEL[a.category] ?? a.category}</span>
                        {a.maskedRef && <><span>·</span><span className="font-mono text-[11.5px]">{a.maskedRef}</span></>}
                        {a.holderName && <><span>·</span><span>{a.holderName}</span></>}
                      </div>
                    </div>
                  </div>
                  <VerificationBadge asset={a} />
                </div>

                {a.evidence && <EvidenceBox label="Evidence (why the AI thinks this exists)">{a.evidence}</EvidenceBox>}
                {srcDoc && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                    <BookCheck className="h-3 w-3" /> Source: {srcDoc.fileName}
                    {srcDoc.isSynthetic && <Badge className="rounded bg-gold-soft px-1 text-[9px] text-gold">DEMO</Badge>}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    AI confidence <ConfidenceMeter value={a.confidence} />
                  </div>
                  <div className="flex gap-1.5">
                    {a.discoveryStatus !== "confirmed" && (
                      <Button size="sm" disabled={busyId === a.id} onClick={() => act(a.id, "confirm")} className="h-8 bg-teal-brand text-[12px] text-white hover:bg-[#0c6a69]">
                        <CircleCheckBig className="mr-1 h-3.5 w-3.5" /> Confirm
                      </Button>
                    )}
                    {a.discoveryStatus !== "dismissed" ? (
                      <Button size="sm" variant="outline" disabled={busyId === a.id} onClick={() => act(a.id, "dismiss")} className="h-8 border-border text-[12px] text-muted-foreground hover:text-destructive">
                        <CircleX className="mr-1 h-3.5 w-3.5" /> Dismiss
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={busyId === a.id} onClick={() => act(a.id, "reopen")} className="h-8 text-[12px]">
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Re-open
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!shown.length && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <BookCheck className="h-7 w-7 text-muted-foreground/40" />
            <div className="text-[14px] font-medium text-navy">No assets in this view yet</div>
            <p className="max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
              Upload statements in the Document Centre — the AI extracts institution references as evidence-linked clues for you to confirm.
            </p>
          </CardContent>
        </Card>
      )}

      {dismissed.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Dismissed clues ({dismissed.length})</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {dismissed.map((d) => (
              <Badge key={d.id} variant="outline" className="rounded-full text-[11.5px] text-muted-foreground">
                {d.institution}
                <button onClick={() => act(d.id, "reopen")} className="ml-1.5 text-teal-brand hover:underline">re-open</button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
