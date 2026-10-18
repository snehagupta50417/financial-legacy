"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORY_LABEL } from "@/keeper/catalog";
import { OUTCOME_LABEL, claimStep, CLAIM_STEPS } from "@/keeper/claims";
import { dispatch, setPrefs, useKeeper, attachDocument } from "@/keeper/store";
import type { Activity, Case, Category } from "@/keeper/types";
import { documentTitle } from "@/keeper/presentation";
import { formatDay, money } from "@/keeper/util";
import { useSpeechOutSupport, useRecognitionSupport } from "@/keeper/voice";
import { cn } from "@/lib/utils";
import { AiPermission } from "./backend-access";
import { DemoInline, DemoScenarios } from "./demo-data";
import { AssetDetail, ClaimDetail, DocDetail, FamilyView, PlanView } from "./panel";
import { Btn, Card, EvidenceBadge, Hint, Pill } from "./ui";

const field = "min-h-11 w-full rounded-xl border border-input bg-paper px-3 text-[0.95rem]";

function Page({ title, sub, c, children, wide }: { title: string; sub?: string; c: Case; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("mx-auto px-4 py-6 sm:px-8", wide ? "max-w-[1180px]" : "max-w-[860px]")}>
      <p className="text-[0.85rem] text-muted-foreground">Whose information: <b className="text-ink">{c.name}</b></p>
      <h1 className="display mt-1 text-[2.2rem]">{title}</h1>
      {sub && <p className="mt-1 max-w-[44rem] text-ink/75">{sub}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

const Empty = ({ title, hint, children }: { title: string; hint: string; children?: React.ReactNode }) => (
  <Card className="py-10 text-center"><p className="display text-[1.5rem]">{title}</p><p className="mx-auto mt-1 max-w-md text-ink/70">{hint}</p><div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div></Card>
);

function TalkButton({ label, id }: { label: string; id?: string }) {
  const router = useRouter();
  return <Btn onClick={() => { if (id) dispatch({ t: "choose", id, label }); router.push("/app"); }}>{label}</Btn>;
}

export function AssetsView() {
  const { c } = useKeeper();
  const [sel, setSel] = useState<string | null>(null);
  const [f, setF] = useState({ institution: "", category: "bank" as Category, ref: "" });
  if (!c) return null;
  const a = c.assets.find((x) => x.id === sel) ?? c.assets[0];
  return (
    <Page c={c} wide title="Assets" sub="Review holdings and the evidence behind them.">
      <details className="mb-6 rounded-2xl border border-line bg-card" open={c.plan.length > 0}>
        <summary className="flex min-h-12 cursor-pointer items-center justify-between px-5 font-semibold">Discovery plan <Pill>{c.plan.length ? `${c.plan.length} ${c.plan.length === 1 ? "source" : "sources"}` : "Not built yet"}</Pill></summary>
        <div className="border-t border-line p-5"><PlanView c={c} />{!c.plan.length && <div className="mt-3"><TalkButton label="Find my assets" id="j:discover" /></div>}</div>
      </details>
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-3">
          {c.assets.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} aria-current={a?.id === x.id ? "true" : undefined} className={cn("block w-full rounded-2xl border bg-card p-4 text-left hover:bg-paper", a?.id === x.id ? "border-ink" : "border-line")}>
              <p className="font-semibold">{x.institution}</p>
              <p className="text-[0.85rem] text-muted-foreground">{CATEGORY_LABEL[x.category]}{x.ref ? ` · ${x.ref}` : ""}</p>
              <div className="mt-2 flex flex-wrap gap-1.5"><EvidenceBadge e={x.evidence} />{x.amount && <Pill>{money(x.amount.value)} · dated {x.amount.asOf}</Pill>}{x.duplicateOf && <Pill tone="warn">Possible duplicate</Pill>}</div>
              <p className="mt-2 text-[0.85rem] text-ink/70">Next: {x.next}</p>
            </button>
          ))}
          {!c.assets.length && <Empty title="No assets yet" hint="Each bank account, fund, policy or provident fund goes here, with the evidence behind it. Tell Keeper what you know, or add one yourself."><DemoInline /></Empty>}
          <form className="space-y-2 rounded-2xl border border-dashed border-line p-4" onSubmit={(e) => { e.preventDefault(); if (f.institution.trim()) { const result = dispatch({ t: "asset.add", institution: f.institution, category: f.category, ref: f.ref }); if (result) void result.then(ok => { if (ok) setF({ institution: "", category: "bank", ref: "" }); }); else setF({ institution: "", category: "bank", ref: "" }); } }}>
            <p className="font-semibold">Add a record</p>
            {c.gate && !c.gate.discoveryUnlocked && <Hint>Saving holdings requires identity checks. This source is not connected.</Hint>}
            <input aria-label="Institution" className={field} placeholder="Institution, e.g. Bank A" value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} />
            <select aria-label="Type" className={field} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Category })}>{(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>)}</select>
            <input aria-label="Last 4 digits of the reference (optional)" className={field} inputMode="numeric" placeholder="Last 4 digits only (optional)" maxLength={4} value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value.replace(/\D/g, "") })} />
            <Btn type="submit" variant="ink" className="w-full" disabled={!!c.gate && !c.gate.discoveryUnlocked}>Add record</Btn>
          </form>
        </div>
        <div>{a ? <Card><AssetDetail key={a.id} a={a} c={c} /></Card> : <Hint>Select an asset to see its evidence, history and next step.</Hint>}</div>
      </div>
    </Page>
  );
}

