"use client";
import { ArrowRight, Check, FileText, Layers, LockKeyhole, Users } from "lucide-react";
import type { Asset, Case, Contact, Doc } from "@/keeper/types";
import { CLAIM_STEPS, type ClaimStep } from "@/keeper/claims";
import { money } from "@/keeper/util";
import { CATEGORY_LABEL } from "@/keeper/catalog";
import { cn } from "@/lib/utils";

export function ListeningWave() {
  return <span className="keeper-wave inline-flex h-6 items-center gap-[3px] text-moss" aria-hidden="true">{[8, 15, 22, 12, 19, 9, 16].map((h, i) => <i key={i} className="w-[3px] rounded-full bg-current" style={{ height: h, animationDelay: (i * 0.11) + "s" }} />)}</span>;
}

/** Actual document, review state and linked holding. No progress is estimated. */
export function SourceToRecord({ doc, asset }: { doc: Doc; asset?: Asset }) {
  const remaining = doc.fields.filter(f => !f.reviewed).length;
  const steps = [
    { icon: FileText, label: "Document", detail: doc.state === "ready" ? "Read" : doc.state === "processing" ? "Reading" : "Needs a clearer copy" },
    { icon: Check, label: "Details", detail: !doc.fields.length ? "Not extracted" : remaining ? remaining + " to review" : "Reviewed" },
    { icon: Layers, label: "Asset record", detail: asset ? asset.confirmed ? "Confirmed by you" : "Potential match" : "Not linked" },
  ];
  return <ol aria-label="Document to asset record" className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/50 p-3">{steps.map((s, i) => <li key={s.label} className="relative min-w-0"><s.icon className="mb-1 h-4 w-4 text-moss" aria-hidden /><p className="text-[0.82rem] font-semibold">{s.label}</p><p className="text-[0.75rem] leading-snug text-muted-foreground">{s.detail}</p>{i < steps.length - 1 && <ArrowRight className="absolute right-1 top-0 h-3 w-3 text-moss/60" aria-hidden />}</li>)}</ol>;
}

export function ClaimTimeline({ step }: { step: ClaimStep }) {
  const current = CLAIM_STEPS.findIndex(s => s.id === step);
  return <ol aria-label="Claim stages" className="keeper-claim-timeline grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-4">{CLAIM_STEPS.map((s, i) => <li key={s.id + (i === current ? "-current" : "")} aria-current={i === current ? "step" : undefined} className="relative min-w-0">{i % 4 !== 3 && <span aria-hidden className={cn("absolute left-7 right-0 top-3 h-px", i < current ? "bg-moss/50" : "bg-line")} />}<span className={cn("relative z-10 mb-2 flex h-6 w-6 items-center justify-center rounded-full border text-xs", i < current ? "border-moss bg-moss text-white" : i === current ? "border-ink bg-ink text-ivory" : "border-line bg-paper text-muted-foreground")}>{i < current ? <Check className="h-3 w-3" aria-hidden /> : <span aria-hidden>{i + 1}</span>}</span><span className={cn("block text-[0.8rem] leading-snug", i === current && "font-semibold")}>{s.label}<span className="sr-only">{i < current ? ", earlier stage" : i === current ? ", current stage" : ", upcoming"}</span></span></li>)}</ol>;
}

export function DuplicateComparison({ asset, other }: { asset: Asset; other: Asset }) {
  return <div className="my-3 grid gap-2 sm:grid-cols-2" aria-label="Compare possible duplicate records">{[["This record", asset], ["Existing record", other]].map(([label, value]) => { const a = value as Asset; return <dl key={label as string} className="min-w-0 rounded-xl bg-paper p-3 text-sm"><dt className="text-muted-foreground">{label as string}</dt><dd className="mt-1 font-semibold">{a.institution}</dd><dt className="sr-only">Reference</dt><dd>{a.ref || "Reference not recorded"}</dd><dt className="sr-only">Type</dt><dd className="text-muted-foreground">{CATEGORY_LABEL[a.category]}</dd>{a.amount && <><dt className="sr-only">Dated amount</dt><dd className="mt-2">{money(a.amount.value)}<span className="block text-xs text-muted-foreground">{a.amount.type} · {a.amount.asOf}</span></dd></>}</dl>; })}</div>;
}

export function ContactScope({ contact }: { contact: Contact }) {
  return <ul className="mb-3 grid grid-cols-2 gap-2" aria-label="Access preview">{Object.entries(contact.sees).map(([key, allowed]) => <li key={key} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm", allowed ? "bg-paper" : "text-muted-foreground")} >{allowed ? <Check className="h-4 w-4 text-moss" aria-hidden /> : <LockKeyhole className="h-3.5 w-3.5" aria-hidden />}<span className="capitalize">{key}</span><span className="sr-only">{allowed ? ": included in preview" : ": hidden"}</span></li>)}</ul>;
}

export function FamilyConnections({ c }: { c: Case }) {
  const items = [{ icon: Layers, label: "Assets", value: c.assets.length }, { icon: FileText, label: "Documents", value: c.docs.length }, { icon: Users, label: "Contacts", value: c.contacts.length }];
  return <div className="flex flex-wrap gap-x-5 gap-y-2 border-l-2 border-moss/40 pl-3" aria-label="Family record contents">{items.map(i => <span key={i.label} className="inline-flex items-center gap-2 text-sm"><i.icon className="h-4 w-4 text-moss" aria-hidden /><span>{i.value} {i.label.toLowerCase()}</span></span>)}</div>;
}
