"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { CaseWorkspace } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EVIDENCE_GROUPS } from "@/lib/journey";
import { CATEGORY_ICON, CATEGORY_LABEL, VerificationBadge, evidenceStatusOf } from "./ui-bits";
import { caseHref } from "./case-nav";
import { SimulatedNote } from "./gate-panel";
import { BookCheck, CircleCheckBig, CircleX, FileText, KeyRound, Loader2, Lock, Plus, RotateCcw } from "lucide-react";

const ENTITLEMENT_METHODS = [
  { value: "nominee", label: "I am the registered nominee" },
  { value: "joint_holder", label: "I am a joint holder" },
  { value: "legal_heir_certificate", label: "I hold a legal-heir certificate" },
  { value: "succession_certificate", label: "I hold a succession certificate" },
];

const GROUP_META: Record<(typeof EVIDENCE_GROUPS)[number], { title: string; sub: string }> = {
  institution_verified: { title: "Confirmed by the institution", sub: "The bank, fund house or insurer confirmed these." },
  document_backed: { title: "Backed by a document", sub: "A document you checked supports these." },
  self_declared: { title: "You told us about these", sub: "No document yet — adding one makes them stronger." },
  potential_match: { title: "Possible matches — please check", sub: "Suggested by a document or a search. Not treated as real until you confirm." },
};

type Asset = CaseWorkspace["assets"][number];