export function DocumentsView() {
  const { c, state } = useKeeper();
  const [sel, setSel] = useState<string | null>(null);
  if (!c) return null;
  const d = c.docs.find((x) => x.id === sel) ?? c.docs[0];
  const kinds: ["statement" | "policy" | "folio" | "unreadable" | "password" | "duplicate", string][] = [["statement", "Bank statement"], ["policy", "Insurance policy"], ["folio", "Mutual fund statement"], ["unreadable", "Blurred scan"], ["password", "Password-protected PDF"], ["duplicate", "Copy of a document"]];
  return (
    <Page c={c} wide title="Documents" sub="Check extracted details against the source.">
      <Card className="mb-6">{state?.session?.mode === "signin" && <label className="mb-4 block font-semibold">Add a document<input aria-label="Add document" className="mt-2 block w-full text-sm" type="file" accept=".pdf,.txt,.png,.jpg,.jpeg,.webp" onChange={e => { const file = e.target.files?.[0]; if (file) void attachDocument(file); e.target.value = ""; }} /></label>}{state?.session?.mode === "sample" && <details><summary className="min-h-11 cursor-pointer py-2 font-semibold">Add document</summary><div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Choose a document">{kinds.map(([v, l]) => <Btn key={v} variant="quiet" className="min-h-10 px-4 text-[0.88rem]" onClick={() => { dispatch({ t: "doc.sample", variant: v }); setSel(null); }}>{l}</Btn>)}</div></details>}</Card>
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <ul className="space-y-3">
          {c.docs.map((x) => (
            <li key={x.id}><button onClick={() => setSel(x.id)} aria-current={d?.id === x.id ? "true" : undefined} className={cn("block w-full rounded-2xl border bg-card p-4 text-left hover:bg-paper", d?.id === x.id ? "border-ink" : "border-line")}>
              <p className="break-words font-semibold">{documentTitle(x.name)}</p><p className="text-[0.85rem] text-muted-foreground">{x.kind}</p>
              <div className="mt-2"><Pill tone={x.state === "ready" ? (x.fields.every((f) => f.reviewed) ? "ok" : "warn") : x.state === "processing" ? "plain" : "warn"}>{x.state === "ready" ? (x.fields.every((f) => f.reviewed) ? "Reviewed" : `${x.fields.filter((f) => !f.reviewed).length} to check`) : x.state === "processing" ? "Reading…" : x.state === "unreadable" ? "Couldn’t read" : x.state === "password" ? "Password-protected" : "Duplicate"}</Pill></div>
            </button></li>
          ))}
          {!c.docs.length && <Empty title="No documents yet" hint="Add a statement or policy. Keeper reads it, shows each detail it found next to the original, and you check them one by one."><DemoInline /></Empty>}
        </ul>
        <div>{d ? <Card><DocDetail key={d.id} d={d} c={c} /></Card> : null}</div>
      </div>
    </Page>
  );
}

export function ClaimsView() {
  const { state, c } = useKeeper();
  const [sel, setSel] = useState<string | null>(null);
  if (!c) return null;
  if (c.kind === "self") {
    return (
      <Page c={c} title="Claims" sub="Claims are for assets after someone has died. Each institution gets its own claim.">
        <Empty title="This is your own record" hint="Claims are for after a death, and each one lives in its own record so nothing is mixed. Switch to an estate record, or tell Keeper about someone who has died."><TalkButton label="Get help after a death" id="j:claim" />{state?.session?.mode === "sample" && state.order.find((id) => state.cases[id].kind === "estate") && <Btn variant="quiet" onClick={() => dispatch({ t: "switchCase", id: state.order.find((id) => state.cases[id].kind === "estate")! })}>See the estate example</Btn>}{state?.session?.mode === "signin" && <DemoInline />}</Empty>
      </Page>
    );
  }
  const cl = c.claims.find((x) => x.id === sel) ?? c.claims[0];
  const unstarted = c.assets.filter((a) => a.confirmed && !c.claims.some((x) => x.assetId === a.id));
  return (
    <Page c={c} wide title="Claims" sub="One claim per institution, tracked on its own. Requirements come from official sources where available. Keeper prepares; you approve and submit.">
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-3">
          {c.claims.map((x) => { const a = c.assets.find((q) => q.id === x.assetId)!; const st = CLAIM_STEPS.find((s) => s.id === claimStep(c, x))!; return (
            <button key={x.id} onClick={() => setSel(x.id)} aria-current={cl?.id === x.id ? "true" : undefined} className={cn("block w-full rounded-2xl border bg-card p-4 text-left hover:bg-paper", cl?.id === x.id ? "border-ink" : "border-line")}>
              <p className="font-semibold">{a.institution}</p><p className="text-[0.85rem] text-muted-foreground">{CATEGORY_LABEL[a.category]}</p>
              <div className="mt-2 flex flex-wrap gap-1.5"><Pill tone={x.outcome ? "ok" : "warn"}>{x.outcome ? OUTCOME_LABEL[x.outcome.kind] : `Now: ${st.label}`}</Pill>{x.submitted && <Pill>Ref {x.submitted.ref}</Pill>}</div>
              {x.nextFollowUp && !x.outcome && <p className="mt-2 text-[0.85rem] text-ink/70">Next follow-up: {formatDay(x.nextFollowUp)}</p>}
            </button>); })}
          {unstarted.map((a) => (
            <div key={a.id} className="rounded-2xl border border-dashed border-line p-4"><p className="font-semibold">{a.institution}</p><p className="text-[0.85rem] text-muted-foreground">No claim started</p><Btn variant="ink" className="mt-2 min-h-10" onClick={() => dispatch({ t: "claim.start", assetId: a.id })}>Start a claim</Btn></div>
          ))}
          {!c.claims.length && !unstarted.length && <Empty title="No claims yet" hint="A claim is one institution's process, tracked from papers to outcome. Confirm an asset first, or tell Keeper about one you already know."><TalkButton label="Talk to Keeper" /><DemoInline /></Empty>}
        </div>
        <div>{cl ? <Card><ClaimDetail key={cl.id} cl={cl} c={c} /></Card> : null}</div>
      </div>
    </Page>
  );
}

export function FamilyPage() {
  const { c } = useKeeper();
  if (!c) return null;
  if (c.kind === "estate") {
    return <Page c={c} title="Family record" sub="A family record is about someone’s own affairs while they are alive."><Empty title="This is an estate record" hint="Switch to “My financial record” to prepare your own family record."><TalkButton label="Prepare for my family" id="j:prepare" /></Empty></Page>;
  }
  return <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-8"><FamilyView c={c} /></div>;
}

const KIND: Record<Activity["kind"], string> = { prepared: "Keeper prepared", confirmed: "You confirmed", approved: "You approved", sent: "Submission preparation", institution: "Institution response (as you recorded it)" };
export function ActivityView() {
  const { c } = useKeeper();
  if (!c) return null;
  return (
    <Page c={c} title="Activity" sub="Saved actions, approvals and institution updates.">
      {c.activity.length ? (
        <ol className="space-y-2">
          {c.activity.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-card p-3"><Pill tone={a.kind === "approved" ? "ok" : a.kind === "sent" ? "warn" : "plain"} className="shrink-0">{KIND[a.kind]}</Pill><span className="flex-1">{a.text}</span><time className="text-[0.82rem] text-muted-foreground" dateTime={a.at}>{formatDay(a.at)}</time></li>
          ))}
        </ol>
      ) : <Empty title="Nothing yet" hint="Every step you and Keeper take is saved here, so you can always see what happened and when."><DemoInline /></Empty>}
    </Page>
  );
}

