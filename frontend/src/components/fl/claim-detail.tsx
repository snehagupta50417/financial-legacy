"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, getSessionId } from "@/lib/client";
import type { ClaimView } from "@/server/domain/claim-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useCase } from "./case-context";
import { caseHref } from "./case-nav";
import { CATEGORY_LABEL } from "./ui-bits";
import { ArrowLeft, Check, CircleAlert, Download, ExternalLink, FileCheck2, Info, Loader2, LifeBuoy, ShieldCheck } from "lucide-react";

const WAITING: Record<string, string> = {
  family: "Waiting on you",
  institution: "Waiting on the institution",
  financial_legacy: "Our team will help",
};

const CHANNELS = [
  { value: "branch", label: "At a branch, in person" },
  { value: "post", label: "By post or courier" },
  { value: "institution_website", label: "On the institution's own website" },
  { value: "email", label: "By email to the institution" },
];

const NEXT_STEPS: Record<string, { to: string; label: string }[]> = {
  submitted: [
    { to: "institution_review", label: "They acknowledged it" },
    { to: "more_information_required", label: "They asked for more" },
    { to: "settled", label: "It was settled" },
    { to: "partially_settled", label: "Part was settled" },
    { to: "transferred", label: "Units or policy transferred" },
    { to: "rejected", label: "It was rejected" },
  ],
  submission_unknown: [{ to: "institution_review", label: "They confirmed they have it" }],
  institution_review: [
    { to: "more_information_required", label: "They asked for more" },
    { to: "settled", label: "It was settled" },
    { to: "partially_settled", label: "Part was settled" },
    { to: "transferred", label: "Units or policy transferred" },
    { to: "rejected", label: "It was rejected" },
    { to: "unresolved_dispute", label: "There's a dispute" },
  ],
  more_information_required: [
    { to: "document_collection", label: "Gather what they asked for" },
    { to: "institution_review", label: "I sent it — back with them" },
  ],
  partially_settled: [
    { to: "settled", label: "The rest was settled" },
    { to: "rejected", label: "The rest was rejected" },
    { to: "unresolved_dispute", label: "There's a dispute" },
  ],
  rejected: [
    { to: "document_collection", label: "Try again with more documents" },
    { to: "unresolved_dispute", label: "I want to dispute it" },
  ],
  unresolved_dispute: [{ to: "document_collection", label: "Try again with more documents" }],
};

const NEEDS_AMOUNT = new Set(["settled", "partially_settled"]);
const OUTCOME_STEPS = new Set(["settled", "partially_settled", "transferred", "rejected", "unresolved_dispute"]);

function day(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="flex items-center gap-2 text-[17px] font-semibold text-navy">
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px]", done ? "bg-teal-brand text-white" : "bg-secondary text-navy")}>
          {done ? <Check className="h-4 w-4" /> : n}
        </span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink/85">{children}</div>
    </section>
  );
}

