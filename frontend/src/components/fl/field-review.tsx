"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  decide,
  locateExcerpt,
  reviewsFromServer,
  summarise,
  toDecisions,
  type FieldDecision,
  type FieldReview as Review,
} from "@/lib/field-review";
import { useCase } from "./case-context";
import { caseHref } from "./case-nav";
import { CATEGORY_LABEL, ConfidenceMeter, DOC_CATEGORY_LABEL } from "./ui-bits";
import { ArrowLeft, ArrowUp, Check, CircleAlert, FileText, Loader2, Pencil, ShieldCheck, X } from "lucide-react";

const DECISION_LABEL: Record<FieldDecision, string> = {
  not_reviewed: "Not reviewed",
  accepted: "Accepted",
  corrected: "Corrected",
  rejected: "Rejected",
};

/**
 * Side-by-side field review (DESIGN §5.4, PRD FL-06 / FL-26): the document's
 * text on the left, each proposed field with its source and Accept / Correct /
 * Reject on the right. Stacked on narrow screens.
 */
export default function FieldReview({ docId }: { docId: string }) {
  const { ws, reload } = useCase();
  const doc = ws.documents.find((d) => d.id === docId) ?? null;
  const documentsHref = `${caseHref(ws.case.id, "records")}/documents`;

  const [text, setText] = useState<{ id: string; value: string | null } | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [active, setActive] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Re-start from the saved decisions whenever they change (e.g. after a save).
  const fieldsKey = doc ? JSON.stringify(doc.fields) : "";
  const [reviewKey, setReviewKey] = useState<string | null>(null);
  if (doc && reviewKey !== fieldsKey) {
    setReviewKey(fieldsKey);
    setReviews(reviewsFromServer(doc.fields));
    setEditing(null);
    setActive(null);
  }

  useEffect(() => {
    let alive = true;
    api
      .get<{ document: { id: string; text: string | null } }>(`/api/documents/${docId}`)
      .then((r) => alive && setText({ id: r.document.id, value: r.document.text }))
      .catch((e) => alive && setTextError(e instanceof Error ? e.message : "Could not load the document text"));
    return () => {
      alive = false;
    };
  }, [docId]);

  const fields = useMemo(() => (doc?.fields ?? []).map((f) => ({ ...f, value: f.proposedValue })), [doc]);
  const summary = summarise(fields, reviews);
  const pending = doc ? toDecisions(doc.fields, reviews) : [];
  const docText = text?.id === docId ? text.value : null;
  const highlight = active !== null && docText ? locateExcerpt(docText, fields[active]?.sourceExcerpt ?? "") : null;

  // Bring the highlighted excerpt into view inside the text panel.
  useEffect(() => {
    if (!highlight) return;
    textRef.current?.querySelector("mark")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight]);

  if (!doc) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CircleAlert className="h-9 w-7 text-muted-foreground/60" />
          <div className="text-[16px] font-medium text-navy">This document isn&apos;t in this case</div>
          <Button asChild size="sm" variant="outline">
            <Link href={documentsHref}>Back to documents</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  function showInDocument(i: number) {
    setActive(i);
    // On a stacked (mobile) layout, scroll up to the text panel.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      textRef.current?.parentElement?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  function backToField() {
    if (active === null) return;
    fieldRefs.current[active]?.scrollIntoView({ block: "center", behavior: "smooth" });
    fieldRefs.current[active]?.querySelector("button")?.focus({ preventScroll: true });
  }

  function set(i: number, d: FieldDecision, value?: string, reason?: string) {
    setReviews((r) => decide(r, i, d, value, reason));
    setEditing(null);
  }

  async function save() {
    if (!doc || !pending.length || saving) return;
    setSaving(true);
    try {
      await api.put(`/api/documents/${doc.id}/review`, { decisions: pending });
      await reload();
      toast({
        title: "Decisions saved",
        description: `${doc.fileName}: ${pending.length} ${pending.length === 1 ? "decision" : "decisions"} saved.`,
      });
    } catch (e) {
      toast({ title: "Not saved", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const before = highlight && docText ? docText.slice(0, highlight[0]) : docText;
  const marked = highlight && docText ? docText.slice(highlight[0], highlight[1]) : null;
  const after = highlight && docText ? docText.slice(highlight[1]) : null;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href={documentsHref} className="-ml-1 inline-flex min-h-9 items-center rounded-md px-1 text-[14px] text-muted-foreground hover:text-navy">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> All documents
          </Link>
          <h1 className="font-display flex min-w-0 items-center gap-2 text-[22px] font-semibold text-navy">
            <span className="truncate">{doc.fileName}</span>
            {doc.isSynthetic && <Badge className="shrink-0 rounded bg-gold-soft px-1.5 text-[12px] font-bold text-[#7a5a1c]">DEMO</Badge>}
          </h1>
          <p className="text-[14px] text-muted-foreground">{DOC_CATEGORY_LABEL[doc.category] ?? CATEGORY_LABEL[doc.category] ?? doc.category} · Check each value against the document.</p>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {/* Left: the document */}
        <section aria-labelledby="doc-text-heading" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <Card className="min-w-0 gap-0 py-0">
            <CardContent className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <h3 id="doc-text-heading" className="flex items-center gap-2 text-[15px] font-semibold text-navy">
                  <FileText className="h-4 w-4 text-teal-brand" /> Document text
                </h3>
                {active !== null && (
                  <button onClick={backToField} className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-[14px] font-medium text-teal-brand hover:bg-teal-soft lg:hidden">
                    <ArrowUp className="h-3.5 w-3.5 rotate-180" /> Back to “{fields[active]?.label}”
                  </button>
                )}
              </div>
              <div ref={textRef} className="nice-scroll max-h-72 overflow-auto px-4 py-3 lg:max-h-[calc(100vh-12rem)]" tabIndex={0} aria-label="Document text">
                {textError ? (
                  <p className="text-[14px] text-destructive">{textError}</p>
                ) : text === null ? (
                  <p className="flex items-center gap-2 text-[14px] text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the document…</p>
                ) : docText ? (
                  <pre className="whitespace-pre-wrap break-words font-mono text-[14px] leading-relaxed text-ink/85">
                    {before}
                    {marked && <mark className="rounded bg-gold-soft px-0.5 text-ink outline outline-2 outline-gold/60">{marked}</mark>}
                    {after}
                  </pre>
                ) : (
                  <p className="text-[14px] leading-relaxed text-muted-foreground">
                    No text is stored for this document (it was read as an image). Check each value against your copy of the document.
                  </p>
                )}
                {active !== null && docText && !highlight && (
                  <p className="mt-2 text-[14px] text-muted-foreground">We couldn&apos;t find this field&apos;s source text in the document — check it against your copy.</p>
                )}
              </div>
              <p className="border-t px-4 py-2 text-[13px] text-muted-foreground">Account and ID numbers are masked; only the last 4 digits are shown.</p>
            </CardContent>
          </Card>
        </section>

        {/* Right: proposed fields */}
        <section aria-labelledby="fields-heading" className="min-w-0 space-y-3">
          <div className="rounded-xl border bg-card px-4 py-3">
            <h3 id="fields-heading" className="text-[15px] font-semibold text-navy">Proposed values</h3>
            <p className="mt-0.5 text-[14px] text-ink/80" aria-live="polite">
              {summary.reviewed} of {summary.total} reviewed
              {summary.pendingCritical.length > 0 && ` · ${summary.pendingCritical.length} important ${summary.pendingCritical.length === 1 ? "value" : "values"} still to check`}
            </p>
          </div>

          {fields.length === 0 && (
            <p className="rounded-xl border bg-card px-4 py-6 text-center text-[15px] text-muted-foreground">No values were read from this document.</p>
          )}

          <ul className="space-y-3">
            {fields.map((f, i) => {
              const r = reviews[i];
              if (!r) return null;
              const critical = f.critical;
              return (
                <li
                  key={i}
                  ref={(el) => {
                    fieldRefs.current[i] = el;
                  }}
                  className={cn(
                    "rounded-xl border bg-card p-4 transition-shadow",
                    active === i && "ring-2 ring-gold/50",
                    r.decision === "rejected" && "bg-secondary/60"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[14px] font-semibold uppercase tracking-wider text-ink/70">{f.label}</span>
                        {critical && <span className="rounded border border-navy/20 px-1 text-[12px] font-medium text-navy">Important</span>}
                      </div>
                      {f.changes > 0 && f.reviewedAt && (
                        <div className="mt-0.5 text-[13px] text-muted-foreground">
                          Changed {f.changes} {f.changes === 1 ? "time" : "times"} · last on{" "}
                          {new Date(f.reviewedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      )}
                      {r.decision === "corrected" ? (
                        <div className="mt-1 text-[15px]">
                          <div className="text-muted-foreground line-through decoration-1">Was: {r.original}</div>
                          <div className="font-medium text-ink">Now: {r.corrected}</div>
                        </div>
                      ) : (
                        <div className={cn("mt-0.5 break-words text-[16px] font-medium text-ink", r.decision === "rejected" && "text-muted-foreground line-through")}>
                          {f.value}
                        </div>
                      )}
                    </div>
                    <ConfidenceMeter value={f.confidence} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-start justify-between gap-2 border-l-2 border-teal-brand/30 pl-2">
                    <p className="min-w-0 flex-1 break-words text-[14px] leading-relaxed text-muted-foreground">
                      <span className="font-medium text-ink/75">Source: </span>“{f.sourceExcerpt}”
                    </p>
                    <button onClick={() => showInDocument(i)} className="min-h-8 shrink-0 rounded-md px-2 text-[14px] font-medium text-teal-brand hover:bg-teal-soft">
                      Show in document
                    </button>
                  </div>

                  {editing === i ? (
                    <div className="mt-3 space-y-2">
                      <label className="block text-[14px] font-medium text-ink/80" htmlFor={`correct-${i}`}>
                        Correct value <span className="font-normal text-muted-foreground">(was: {r.original})</span>
                      </label>
                      <Input id={`correct-${i}`} value={draft} onChange={(e) => setDraft(e.target.value)} className="h-10 text-[15px]" autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") set(i, "corrected", draft, draftReason);
                          if (e.key === "Escape") setEditing(null);
                        }}
                      />
                      <label className="block text-[14px] font-medium text-ink/80" htmlFor={`correct-why-${i}`}>
                        Why? <span className="font-normal text-muted-foreground">(optional, kept with the change)</span>
                      </label>
                      <Input id={`correct-why-${i}`} value={draftReason} onChange={(e) => setDraftReason(e.target.value)} className="h-10 text-[15px]" maxLength={300} placeholder="e.g. Checked against the passbook" />
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-9" onClick={() => setEditing(null)}>Cancel</Button>
                        <Button size="sm" className="h-9 bg-navy text-white hover:bg-navy-deep" onClick={() => set(i, "corrected", draft, draftReason)}>Use this value</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[14px] text-ink/75">
                        Review status: <span className="font-semibold text-ink">{DECISION_LABEL[r.decision]}</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Review ${f.label}`}>
                        <Button size="sm" variant="outline" aria-pressed={r.decision === "accepted"} onClick={() => set(i, "accepted")}
                          className={cn("h-9 text-[14px]", r.decision === "accepted" && "border-teal-brand bg-teal-soft text-[#0b6b6a]")}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" aria-pressed={r.decision === "corrected"} onClick={() => { setEditing(i); setDraft(r.corrected ?? r.original); setDraftReason(r.reason ?? ""); }}
                          className={cn("h-9 text-[14px]", r.decision === "corrected" && "border-navy bg-secondary text-navy")}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Correct
                        </Button>
                        <Button size="sm" variant="outline" aria-pressed={r.decision === "rejected"} onClick={() => set(i, "rejected")}
                          className={cn("h-9 text-[14px]", r.decision === "rejected" && "border-[#8a4a45] bg-[#8a4a45]/10 text-[#8a4a45]")}>
                          <X className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                      {r.decision === "rejected" && (
                        <div className="w-full">
                          <label className="sr-only" htmlFor={`reject-why-${i}`}>Why is {f.label} wrong?</label>
                          <Input id={`reject-why-${i}`} value={r.reason ?? ""} maxLength={300}
                            onChange={(e) => setReviews((all) => decide(all, i, "rejected", undefined, e.target.value))}
                            className="h-9 text-[14px]" placeholder="Why is this wrong? (optional)" />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {fields.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              {summary.rejected > 0 && (
                <p className="mb-2 text-[14px] leading-relaxed text-ink/80">
                  Rejected values stay listed, crossed out, but are never used as facts.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[14px] text-ink/80">
                  {pending.length ? (
                    `${pending.length} unsaved ${pending.length === 1 ? "decision" : "decisions"}.`
                  ) : doc.userVerified ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#0b6b6a]"><ShieldCheck className="h-4 w-4" /> Saved — every value has a decision</span>
                  ) : summary.reviewed ? (
                    `Saved. ${summary.total - summary.reviewed} still to check.`
                  ) : (
                    "Check each value, then save. You can save part-way and come back."
                  )}
                </p>
                <Button onClick={save} disabled={!pending.length || saving} className="h-10 bg-teal-brand text-white hover:bg-[#0c6a69]">
                  {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Save decisions
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