export function SettingsView() {
  const { state, c } = useKeeper();
  const router = useRouter();
  const out = useSpeechOutSupport();
  const rec = useRecognitionSupport();
  if (!state || !c) return null;
  return (
    <Page c={c} title="Settings" sub="Account, access, consent, privacy and sessions.">
      <div className="space-y-4">
        <Card><h2 className="font-semibold">Account</h2><p className="mt-1">{state.session?.name}</p><Hint>This browser session keeps your progress. Secure account sign-in is not available yet.</Hint></Card>
        <Card><h2 className="font-semibold">Access and consent</h2><ul className="mt-2 space-y-1 text-[0.95rem]"><li>Guided searches permission: <b>{c.facts.consent?.value ?? "not asked yet"}</b></li><li>Trusted contacts: <b>{c.contacts.length}</b>. access is a preview. Sharing is not connected.</li></ul>{state.session?.mode === "signin" && <AiPermission />}</Card>
        <Card><h2 className="font-semibold">Demo data</h2><p className="mt-1 text-[0.95rem]">{state.session?.mode === "signin" ? "Want to see what a full record looks like? Add a demo case. It is labelled “(demo)” and easy to remove." : "You are looking at the example workspace. Everything in it is made up."}</p>{state.session?.mode === "signin" ? <DemoScenarios /> : <div className="mt-3 flex flex-wrap gap-2"><Btn variant="quiet" onClick={() => dispatch({ t: "reset" })}>Reset example</Btn><Link href="/welcome" className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-5 text-[0.95rem] hover:bg-secondary">Take the guided tour</Link></div>}</Card>
        <Card><h2 className="font-semibold">Privacy</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-[0.95rem] text-ink/85"><li>{state.session?.mode === "signin" ? "Your case is saved. Keeper does not submit to institutions." : "The example workspace stays in this browser."}</li><li>Account references are masked.</li><li>Keeper never asks for passwords, PINs or OTPs, and doesn’t ask about health.</li></ul></Card>
        <Card><h2 className="font-semibold">Voice</h2><p className="mt-1 text-[0.95rem]">Speech recognition: <b>{rec ? "available in this browser" : "not available. type instead"}</b>. Spoken replies: <b>{out ? "available" : "not available"}</b>.</p>
          {out && <label className="mt-2 flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#526653]" checked={state.speakReplies} onChange={(e) => setPrefs({ speakReplies: e.target.checked })} />Read Keeper’s replies aloud</label>}
          <Hint>The microphone only turns on when you tap it. Keeper stores no audio. Chrome and Edge send audio to their speech service.</Hint></Card>
        <Card><h2 className="font-semibold">Your session</h2><p className="mt-1 text-[0.95rem]">Your progress is saved through navigation and refresh.</p>
          <div className="mt-3 flex flex-wrap gap-2"><Btn variant="quiet" onClick={() => dispatch({ t: "reset" })}>{state.session?.mode === "sample" ? "Reset example" : "Start a new record"}</Btn><Btn variant="quiet" onClick={() => { dispatch({ t: "signIn", name: state.session?.name ?? "Asha Rao", mode: "sample" }); router.push("/app"); }}>Open example workspace</Btn><Btn variant="danger" onClick={() => { dispatch({ t: "signOut" }); router.push("/"); }}>Sign out</Btn></div></Card>
        <p className="text-[0.85rem] text-muted-foreground"><Link href="/" className="underline underline-offset-4">Back to the website</Link></p>
      </div>
    </Page>
  );
}