/** Records → Assets: holdings grouped by evidence status, potential matches kept apart (DESIGN §6, FL-07, FL-09). */
export default function AssetsTab({ ws, reload }: { ws: CaseWorkspace; reload: () => Promise<void> }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newInstitution, setNewInstitution] = useState("");
  const [newCategory, setNewCategory] = useState("bank_deposit");
  const [newRef, setNewRef] = useState("");
  const [entitleFor, setEntitleFor] = useState<Asset | null>(null);
  const [entitleMethod, setEntitleMethod] = useState("nominee");
  const [entitling, setEntitling] = useState(false);

  const active = ws.assets.filter((a) => a.discoveryStatus !== "dismissed");
  const dismissed = ws.assets.filter((a) => a.discoveryStatus === "dismissed");
  const deceased = ws.case.holderLiving === false;

  async function act(id: string, action: "confirm" | "dismiss" | "reopen") {
    setBusyId(id);
    try {
      await api.patch(`/api/assets/${id}`, { action });
      toast({
        title: action === "confirm" ? "Confirmed" : action === "dismiss" ? "Set aside" : "Back in the list",
        description:
          action === "confirm" ? "Saved as confirmed by you." : action === "dismiss" ? "You can bring it back from the list at the bottom." : "It's a possible match again.",
      });
      await reload();
    } catch (e) {
      toast({ title: "Not saved", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
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
      toast({ title: "Holding added", description: "Saved as self-declared. Add a document to back it up." });
      await reload();
    } catch (e) {
      toast({ title: "Not saved", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    }
  }

  async function proveEntitlement() {
    if (!entitleFor) return;
    setEntitling(true);
    try {
      await api.post(`/api/assets/${entitleFor.id}/entitlement`, { method: entitleMethod });
      toast({ title: "Entitlement recorded", description: "Full details for this holding are now shown to you." });
      setEntitleFor(null);
      await reload();
    } catch (e) {
      toast({ title: "Not confirmed", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setEntitling(false);
    }
  }

  function HoldingCard({ a }: { a: Asset }) {
    const Icon = CATEGORY_ICON[a.category] ?? CATEGORY_ICON.unknown;
    const srcDoc = ws.documents.find((d) => d.id === a.sourceDocumentId);
    const potential = evidenceStatusOf(a) === "potential_match";
    return (
      <li className={cn("min-w-0 rounded-2xl border bg-card p-5 shadow-sm", potential && "border-gold/40")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-white" aria-hidden>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="break-words text-[17px] font-semibold leading-snug text-navy">{a.institution}</h3>
              <div className="mt-0.5 text-[15px] text-ink/75">{CATEGORY_LABEL[a.category] ?? a.category}</div>
            </div>
          </div>
          <VerificationBadge asset={a} />
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-[15px] sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-[13px] text-muted-foreground">Reference</dt>
            <dd className="break-all font-mono text-[15px] text-ink">{a.maskedRef ?? "Not known yet"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[13px] text-muted-foreground">Amount</dt>
            <dd className="text-ink">{a.valueBand ?? "No reviewed value"}</dd>
          </div>
          {a.holderName && (
            <div className="min-w-0">
              <dt className="text-[13px] text-muted-foreground">Held by</dt>
              <dd className="text-ink">{a.holderName}</dd>
            </div>
          )}
          {srcDoc && (
            <div className="min-w-0">
              <dt className="text-[13px] text-muted-foreground">Where we saw it</dt>
              <dd className="min-w-0">
                <Link href={`${caseHref(ws.case.id, "records")}/documents/${srcDoc.id}`} className="inline-flex max-w-full items-center gap-1 text-teal-brand underline underline-offset-2">
                  <FileText className="h-4 w-4 shrink-0" /> <span className="truncate">{srcDoc.fileName}</span>
                </Link>
              </dd>
            </div>
          )}
        </dl>

        {a.evidence && (
          <p className="mt-3 rounded-xl bg-background px-3.5 py-2.5 text-[15px] leading-relaxed text-ink/85">
            <span className="font-medium text-ink">Why we think this exists: </span>
            {a.evidence}
          </p>
        )}
        {a.masked && (
          <p className="mt-3 flex items-start gap-2 text-[14px] leading-relaxed text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" /> Exact amounts and full numbers stay hidden until you show you may claim this holding.
          </p>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-4">
          {potential && (
            <Button disabled={busyId === a.id} onClick={() => act(a.id, "confirm")} className="h-11 bg-teal-brand px-4 text-[15px] text-white hover:bg-[#0c6a69]">
              <CircleCheckBig className="mr-1.5 h-4 w-4" /> Yes, this is {deceased ? "theirs" : "mine"}
            </Button>
          )}
          {a.masked && (
            <Button variant="outline" disabled={busyId === a.id} onClick={() => setEntitleFor(a)} className="h-11 px-4 text-[15px] text-navy">
              <KeyRound className="mr-1.5 h-4 w-4" /> Show I may claim it
            </Button>
          )}
          <Button variant="ghost" disabled={busyId === a.id} onClick={() => act(a.id, "dismiss")} className="h-11 px-3 text-[15px] text-muted-foreground hover:text-destructive">
            <CircleX className="mr-1.5 h-4 w-4" /> {potential ? "Not a match" : "Set aside"}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h1 className="font-display text-[26px] font-semibold text-navy">Holdings</h1>
          <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
            Everything found so far, grouped by how we know it. This is what the sources checked show — not a complete list of
            everything that exists.
          </p>
        </div>
        <Button variant="outline" onClick={() => setAdding((v) => !v)} className="h-11 border-teal-brand/40 px-4 text-[15px] text-[#0b6b6a] hover:bg-teal-soft">
          <Plus className="mr-1.5 h-4 w-4" /> Add one you know about
        </Button>
      </div>

      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addManual();
          }}
          className="grid grid-cols-1 gap-3 rounded-2xl border border-teal-brand/30 bg-card p-5 lg:grid-cols-[minmax(0,1fr)_200px_200px_auto] lg:items-end"
        >
          <label className="block min-w-0">
            <span className="mb-1 block text-[14px] font-medium text-ink/80">Bank, fund house or insurer</span>
            <Input value={newInstitution} onChange={(e) => setNewInstitution(e.target.value)} placeholder="e.g. HDFC Bank" className="h-11 text-[16px]" />
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[14px] font-medium text-ink/80">Type</span>
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger className="h-11 w-full text-[16px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["bank_deposit", "bank_account", "insurance", "mutual_fund", "shares", "provident_fund", "other"].map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-[14px] font-medium text-ink/80">Last 4 digits (optional)</span>
            <Input value={newRef} onChange={(e) => setNewRef(e.target.value)} placeholder="**1234" className="h-11 text-[16px]" />
          </label>
          <Button type="submit" disabled={!newInstitution.trim()} className="h-11 bg-navy px-5 text-[15px] text-white hover:bg-navy-deep">Save</Button>
        </form>
      )}

      {EVIDENCE_GROUPS.map((g) => {
        const items = active.filter((a) => evidenceStatusOf(a) === g);
        if (!items.length) return null;
        const m = GROUP_META[g];
        return (
          <section key={g} aria-labelledby={`group-${g}`}>
            <h2 id={`group-${g}`} className="text-[19px] font-semibold text-navy">
              {m.title} <span className="font-normal text-muted-foreground">({items.length})</span>
            </h2>
            <p className="mt-0.5 text-[15px] text-muted-foreground">{m.sub}</p>
            <ul className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-2">
              {items.map((a) => (
                <HoldingCard key={a.id} a={a} />
              ))}
            </ul>
          </section>
        );
      })}

      {!active.length && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card px-6 py-12 text-center">
          <BookCheck className="h-8 w-8 text-muted-foreground/50" />
          <div className="text-[17px] font-semibold text-navy">No holdings yet</div>
          <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Upload a statement or policy and we&apos;ll show what it mentions for you to check — or add one you already know about.
          </p>
          <Button asChild className="mt-2 h-11 bg-teal-brand px-5 text-[15px] text-white hover:bg-[#0c6a69]">
            <Link href={`${caseHref(ws.case.id, "records")}/documents`}>Upload a document</Link>
          </Button>
        </div>
      )}

      {dismissed.length > 0 && (
        <section aria-labelledby="set-aside" className="rounded-2xl border bg-card p-5">
          <h2 id="set-aside" className="text-[16px] font-semibold text-ink/80">Set aside ({dismissed.length})</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {dismissed.map((d) => (
              <li key={d.id} className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[14px] text-ink/75">
                {d.institution}
                <button onClick={() => act(d.id, "reopen")} className="inline-flex min-h-8 items-center gap-1 font-medium text-teal-brand hover:underline">
                  <RotateCcw className="h-3.5 w-3.5" /> Bring back
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={!!entitleFor} onOpenChange={(v) => !v && setEntitleFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-[22px] text-navy">Show you may claim this holding</DialogTitle>
            <DialogDescription className="text-[15px] leading-relaxed">
              {entitleFor?.institution}: full details and the claim paperwork open per holding, once the institution&apos;s records show you are entitled to it.
            </DialogDescription>
          </DialogHeader>
          <label className="block">
            <span className="mb-1 block text-[14px] font-medium text-ink/80">How are you entitled?</span>
            <Select value={entitleMethod} onValueChange={setEntitleMethod}>
              <SelectTrigger className="h-11 w-full text-[16px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITLEMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <SimulatedNote>Simulated check of the institution&apos;s nomination / joint-holder record (demo only).</SimulatedNote>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntitleFor(null)} className="h-11">Cancel</Button>
            <Button onClick={proveEntitlement} disabled={entitling} className="h-11 bg-navy text-white hover:bg-navy-deep">
              {entitling && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Check and record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