/** One claim, start to outcome (DESIGN §7.2; PRD FL-12–FL-16, FL-36, FL-37). The family submits it themselves. */
export default function ClaimDetail({ claimId }: { claimId: string }) {
  const { ws, reload } = useCase();
  const [claim, setClaim] = useState<ClaimView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [channel, setChannel] = useState("branch");
  const [submitDate, setSubmitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receipt, setReceipt] = useState("");
  const [step, setStep] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [when, setWhen] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");

  const [loads, setLoads] = useState(0);
  const load = useCallback(() => setLoads((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    api
      .get<{ claim: ClaimView }>(`/api/claims/${claimId}`)
      .then((r) => alive && setClaim(r.claim))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Could not load this claim"));
    return () => {
      alive = false;
    };
  }, [claimId, loads]);

  async function run(fn: () => Promise<{ claim: ClaimView }>, done?: string) {
    setBusy(true);
    try {
      const r = await fn();
      setClaim(r.claim);
      if (done) toast({ title: done });
      await reload();
    } catch (e) {
      toast({ title: "Not saved", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
      load();
    } finally {
      setBusy(false);
    }
  }

  const patch = (body: unknown, done?: string) => run(() => api.patch(`/api/claims/${claimId}`, body), done);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/pack`, { headers: { "x-session-id": getSessionId() } });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "claim-pack.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "Couldn't download", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const claimsHref = caseHref(ws.case.id, "claims");
  if (error) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <CircleAlert className="mx-auto h-8 w-8 text-muted-foreground/60" />
        <p className="mt-2 text-[16px] text-navy">{error}</p>
        <Button asChild variant="outline" className="mt-3">
          <Link href={claimsHref}>Back to claims</Link>
        </Button>
      </div>
    );
  }
  if (!claim) {
    return (
      <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the claim…
      </p>
    );
  }

  const d = claim.decision;
  const pack = claim.pack;
  const submitted = !["draft", "authority_review", "document_collection", "pack_review", "ready_for_submission"].includes(claim.status);
  const isMf = claim.category === "mutual_fund";
  const docs = ws.documents.filter((x) => x.extractionStatus === "extracted");
  const nextSteps = NEXT_STEPS[claim.status] ?? [];

  return (
    <div className="max-w-[860px] space-y-5">
      <div>
        <Link href={claimsHref} className="-ml-1 inline-flex min-h-9 items-center rounded-md px-1 text-[14px] text-muted-foreground hover:text-navy">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> All claims
        </Link>
        <h1 className="font-display text-[26px] font-semibold text-navy">{claim.institution}</h1>
        <p className="text-[15px] text-muted-foreground">
          {CATEGORY_LABEL[claim.category] ?? claim.category}
          {claim.maskedRef ? ` · ${claim.maskedRef}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[14px]">
          <span className="rounded-full bg-navy px-3 py-1 font-medium text-white">{claim.statusLabel}</span>
          {claim.waitingOn && <span className="rounded-full border px-3 py-1 text-ink/80">{WAITING[claim.waitingOn]}</span>}
          {claim.dueDate && <span className="rounded-full border px-3 py-1 text-ink/80">Due {day(claim.dueDate)}</span>}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-navy/15 bg-card px-4 py-3 text-[15px] leading-relaxed text-ink/85">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-brand" />
        <p>We prepare the paperwork with you. You submit it to {claim.institution} yourself — we never submit a claim for you.</p>
      </div>

      {/* 1. Path */}
      <Step n={1} title="Which claim this is" done={d.kind === "path"}>
        {d.kind === "ask" && (
          <div>
            {d.reasons.length > 0 && <p className="text-ink/75">{d.reasons.join(" ")}</p>}
            <p className="font-medium text-ink">{d.text}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {d.options.map((o) => (
                <Button key={o.value} variant="outline" disabled={busy} className="h-11 text-[15px]"
                  onClick={() => patch({ situation: d.question === "amount" ? { amountBand: o.value } : { [d.question]: o.value } })}>
                  {o.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        {d.kind === "review" && (
          <div className="rounded-xl border border-gold/40 bg-gold-soft/60 px-4 py-3 text-[#6b4f18]">
            <p>{d.reason}</p>
            <Button asChild variant="outline" className="mt-2 h-10 bg-card">
              <Link href={caseHref(ws.case.id, "help")}>
                <LifeBuoy className="mr-1.5 h-4 w-4" /> Talk to someone
              </Link>
            </Button>
          </div>
        )}
        {d.kind === "path" && (
          <div>
            <p className="text-[16px] font-semibold text-ink">{d.label}</p>
            <p>{d.explanation}</p>
            {d.reasons.length > 0 && <p className="mt-1 text-[14px] text-ink/70">Why: {d.reasons.join(" ")}</p>}
          </div>
        )}
        {claim.procedure && (
          <p className="text-[14px] text-muted-foreground">
            Rules from{" "}
            <a href={claim.procedure.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-teal-brand underline underline-offset-2">
              {claim.procedure.authority}
              <ExternalLink className="ml-0.5 inline h-3 w-3 align-[-1px]" aria-hidden />
            </a>{" "}
            · procedure version {claim.procedure.version}, checked {day(claim.procedure.checkedOn)}.
          </p>
        )}
        {!submitted && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t pt-3 text-[14px]">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" aria-label="Someone disputes who should get this" className="h-4 w-4" checked={claim.situation.disputed} disabled={busy}
                onChange={(e) => patch({ situation: { disputed: e.target.checked } })} />
              Someone disputes who should get this
            </label>
            {isMf && (
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" aria-label="The units are in a demat account" className="h-4 w-4" checked={claim.situation.demat} disabled={busy}
                  onChange={(e) => patch({ situation: { demat: e.target.checked } })} />
                The units are in a demat account
              </label>
            )}
          </div>
        )}
      </Step>

      {/* 2. Authority */}
      {d.kind === "path" && !claim.entitled && (
        <Step n={2} title="Show you may claim it">
          <p>
            Before we prepare the paperwork, show {claim.institution} records you as entitled to this holding — as nominee, joint
            holder or legal heir. Until then, its amounts and full details stay hidden.
          </p>
          <Button asChild className="h-11 bg-navy text-white hover:bg-navy-deep">
            <Link href={caseHref(ws.case.id, "records")}>Go to Holdings</Link>
          </Button>
        </Step>
      )}

      {pack && (
        <>
          {/* 3. Documents */}
          <Step n={2} title="Documents for this claim" done={!pack.items.some((i) => i.required && i.state === "missing")}>
            <ul className="space-y-3">
              {pack.items.map((it) => (
                <li key={it.id} className="rounded-xl border bg-background px-3.5 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">
                        {it.label} {!it.required && <span className="font-normal text-muted-foreground">(optional)</span>}
                      </p>
                      {it.note && <p className="text-[14px] text-muted-foreground">{it.note}</p>}
                      {it.documentName && <p className="text-[14px] text-teal-brand">Linked: {it.documentName}</p>}
                    </div>
                    {!submitted ? (
                      <Select
                        value={it.state === "linked" && it.documentId ? `doc:${it.documentId}` : it.state === "linked" ? "have" : it.state}
                        onValueChange={(v) =>
                          patch({
                            checklist: {
                              [it.id]: v.startsWith("doc:") ? { state: "linked", documentId: v.slice(4) } : { state: v },
                            },
                          })
                        }
                        disabled={busy}
                      >
                        <SelectTrigger className="h-10 w-full text-[14px] sm:w-[230px]" aria-label={`Status of ${it.label}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="missing">Not yet</SelectItem>
                          <SelectItem value="have">I have it (paper copy)</SelectItem>
                          {docs.map((doc) => (
                            <SelectItem key={doc.id} value={`doc:${doc.id}`}>
                              Use upload: {doc.fileName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-[14px] text-ink/75">{it.state === "missing" ? "Not provided" : "Provided"}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Step>

          {/* 4. Details */}
          <Step n={3} title="Details in the pack" done>
            <dl className="grid gap-2 sm:grid-cols-2">
              {pack.prefill.map((f) => (
                <div key={f.label} className="min-w-0 rounded-lg bg-background px-3 py-2">
                  <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
                  <dd className="break-words font-medium text-ink">{f.value}</dd>
                  <dd className="text-[13px] text-muted-foreground">{f.source}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[14px] text-muted-foreground">Only values you checked are used. If one is wrong, correct it in the document review — the pack updates and any approval is cancelled.</p>
          </Step>

          {/* 5. Declarations */}
          <Step n={4} title="Confirm" done={pack.declarations.every((x) => x.accepted)}>
            <ul className="space-y-2">
              {pack.declarations.map((x) => (
                <li key={x.id}>
                  <label className="flex items-start gap-2.5">
                    <input type="checkbox" aria-label={x.text} className="mt-1 h-4 w-4" checked={x.accepted} disabled={busy || submitted}
                      onChange={(e) => {
                        const ids = pack.declarations.filter((y) => (y.id === x.id ? e.target.checked : y.accepted)).map((y) => y.id);
                        patch({ declarations: ids });
                      }} />
                    <span>{x.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          </Step>

          {/* 6. Approve & download */}
          {!submitted && (
            <Step n={5} title="Check, approve and download" done={!!claim.approval}>
              {pack.gaps.length > 0 ? (
                <ul className="list-disc pl-5 text-ink/80">
                  {pack.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              ) : (
                <>
                  <dl className="grid gap-1 text-[14px]">
                    <div><dt className="inline font-medium">Goes to: </dt><dd className="inline">{pack.recipient}</dd></div>
                    <div><dt className="inline font-medium">How: </dt><dd className="inline">You submit it ({pack.whereToSubmit})</dd></div>
                    <div><dt className="inline font-medium">Why: </dt><dd className="inline">{pack.pathLabel}</dd></div>
                    <div><dt className="inline font-medium">Version: </dt><dd className="inline">{pack.version} · fingerprint {pack.contentHash.slice(0, 12)}</dd></div>
                  </dl>
                  {claim.approval ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-brand/30 bg-teal-soft/60 px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#0b6b6a]">
                        <ShieldCheck className="h-4 w-4" /> Approved until {new Date(claim.approval.expiresAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                      </span>
                      <Button onClick={download} disabled={busy} className="h-11 bg-teal-brand text-white hover:bg-[#0c6a69]">
                        <Download className="mr-1.5 h-4 w-4" /> Download pack (PDF)
                      </Button>
                    </div>
                  ) : (
                    <Button disabled={busy} className="h-11 bg-navy text-white hover:bg-navy-deep"
                      onClick={() => run(() => api.post(`/api/claims/${claimId}/approve`, { contentHash: pack.contentHash }), "Pack approved")}>
                      <FileCheck2 className="mr-1.5 h-4 w-4" /> Approve this exact pack
                    </Button>
                  )}
                  <p className="text-[14px] text-muted-foreground">An approval lasts 15 minutes and is cancelled if anything in the pack changes.</p>
                </>
              )}
            </Step>
          )}
        </>
      )}

      {/* 7. Submission */}
      {claim.status === "ready_for_submission" && (
        <Step n={6} title="Record that you submitted it">
          <p>After you hand it in or send it, tell us how and when. If you got a receipt or acknowledgement number, add it.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block min-w-0">
              <span className="mb-1 block text-[14px] font-medium text-ink/80">How</span>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="h-11 w-full text-[15px]" aria-label="How you submitted it"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-[14px] font-medium text-ink/80">When</span>
              <Input type="date" aria-label="Date you submitted it" value={submitDate} onChange={(e) => setSubmitDate(e.target.value)} className="h-11 text-[15px]" />
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-[14px] font-medium text-ink/80">Receipt number (optional)</span>
              <Input aria-label="Receipt number (optional)" value={receipt} onChange={(e) => setReceipt(e.target.value)} className="h-11 text-[15px]" maxLength={60} />
            </label>
          </div>
          <Button disabled={busy} className="h-11 bg-navy text-white hover:bg-navy-deep"
            onClick={() => run(() => api.post(`/api/claims/${claimId}/submission`, { channel, date: submitDate, ...(receipt.trim() ? { receiptRef: receipt.trim() } : {}) }), "Submission recorded")}>
            I submitted it
          </Button>
        </Step>
      )}

      {/* 8. Tracking */}
      {submitted && (
        <Step n={7} title="What happened next">
          {claim.status === "submission_unknown" && (
            <div className="rounded-xl border border-gold/40 bg-gold-soft/60 px-4 py-3 text-[#6b4f18]">
              <p>You don&apos;t have a receipt, so we don&apos;t know it arrived. Check with {claim.institution} before sending it again — sending twice can slow things down.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Input aria-label="Receipt number" value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="Receipt number" className="h-10 max-w-[220px] bg-card text-[15px]" />
                <Button disabled={busy || !receipt.trim()} variant="outline" className="h-10 bg-card"
                  onClick={() => run(() => api.post(`/api/claims/${claimId}/submission`, { channel: claim.submissionChannel ?? "branch", date: (claim.submittedAt ?? new Date().toISOString()).slice(0, 10), receiptRef: receipt.trim() }), "Receipt recorded")}>
                  Add the receipt
                </Button>
              </div>
            </div>
          )}
          {claim.outcome && (
            <p className={cn("rounded-xl px-4 py-3", claim.outcome === "rejected" || claim.outcome === "unresolved_dispute" ? "bg-[#f2e8e8] text-[#8a4a45]" : "bg-teal-soft text-[#0b6b6a]")}>
              <strong>{claim.statusLabel}</strong>
              {claim.outcomeAmountDisplay ? ` — ${claim.outcomeAmountDisplay} received` : ""}
              {claim.outcomeDate ? ` on ${day(claim.outcomeDate)}` : ""}.
              {claim.outcome === "rejected" && " A rejection is not money recovered."}
              {claim.remainderTracked && " The rest is still being tracked."}
            </p>
          )}
          {nextSteps.length > 0 && (
            <div>
              <p className="font-medium text-ink">Record what {claim.institution} did:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {nextSteps.map((s) => (
                  <Button key={s.to} variant={step === s.to ? "default" : "outline"} className={cn("h-10 text-[14px]", step === s.to && "bg-navy text-white")} onClick={() => setStep(s.to)}>
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {step && (
            <div className="space-y-2 rounded-xl border bg-background p-4">
              {(OUTCOME_STEPS.has(step) || step === "more_information_required") && (
                <label className="block max-w-[220px]">
                  <span className="mb-1 block text-[14px] font-medium text-ink/80">{step === "more_information_required" ? "They want it by" : "When"}</span>
                  <Input type="date" aria-label={step === "more_information_required" ? "They want it by" : "When"} value={when} onChange={(e) => setWhen(e.target.value)} className="h-10 text-[15px]" />
                </label>
              )}
              {NEEDS_AMOUNT.has(step) && (
                <label className="block max-w-[260px]">
                  <span className="mb-1 block text-[14px] font-medium text-ink/80">Amount received</span>
                  <Input aria-label="Amount received" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₹1,25,000" className="h-10 text-[15px]" />
                </label>
              )}
              {step === "institution_review" && (
                <label className="block max-w-[260px]">
                  <span className="mb-1 block text-[14px] font-medium text-ink/80">Their reference (optional)</span>
                  <Input aria-label="Their reference (optional)" value={ref} onChange={(e) => setRef(e.target.value)} className="h-10 text-[15px]" maxLength={60} />
                </label>
              )}
              <label className="block">
                <span className="mb-1 block text-[14px] font-medium text-ink/80">Note (optional)</span>
                <Textarea aria-label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} className="text-[15px]" />
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" className="h-10" onClick={() => setStep(null)}>Cancel</Button>
                <Button disabled={busy} className="h-10 bg-navy text-white hover:bg-navy-deep"
                  onClick={() =>
                    run(
                      () =>
                        api.post(`/api/claims/${claimId}/update`, {
                          to: step,
                          ...(note.trim() ? { note: note.trim() } : {}),
                          ...(ref.trim() ? { institutionRef: ref.trim() } : {}),
                          ...(step === "more_information_required" ? { dueDate: when } : {}),
                          ...(OUTCOME_STEPS.has(step) ? { outcomeDate: when } : {}),
                          ...(NEEDS_AMOUNT.has(step) && amount.trim() ? { outcomeAmount: amount.trim() } : {}),
                        }),
                      "Saved"
                    ).then(() => {
                      setStep(null);
                      setNote("");
                      setAmount("");
                      setRef("");
                    })
                  }>
                  Save
                </Button>
              </div>
            </div>
          )}
        </Step>
      )}

      {/* Timeline */}
      <section className="rounded-2xl border bg-card p-5" aria-labelledby="timeline">
        <h2 id="timeline" className="text-[17px] font-semibold text-navy">History</h2>
        <ol className="mt-3 space-y-2 border-l-2 border-teal-brand/20 pl-4">
          {[...claim.events].reverse().map((e, i) => (
            <li key={i} className="text-[14px]">
              <span className="text-muted-foreground">{day(e.createdAt)} · </span>
              <span className="text-ink/85">{e.note}</span>
            </li>
          ))}
        </ol>
        {claim.packVersions.length > 1 && (
          <p className="mt-3 text-[14px] text-muted-foreground">
            Pack versions kept: {claim.packVersions.map((p) => `v${p.version} (${p.status})`).join(", ")}.
          </p>
        )}
      </section>
    </div>
  );
}
