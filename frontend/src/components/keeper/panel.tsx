"use client";
import { claimDestination } from "@shared/handoff";
import { DocumentVerification } from "./document-verification";
import { SEARCH_LABEL, type SearchOutcome } from "@shared/guided-search";

import Link from "next/link";
import { useState } from "react";
import { Check, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { CATEGORY_LABEL, CONTACT_VIEW, FACT_META, GROUP_ORDER, MILESTONES } from "@/keeper/catalog";
import { OUTCOME_LABEL, claimPlan, claimStep, declarationsFor, type editClaim } from "@/keeper/claims";
import { milestoneNote } from "@/keeper/engine";
import { dispatch } from "@/keeper/store";
import type { Asset, Case, Claim, Doc, Outcome, PlanSource } from "@/keeper/types";
import { documentTitle } from "@/keeper/presentation";
import { cap, formatDay, money } from "@/keeper/util";
import { QUESTION_TEXT } from "@shared/claim-path";
import { cn } from "@/lib/utils";
import { Btn, Card, EvidenceBadge, FactBadge, Hint, Pill } from "./ui";
import { EvidenceExplorer, DurableClaimReview } from "./evidence-explorer";
import { FollowUpChoice, OfficialHandoff } from "./follow-up";
import { BackendAccess, BackendPackDownload } from "./backend-access";
import { SourceToRecord, ClaimTimeline, DuplicateComparison, ContactScope, FamilyConnections } from "./task-visuals";

const inputCls = "min-h-11 w-full rounded-xl border border-input bg-paper px-3 text-[0.95rem]";
const H = ({ children }: { children: React.ReactNode }) => <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-moss">{children}</h3>;

// ─── What Keeper knows ─────────────────────────────────────────────────────────────────────

export function KnowPanel({ c, onContinue }: { c: Case; onContinue?: () => void }) {
  const [edit, setEdit] = useState<{ key: string; value: string } | null>(null);
  const [showSources, setShowSources] = useState(false);
  const facts = Object.values(c.facts).filter((f) => FACT_META[f.key]);
  return (
    <div className="space-y-6">
      {c.backendId && !c.gate?.discoveryUnlocked && <details className="text-sm"><summary className="min-h-11 cursor-pointer py-2 font-medium text-moss">Identity and authority requirements</summary><BackendAccess c={c} /></details>}
      {!facts.length && <p className="text-sm text-muted-foreground">Your details will appear here as we talk.</p>}
      {facts.length > 0 && <button aria-pressed={showSources} onClick={() => setShowSources(v => !v)} className="min-h-9 text-[0.82rem] text-moss underline underline-offset-4">{showSources ? "Hide sources and editing" : "Sources and editing"}</button>}
      {GROUP_ORDER.map((g) => {
        const rows = facts.filter((f) => FACT_META[f.key].group === g);
        if (!rows.length) return null;
        return (
          <section key={g} aria-label={g} className="space-y-3">
            {rows.length > 1 && <H>{g}</H>}
            {rows.map((f) => (
              <div key={f.key} className={cn("py-1", ["unknown", "needs_confirmation"].includes(f.state) ? "rounded-xl border border-line bg-paper p-3" : "")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-[0.85rem] text-muted-foreground">{FACT_META[f.key].label}</span>
                  {["unknown", "needs_confirmation", "not_provided"].includes(f.state) && <FactBadge s={f.state} />}
                </div>
                {edit?.key === f.key ? (
                  <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const result = dispatch({ t: "fact.edit", key: f.key, value: edit.value }); if (result) void result.then(ok => { if (ok) setEdit(null); }); else setEdit(null); }}>
                    <input aria-label={`Correct ${FACT_META[f.key].label}`} autoFocus className={inputCls} value={edit.value} onChange={(e) => setEdit({ key: f.key, value: e.target.value })} />
                    <Btn type="submit" variant="ink" className="px-4">Save</Btn>
                  </form>
                ) : (
                  <p className="mt-1 font-medium">{f.value ?? <span className="font-normal text-muted-foreground">Not known</span>}</p>
                )}
                {showSources && <details className="mt-1 text-[0.82rem] text-muted-foreground"><summary className="min-h-9 cursor-pointer py-2 text-moss hover:underline">Source and options<span className="sr-only"> for {FACT_META[f.key].label}</span></summary><div className="border-l border-line pl-3">
                <p className="mt-1 text-[0.82rem] text-muted-foreground">{f.source === "Sample record" ? "Saved record" : f.source} · {formatDay(f.date)}{f.note ? ` · ${f.note}` : ""}</p>
                {edit?.key !== f.key && f.key !== "goal" && (
                  <div className="mt-1 flex gap-2">
                    <button className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-[0.85rem] font-medium text-moss hover:bg-moss-soft" onClick={() => setEdit({ key: f.key, value: f.value ?? "" })}><Pencil className="h-3.5 w-3.5" aria-hidden />Edit</button>
                    <button className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-[0.85rem] text-muted-foreground hover:bg-secondary" onClick={() => dispatch({ t: "fact.edit", key: f.key, value: null })}><Trash2 className="h-3.5 w-3.5" aria-hidden />Remove</button>
                  </div>
                )}
                </div></details>}
              </div>
            ))}
          </section>
        );
      })}
      {(c.tasks.length > 0 || c.docs.length > 0) && <section aria-label="Next steps" className="space-y-3">
        <H>Next steps</H>
        {c.docs.length > 0 && <Hint>{milestoneNote(c)}</Hint>}
        {MILESTONES.map((m) => {
          const ts = c.tasks.filter((t) => t.milestone === m.id);
          if (!ts.length) return null;
          return (
            <div key={m.id}>
              <p className="text-[0.9rem] font-semibold">{m.label}</p>
              <ul className="mt-1 space-y-1">
                {ts.map((t) => (
                  <li key={t.id} className="flex items-start gap-2">
                    <button role="checkbox" aria-checked={t.state === "done"} aria-label={t.title} onClick={() => dispatch({ t: "task.toggle", id: t.id })} className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border", t.state === "done" ? "border-moss bg-moss text-white" : "border-input bg-paper")}>{t.state === "done" && <Check className="h-4 w-4" aria-hidden />}</button>
                    <span className={cn("text-[0.92rem]", t.state === "done" && "text-muted-foreground line-through")}>{t.title}{t.blocker && <Pill tone="warn" className="ml-2">{t.blocker}</Pill>}<span className="block text-[0.82rem] text-muted-foreground">{t.why}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>}
      <div className="flex flex-wrap gap-2">
        <Link href="/app/assets" className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-5 text-[0.95rem] font-semibold hover:bg-secondary">Add another record</Link>
        {onContinue && c.tasks.some(t => t.state === "open") && <Btn onClick={onContinue}>Continue</Btn>}
      </div>
    </div>
  );
}

// ─── Asset ─────────────────────────────────────────────────────────────────────────────────

export function AssetDetail({ a, c }: { a: Asset; c: Case }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ institution: a.institution, ref: "", owner: a.owner });
  const claim = c.claims.find((x) => x.assetId === a.id);
  const dup = a.duplicateOf ? c.assets.find((x) => x.id === a.duplicateOf) : null;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="display mt-1 text-[1.9rem]">{a.institution}</h2>
        <p className="text-muted-foreground">{CATEGORY_LABEL[a.category]}{a.ref ? ` · ${a.ref}` : ""}</p>
        <div className="mt-2 flex flex-wrap gap-2"><EvidenceBadge e={a.evidence} />{!a.confirmed && <Pill tone="warn">Not yet confirmed by you</Pill>}</div>
      </div>
      {c.backendId && c.kind === "estate" && <BackendAccess c={c} assetId={a.id} />}
      {dup && (
        <Card className="border-apricot/60 bg-[#fbf1e8]">
          <p className="font-medium">Are these the same holding?</p>
          <DuplicateComparison asset={a} other={dup} />
          <div className="mt-3 flex flex-wrap gap-2"><Btn variant="ink" onClick={() => dispatch({ t: "asset.dup", id: a.id, merge: true })}>Same. merge</Btn><Btn variant="quiet" onClick={() => dispatch({ t: "asset.dup", id: a.id, merge: false })}>Different. keep separate</Btn></div>
        </Card>
      )}
      <dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="text-[0.85rem] text-muted-foreground">Owner</dt><dd className="font-medium">{a.owner}</dd></div>
        <div><dt className="text-[0.85rem] text-muted-foreground">Nomination</dt><dd className="font-medium">{a.nomination === "recorded" ? "Recorded" : a.nomination === "none" ? "None recorded" : "Unknown"}</dd></div>
        <div className="sm:col-span-2">
          <dt className="text-[0.85rem] text-muted-foreground">Amount</dt>
          <dd>{a.amount ? <><b className="text-[1.2rem]">{money(a.amount.value)}</b><span className="block text-[0.9rem] text-ink/75">{a.amount.type} · {a.amount.asOf}. Not a current balance.</span></> : <span className="text-muted-foreground">Unknown. no reviewed amount yet</span>}</dd>
        </div>
        <div><dt className="text-[0.85rem] text-muted-foreground">Last checked</dt><dd className="font-medium">{a.lastChecked ? formatDay(a.lastChecked) : "Not checked yet"}</dd></div>
        <div><dt className="text-[0.85rem] text-muted-foreground">Next action</dt><dd className="font-medium">{a.next}</dd></div>
      </dl>
      <EvidenceExplorer c={c} assetId={a.id} />
      <div>
        <H>Source documents</H>
        {a.docIds.length ? <ul className="mt-2 space-y-1">{a.docIds.map((id) => { const d = c.docs.find((x) => x.id === id); return d ? <li key={id}><button className="text-moss underline underline-offset-4" onClick={() => dispatch({ t: "focus", focus: { type: "doc", id } })}>{d.name}</button></li> : null; })}</ul> : <Hint>None yet. A document is the strongest evidence.</Hint>}
      </div>
      <div className="flex flex-wrap gap-2">
        {!a.confirmed && <Btn onClick={() => dispatch({ t: "asset.confirm", id: a.id })}>Confirm this is {c.kind === "self" ? "mine" : "theirs"}</Btn>}
        {!a.docIds.length && <Btn variant="quiet" onClick={() => dispatch({ t: "choose", id: `a:linkStatement:${a.id}`, label: "Add document" })}>Add a sample statement</Btn>}
        {c.kind === "estate" && a.confirmed && (claim ? <Btn variant="ink" onClick={() => dispatch({ t: "focus", focus: { type: "claim", id: claim.id } })}>Open claim</Btn> : <Btn variant="ink" onClick={() => dispatch({ t: "claim.start", assetId: a.id })}>Start a claim</Btn>)}
        <Btn variant="quiet" onClick={() => setEditing((v) => !v)}>{editing ? "Close editor" : "Edit"}</Btn>
        <Btn variant="danger" onClick={() => dispatch({ t: "asset.remove", id: a.id })}>Remove</Btn>
      </div>
      {editing && (
        <form className="grid gap-3 rounded-2xl border border-line bg-paper p-4" onSubmit={(e) => { e.preventDefault(); const result = dispatch({ t: "asset.edit", id: a.id, patch: { institution: f.institution, owner: f.owner, ...(f.ref ? { ref: f.ref } : {}) } }); if (result) void result.then(ok => { if (ok) setEditing(false); }); else setEditing(false); }}>
          <label><span className="text-[0.85rem]">Institution</span><input className={inputCls} value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} /></label>
          <label><span className="text-[0.85rem]">Last 4 digits of the reference (never the full number)</span><input className={inputCls} inputMode="numeric" maxLength={4} value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value.replace(/\D/g, "") })} /></label>
          <label><span className="text-[0.85rem]">Owner</span><input className={inputCls} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></label>
          <label><span className="text-[0.85rem]">Nomination</span>
            <select className={inputCls} defaultValue={a.nomination} onChange={(e) => dispatch({ t: "asset.edit", id: a.id, patch: { nomination: e.target.value as Asset["nomination"] } })}>
              <option value="unknown">Unknown</option><option value="recorded">Recorded</option><option value="none">None recorded</option>
            </select></label>
          <Btn type="submit" variant="ink" className="justify-self-start">Save changes</Btn>
        </form>
      )}
      <div>
        <H>History</H>
        <ol className="mt-2 space-y-1 text-[0.9rem]">{[...a.history].reverse().map((h, i) => <li key={i} className="text-ink/80"><span className="text-muted-foreground">{formatDay(h.at)} · </span>{h.text}</li>)}</ol>
      </div>
    </div>
  );
}

// ─── Document review: original beside extracted fields ─────────────────────────────────────

export function DocDetail({ d, c, stacked }: { d: Doc; c: Case; stacked?: boolean }) {
  const [active, setActive] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const a = c.assets.find((x) => x.id === d.assetId);
  const field = d.fields.find((f) => f.id === active);
  const at = field ? d.text.indexOf(field.excerpt) : -1;
  const reviewed = d.fields.filter((f) => f.reviewed).length;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="display mt-1 text-[1.7rem]">{documentTitle(d.name)}</h2>
        <div className="mt-2 flex flex-wrap gap-2"><span className="text-sm text-muted-foreground">{d.kind}</span>{a && <button onClick={() => dispatch({ t: "focus", focus: { type: "asset", id: a.id } })}><Pill tone="ok">Linked to {a.institution}</Pill></button>}</div>
      </div>
      <details className="text-sm text-muted-foreground"><summary className="min-h-11 cursor-pointer py-2">File details</summary><p className="break-all">{d.name}</p></details>
      <SourceToRecord doc={d} asset={a} />
      {c.backendId && <DocumentVerification key={d.id} d={d} c={c} />}
      {d.state === "processing" && <Card role="status"><p className="font-medium">Reading this document…</p><Hint>Reading and extracting the document. Synthetic data only.</Hint></Card>}
      {d.state === "unreadable" && <Card><p className="font-medium">Keeper couldn’t read this file.</p><Hint>The text was too blurred. Try a clearer photo or the original PDF. </Hint></Card>}
      {d.state === "password" && <Card><p className="font-medium">This PDF is password-protected.</p><Hint>Keeper never asks for passwords. Remove the protection in your PDF viewer and add the unlocked copy.</Hint></Card>}
      {d.state === "duplicate" && <Card><p className="font-medium">This looks like a copy of a document you already added.</p><Hint>No second set of details was created.</Hint></Card>}
      {d.state === "ready" && (
        <div className={cn("grid gap-4", !stacked && "xl:grid-cols-2")}>
          <section aria-label="Source document">
            <H>Source document</H>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-white p-4 font-mono text-[0.85rem] leading-relaxed scroll-soft">
              {at >= 0 && field ? <>{d.text.slice(0, at)}<mark className="rounded bg-apricot/60 px-0.5 text-ink">{field.excerpt}</mark>{d.text.slice(at + field.excerpt.length)}</> : d.text}
            </pre>
          </section>
          <section aria-label="Extracted details">
            <H>Extracted details · {reviewed} of {d.fields.length} reviewed</H>
            <ul className="mt-2 space-y-2">
              {d.fields.map((f) => (
                <li key={f.id} className={cn("rounded-xl border bg-paper p-3", active === f.id ? "border-apricot" : "border-line")}>
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[0.85rem] text-muted-foreground">{f.label}</span>{f.reviewed ? <span className="text-[0.8rem] text-moss">{f.corrected ? "Corrected by you" : <><Check className="h-4 w-4" aria-hidden /><span className="sr-only">Reviewed</span></>}</span> : <Pill tone="warn">Needs your check</Pill>}</div>
                  {editing?.id === f.id ? (
                    <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const result = dispatch({ t: "doc.field", docId: d.id, fieldId: f.id, value: editing.value }); if (result) void result.then(ok => { if (ok) setEditing(null); }); else setEditing(null); }}>
                      <input aria-label={`Correct ${f.label}`} autoFocus className={inputCls} value={editing.value} onChange={(e) => setEditing({ id: f.id, value: e.target.value })} />
                      <Btn type="submit" variant="ink" className="px-4">Save</Btn>
                    </form>
                  ) : <p className="mt-1 font-medium">{f.value}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="min-h-9 rounded-full px-3 text-[0.85rem] font-medium text-moss hover:bg-moss-soft" onClick={() => setActive(active === f.id ? null : f.id)}>Show in original</button>
                    {!f.reviewed && <button className="min-h-9 rounded-full px-3 text-[0.85rem] font-medium text-moss hover:bg-moss-soft" onClick={() => dispatch({ t: "doc.field", docId: d.id, fieldId: f.id, reviewed: true })}>Looks right</button>}
                    <button className="min-h-9 rounded-full px-3 text-[0.85rem] font-medium text-moss hover:bg-moss-soft" onClick={() => setEditing({ id: f.id, value: f.value })}>Correct</button>
                  </div>
                </li>
              ))}
            </ul>
            {reviewed < d.fields.length && <Btn variant="quiet" className="mt-3" onClick={() => d.fields.filter((f) => !f.reviewed).forEach((f) => dispatch({ t: "doc.field", docId: d.id, fieldId: f.id, reviewed: true }))}>Everything else looks right</Btn>}
          </section>
        </div>
      )}
    </div>
  );
}

// ─── Claim ─────────────────────────────────────────────────────────────────────────────────

const REL_OPTS = ["Spouse", "Child", "Parent", "Sibling", "Executor or other"];
export function ClaimDetail({ cl, c }: { cl: Claim; c: Case }) {
  const [method, setMethod] = useState("In person at a branch");
  const [receipt, setReceipt] = useState("");
  const [submittedDate, setSubmittedDate] = useState("");
  const [reported, setReported] = useState(false);
  const [ack, setAck] = useState("");
  const [out, setOut] = useState<{ kind: Outcome; note: string; amount: string; date: string; documentId: string }>({ kind: "settled", note: "", amount: "", date: "", documentId: "" });
  const a = c.assets.find((x) => x.id === cl.assetId);
  if (!a) return null;
  const plan = claimPlan(a, cl);
  const step = claimStep(c, cl);
  const decls = cl.backend?.pack?.declarations || declarationsFor(a.institution, plan.path);
  const missing = [...plan.items.filter((i) => i.required && !cl.have[i.id]).map((i) => i.label), ...(decls.some((d) => !cl.declarations.includes(d.id)) ? ["Confirm the declarations"] : [])];
  const edit = (e: Parameters<typeof editClaim>[2]) => dispatch({ t: "claim.edit", id: cl.id, edit: e });
  const locked = !!cl.submitted;
  const ap = cl.approval;
  const destination = claimDestination(a.category, a.institution, plan.procedure?.sourceUrl);
  const handoff = `${a.institution}. ${plan.label ?? "claim package"}\nDocuments: ${plan.items.filter((i) => cl.have[i.id]).map((i) => i.label).join("; ")}\nSubmit: ${plan.procedure?.whereToSubmit ?? "Ask the institution where to submit."}`;
  return (
    <div className="space-y-5">
      <div>
        <Hint>Whose information: <b className="text-ink">{c.name}</b></Hint>
        <h2 className="display mt-1 text-[1.9rem]">{a.institution} claim</h2>
        <p className="text-muted-foreground">{CATEGORY_LABEL[a.category]}{a.ref ? ` · ${a.ref}` : ""} · <EvidenceBadge e={a.evidence} /></p>
      </div>
      {cl.backend && !cl.backend.entitled && <BackendAccess c={c} assetId={a.id} />}
      {cl.backend?.approval && <BackendPackDownload claimId={cl.id} />}
      <ClaimTimeline step={step} />
      <DurableClaimReview c={c} claimId={cl.id} />
      <details className="rounded-2xl border border-line bg-paper p-4"><summary className="min-h-11 cursor-pointer text-sm font-semibold text-moss">Explore this claim’s evidence map</summary><EvidenceExplorer c={c} assetId={a.id} /></details>
      <p className="text-sm font-medium text-moss">{cl.backend?.statusLabel || (cl.outcome ? OUTCOME_LABEL[cl.outcome.kind] : cl.submitted ? "Submission preview" : ap?.state === "requested" ? "Waiting for approval" : cl.prepared ? "Ready for review" : "Needs your input")}</p>

      <Card>
        <H>Claimant and authority</H>
        <p className="mt-2 text-[0.95rem]">Claimant: <b>{cl.claimant.name}</b> · relationship <select aria-label="Your relationship" disabled={locked} className="mx-1 min-h-9 rounded-lg border border-input bg-paper px-2" value={cl.claimant.relation} onChange={(e) => edit({ claimant: { relation: e.target.value } })}><option value="">Not stated</option>{REL_OPTS.map((r) => <option key={r}>{r}</option>)}</select></p>
        <p className="mt-2"><span className="text-sm text-muted-foreground">Authority is checked separately from relationship.</span></p>
        <Hint>{a.institution} checks identity and authority. A relationship or death certificate alone does not establish entitlement.</Hint>
      </Card>

      <Card>
        <H>Which claim this is</H>
        {plan.decision.kind === "ask" ? (
          <div className="mt-2 space-y-2">
            <p className="font-medium">{QUESTION_TEXT[plan.decision.question].text}</p>
            <div className="flex flex-wrap gap-2">
              {QUESTION_TEXT[plan.decision.question].options.map((o) => (
                <Btn key={o.value} variant="quiet" disabled={locked} onClick={() => {
                  const q = plan.decision.kind === "ask" ? plan.decision.question : "nominee";
                  if (q === "relationship") { edit({ claimant: { relation: o.label } }); return; }
                  edit({ situation: q === "amount" ? { amountBand: o.value } : q === "nominee" ? { nominee: o.value as Claim["situation"]["nominee"] } : q === "jointHolder" ? { jointHolder: o.value as Claim["situation"]["jointHolder"] } : {} });
                }}>{o.label}</Btn>
              ))}
            </div>
          </div>
        ) : plan.decision.kind === "review" ? (
          <p className="mt-2 text-[0.95rem]"><Pill tone="warn">Manual enquiry</Pill> {plan.decision.reason}</p>
        ) : (
          <div className="mt-2 space-y-1">
            <p className="text-[1.05rem] font-semibold">{plan.label}</p>
            <p className="text-[0.95rem] text-ink/80">{plan.decision.procedure.paths[plan.decision.path]!.explanation}</p>
            <p className="text-[0.88rem] text-muted-foreground">Why: {plan.decision.reasons.join(" ")}</p>
          </div>
        )}
        {plan.procedure && (
          <p className="mt-3 text-[0.85rem] text-muted-foreground">Requirements source: <a className="text-moss underline underline-offset-4" target="_blank" rel="noopener noreferrer" href={plan.procedure.sourceUrl}>{plan.procedure.authority}<ExternalLink className="ml-1 inline h-3 w-3" aria-hidden /></a> · version {plan.procedure.version}, checked {plan.procedure.checkedOn}. {plan.procedure.timeline.days} days from complete documents.</p>
        )}
      </Card>

      <Card>
        <H>Requirements and documents</H>
        <ul className="mt-3 space-y-2">
          {plan.items.map((i) => (
            <li key={i.id}>
              <label className="flex items-start gap-3"><input type="checkbox" disabled={locked} className="mt-1 h-5 w-5 accent-[#526653]" checked={!!cl.have[i.id]} onChange={(e) => edit({ have: { [i.id]: e.target.checked } })} />
                <span><span className="font-medium">{i.label}</span> <span className="text-[0.82rem] text-muted-foreground">{i.required ? "Required" : "Optional"}</span>{i.note && <span className="block text-[0.85rem] text-muted-foreground">{i.note}</span>}</span></label>
            </li>
          ))}
          {!plan.items.length && <li className="text-muted-foreground">Answer the question above to see the requirements.</li>}
        </ul>
        {plan.items.some((i) => /form|annex|bond/i.test(i.label)) && <Hint>Forms named here are the institution’s own. Keeper doesn’t generate official forms; use the institution’s current version.</Hint>}
      </Card>

      {plan.decision.kind !== "ask" && (
        <Card>
          <H>Declarations</H>
          <ul className="mt-3 space-y-2">{decls.map((d) => (
            <li key={d.id}><label className="flex items-start gap-3"><input type="checkbox" disabled={locked} className="mt-1 h-5 w-5 accent-[#526653]" checked={cl.declarations.includes(d.id)} onChange={(e) => edit({ declarations: e.target.checked ? [...cl.declarations, d.id] : cl.declarations.filter((x) => x !== d.id) })} /><span>{d.text}</span></label></li>
          ))}</ul>
        </Card>
      )}

      <Card>
        <H>Your approval</H>
        {!cl.prepared && !ap && <p className="mt-2 text-[0.95rem]">Not ready. Still needed: {missing.length ? missing.join("; ") : "answer the question above"}.</p>}
        {cl.prepared && !ap && <div className="mt-2"><p className="text-[0.95rem]">Everything required is in. Review exactly what would be sent, then approve.</p><Btn className="mt-3" onClick={() => dispatch({ t: "claim.request", id: cl.id })}>Review package</Btn></div>}
        {ap?.state === "invalidated" && <div className="mt-2"><Pill tone="warn">Earlier approval cancelled. the package changed</Pill>{cl.prepared && <div><Btn className="mt-3" onClick={() => dispatch({ t: "claim.request", id: cl.id })}>Review the updated package</Btn></div>}</div>}
        {ap && (ap.state === "requested" || ap.state === "approved" || ap.state === "used") && (
          <div className="mt-2 space-y-3 text-[0.95rem]">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div><dt className="text-[0.82rem] text-muted-foreground">Exact action</dt><dd className="font-medium">{cl.backend ? "Approve the package for your own submission" : "Submit the " + (plan.label?.toLowerCase() ?? "claim") + " package"}</dd></div>
              <div><dt className="text-[0.82rem] text-muted-foreground">Recipient</dt><dd className="font-medium">{ap.recipient}</dd></div>
              <div><dt className="text-[0.82rem] text-muted-foreground">Submission channel</dt><dd className="font-medium">{ap.channel}</dd></div>

            </dl>
            <div><p className="text-[0.82rem] text-muted-foreground">Included</p><ul className="list-disc pl-5">{ap.includes.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><p className="text-[0.82rem] text-muted-foreground">Declarations</p><ul className="list-disc pl-5">{ap.declarations.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <p className="text-ink/80"><b>What happens next:</b> {ap.state === "requested" ? "Nothing is sent. After you approve, you submit it yourself. Any change to the package cancels the approval." : ap.state === "approved" ? "Approved. Submit it yourself, then record how you submitted it. Keeper sends nothing." : "Prepared for your submission."}</p>
            {ap.state === "requested" && <div className="flex flex-wrap gap-2"><Btn onClick={() => dispatch({ t: "claim.approve", id: cl.id })}>Approve package</Btn><Btn variant="quiet" onClick={() => dispatch({ t: "claim.cancel", id: cl.id })}>Cancel</Btn></div>}
            {ap.state === "approved" && !cl.submitted && (
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="How you will submit" className={cn(inputCls, "w-auto")} value={method} onChange={(e) => setMethod(e.target.value)}><option>In person at a branch</option><option>By post or courier</option><option>On the institution’s own site</option></select>
                {cl.backend && <div className="w-full space-y-2"><label className="block text-sm">Date you submitted<input type="date" className={inputCls} value={submittedDate} onChange={e => setSubmittedDate(e.target.value)} /></label><label className="block text-sm">Receipt or reference, if provided<input className={inputCls} maxLength={60} value={receipt} onChange={e => setReceipt(e.target.value)} /></label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={reported} onChange={e => setReported(e.target.checked)} />I submitted this package myself.</label></div>}
                <Btn variant="ink" disabled={!!cl.backend && (!reported || !submittedDate)} onClick={() => dispatch({ t: "claim.submit", id: cl.id, method, date: submittedDate, receiptRef: receipt })}>{cl.backend ? "Record my submission" : "Preview submission step"}</Btn>
              </div>
            )}
          </div>
        )}
      </Card>

      {(ap?.state === "approved" || cl.submitted) && <OfficialHandoff
        title={a.institution + " · claim handoff"}
        url={destination.url}
        institutionSpecific={destination.institutionSpecific}
        instruction={plan.procedure?.whereToSubmit ?? "Contact the institution to confirm its current submission channel and required documents."}
      />}
      {cl.submitted && <FollowUpChoice key={cl.id} c={c} target={"claim:" + cl.id} resolved={!!cl.outcome && !["partially_settled", "unresolved_dispute"].includes(cl.outcome.kind) && !cl.backend?.remainderTracked} />}
      {cl.submitted && (
        <Card>
          <H>Submission and follow-up</H>
          <dl className="mt-2 grid gap-2 text-[0.95rem] sm:grid-cols-2">
            <div><dt className="text-[0.82rem] text-muted-foreground">Method</dt><dd className="font-medium">{cl.submitted.method}{cl.backend ? " (recorded by you)" : " (preview)"}</dd></div>
            <div><dt className="text-[0.82rem] text-muted-foreground">Reference</dt><dd className="font-mono">{cl.submitted.ref}</dd></div>
            <div><dt className="text-[0.82rem] text-muted-foreground">Last confirmed update</dt><dd className="font-medium">{formatDay(cl.lastConfirmed)}</dd></div>
            <div><dt className="text-[0.82rem] text-muted-foreground">Next follow-up</dt><dd className="font-medium">{cl.nextFollowUp ? formatDay(cl.nextFollowUp) : "Not set"}</dd></div>
          </dl>
          <div className="mt-3 rounded-xl bg-secondary p-3 text-[0.9rem]"><b>For a real claim. handoff package</b><pre className="mt-1 whitespace-pre-wrap font-sans">{handoff}</pre><Btn variant="quiet" className="mt-2 min-h-9" onClick={() => navigator.clipboard?.writeText(handoff)}>Copy package summary</Btn></div>
          {!cl.acknowledged && !cl.outcome && (
            <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const result = dispatch({ t: "claim.ack", id: cl.id, note: ack }); if (result) void result.then(ok => { if (ok) setAck(""); }); else setAck(""); }}>
              <input aria-label="Acknowledgement note or reference from the institution" className={cn(inputCls, "flex-1")} placeholder="Receipt or note from the institution (optional)" value={ack} onChange={(e) => setAck(e.target.value)} />
              <Btn type="submit" variant="quiet">Record that they acknowledged it</Btn>
            </form>
          )}
          {!cl.outcome && (
            <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); dispatch({ t: "claim.outcome", id: cl.id, kind: out.kind, note: out.note, amount: out.amount, date: out.date, documentId: out.documentId }); }}>
              <select aria-label="Outcome" className={cn(inputCls, "w-auto")} value={out.kind} onChange={(e) => setOut({ ...out, kind: e.target.value as Outcome })}>{Object.entries(OUTCOME_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <input aria-label="Outcome note" className={cn(inputCls, "flex-1")} placeholder="Evidence or note (e.g. letter dated…)" value={out.note} onChange={(e) => setOut({ ...out, note: e.target.value })} />
              {cl.backend && <details className="w-full" open={out.kind === "partially_settled"}><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-moss">Outcome evidence</summary><div className="grid gap-2 sm:grid-cols-2"><label className="text-sm">Amount confirmed by the institution<input type="number" min="0" step="0.01" className={inputCls} value={out.amount} onChange={e => setOut({ ...out, amount: e.target.value })} /></label><label className="text-sm">Outcome date<input type="date" className={inputCls} value={out.date} onChange={e => setOut({ ...out, date: e.target.value })} /></label><label className="text-sm sm:col-span-2">Supporting document<select className={inputCls} value={out.documentId} onChange={e => setOut({ ...out, documentId: e.target.value })}><option value="">No document selected</option>{c.docs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label></div></details>}
              <Btn type="submit" variant="quiet">Record outcome</Btn>
            </form>
          )}
          {cl.outcome && <p className="mt-3"><Pill tone={cl.outcome.kind === "settled" || cl.outcome.kind === "transferred" ? "ok" : "warn"}>{OUTCOME_LABEL[cl.outcome.kind]}</Pill> <span className="text-[0.9rem] text-muted-foreground">{formatDay(cl.outcome.at)}{cl.outcome.note ? ` · ${cl.outcome.note}` : ""}</span></p>}
        </Card>
      )}
    </div>
  );
}

// ─── Family record ─────────────────────────────────────────────────────────────────────────

export function FamilyView({ c }: { c: Case }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [nc, setNc] = useState({ name: "", relation: "" });
  const gaps = [...c.tasks.filter((t) => t.state === "open" && (t.milestone === "review" || t.milestone === "prepare" || /Find out/.test(t.title))).map((t) => t.title), ...c.assets.filter((a) => a.nomination === "unknown").map((a) => `Nomination unknown on ${a.institution}`)];
  const contact = c.contacts.find((k) => k.id === preview);
  return (
    <div className="space-y-6">
      <div>
        <Hint>Whose information: <b className="text-ink">{c.name}</b></Hint>
        <h2 className="display mt-1 text-[2rem]">Family record</h2>
        <p className="mt-2 max-w-[44rem] text-ink/80">Assets, papers and instructions for your family. This does not replace a will.</p>
        <p className="mt-2 text-[0.9rem] text-muted-foreground">Last reviewed: {c.family.reviewedAt ? formatDay(c.family.reviewedAt) : "not yet"} · Review preference: {c.family.cadence ?? "not set"} · <button className="text-moss underline underline-offset-4" onClick={() => dispatch({ t: "family.set", reviewed: true })}>Mark reviewed today</button></p>
      </div>
      <FamilyConnections c={c} />
      <Card>
        <H>Known assets</H>
        {c.assets.length ? <ul className="mt-3 divide-y divide-line">{c.assets.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><span><b>{a.institution}</b> <span className="text-muted-foreground">· {CATEGORY_LABEL[a.category]}</span></span><span className="flex gap-2"><EvidenceBadge e={a.evidence} /><Pill tone={a.nomination === "unknown" ? "warn" : "plain"}>Nominee: {a.nomination === "recorded" ? "recorded" : a.nomination === "none" ? "none" : "unknown"}</Pill></span></li>)}</ul> : <Hint>No assets recorded yet. Tell Keeper, or add one in Assets.</Hint>}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <H>Important documents</H>
          {c.docs.filter((d) => d.state === "ready").length ? <ul className="mt-2 list-disc pl-5">{c.docs.filter((d) => d.state === "ready").map((d) => <li key={d.id}>{d.name}</li>)}</ul> : <Hint>None added yet.</Hint>}
          <p className="mt-2 text-[0.92rem]">Kept: <b>{c.facts.docs_where?.value ?? "not recorded"}</b></p>
        </Card>
        <Card>
          <H>Practical instructions</H>
          <textarea aria-label="Practical instructions" className={cn(inputCls, "mt-2 min-h-24 py-2")} value={draft ?? c.family.instructions} onChange={(e) => setDraft(e.target.value)} />
          <Btn variant="quiet" className="mt-2 min-h-9" disabled={draft === null} onClick={() => { const result = dispatch({ t: "family.set", instructions: draft ?? "" }); if (result) void result.then(ok => { if (ok) setDraft(null); }); else setDraft(null); }}>Save instructions</Btn>
        </Card>
      </div>
      <Card>
        <H>Trusted contacts</H>
        <Hint>Preview the intended access. Sharing is not connected, and a trusted contact is not an heir.</Hint>
        <ul className="mt-3 space-y-3">
          {c.contacts.map((k) => (
            <li key={k.id} className="rounded-xl border border-line bg-paper p-3">
              <p className="font-semibold">{k.name} <span className="font-normal text-muted-foreground">· {k.relation}</span></p>
              <fieldset className="mt-2"><legend className="text-[0.85rem] text-muted-foreground">Preview scope for {k.name}</legend>
                <div className="mt-1 grid gap-1 sm:grid-cols-2">{(Object.keys(k.sees) as (keyof typeof k.sees)[]).map((key) => (
                  <label key={key} className="flex min-h-9 items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#526653]" checked={k.sees[key]} onChange={() => dispatch({ t: "contact.toggle", id: k.id, key })} />{cap(key)}</label>
                ))}</div></fieldset>
              <Btn variant="quiet" className="mt-2 min-h-9" onClick={() => setPreview(preview === k.id ? null : k.id)}>{preview === k.id ? "Hide preview" : `Preview ${k.name}’s view`}</Btn>
            </li>
          ))}
          {!c.contacts.length && <li className="text-muted-foreground">No trusted contacts yet.</li>}
        </ul>
        {contact && (
          <div className="mt-3 rounded-xl border-2 border-dashed border-moss/50 bg-moss-soft/50 p-4" role="region" aria-label={`Preview of ${contact.name}'s view`}>
            <p className="mb-3 font-semibold">{contact.name}’s access preview</p>
            <ContactScope contact={contact} />
            {(Object.keys(contact.sees) as (keyof typeof contact.sees)[]).some((x) => contact.sees[x]) ? (
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {contact.sees.assets && <li>{CONTACT_VIEW.assets}: {c.assets.map((a) => `${a.institution} (${CATEGORY_LABEL[a.category].toLowerCase()})`).join(", ") || "none yet"}</li>}
                {contact.sees.documents && <li>{CONTACT_VIEW.documents}: {c.docs.filter((d) => d.state === "ready").map((d) => d.name).join(", ") || "none yet"}; kept {c.facts.docs_where?.value ?? "Not set"}</li>}
                {contact.sees.instructions && <li>{CONTACT_VIEW.instructions}: “{c.family.instructions || "none written"}”</li>}
                {contact.sees.claims && <li>{CONTACT_VIEW.claims}</li>}
              </ul>
            ) : <p className="mt-1">Nothing. You haven’t chosen anything to share.</p>}
            <p className="mt-2 text-[0.88rem]">Balances, account numbers and document contents stay hidden. Nothing is shared by this preview.</p>
          </div>
        )}
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (nc.name.trim()) { const result = dispatch({ t: "contact.add", name: nc.name.trim(), relation: nc.relation.trim() }); if (result) void result.then(ok => { if (ok) setNc({ name: "", relation: "" }); }); else setNc({ name: "", relation: "" }); } }}>
          <input aria-label="Contact name" className={cn(inputCls, "w-44")} placeholder="Name" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
          <input aria-label="Relationship" className={cn(inputCls, "w-44")} placeholder="Relationship" value={nc.relation} onChange={(e) => setNc({ ...nc, relation: e.target.value })} />
          <Btn type="submit" variant="quiet">Add contact</Btn>
        </form>
      </Card>
      <Card>
        <H>Still missing</H>
        {gaps.length ? <ul className="mt-2 list-disc pl-5">{gaps.map((g) => <li key={g}>{g}</li>)}</ul> : <Hint>Nothing flagged right now.</Hint>}
      </Card>
    </div>
  );
}

// ─── Discovery plan ────────────────────────────────────────────────────────────────────────

const PLAN_STATE: Record<PlanSource["state"], string> = {
  needs_info: "Needs your input", awaiting_consent: "Needs permission", ready: "Ready for review", in_progress: "Reviewing records",
  completed: "Result recorded", unavailable: "Not connected", planned: "Not connected",
};
const TYPE_LABEL: Record<PlanSource["type"], string> = { uploaded: "Uploaded-record analysis", connected: "Institution connection", guided: "Guided official search", manual: "Manual enquiry" };

export function PlanView({ c }: { c: Case }) {
  const [rec, setRec] = useState<Record<string, string>>({});
  const [scopes, setScopes] = useState<Record<string, string>>({});
  if (!c.plan.length) return <Card><H>Discovery plan</H><Hint>Tell Keeper about your situation under “Find my assets” and it will build a plan here.</Hint></Card>;
  return (
    <div className="space-y-3">
      <Hint>Guided searches open official sites. A result covers only that source and the details you used.</Hint>
      {c.plan.map((p) => (
        <Card key={p.id}>
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{p.label}</p><p className="text-[0.82rem] text-muted-foreground">{TYPE_LABEL[p.type]}</p></div><Pill tone={p.state === "ready" ? "ok" : p.state === "awaiting_consent" || p.state === "needs_info" ? "warn" : p.state === "completed" ? "moss" : "plain"}>{PLAN_STATE[p.state]}</Pill></div>
          {p.note !== "This source is not connected." && <p className="mt-2 text-[0.92rem] text-ink/80">{p.note}</p>}
          {p.history && p.history.length > 1 && <details className="mt-2"><summary>Earlier search outcomes ({p.history.length - 1})</summary>{p.history.slice(1).map((entry, i) => <p key={i} className="mt-2 text-sm">{entry}</p>)}</details>}
          {p.result && <><p className="mt-2 rounded-lg bg-secondary p-2 text-[0.9rem]">{p.result}</p><FollowUpChoice key={p.id} c={c} target={"search:" + p.id} /></>}
          {p.type === "guided" && ["ready", "completed"].includes(p.state) && (
            <div className="mt-3 space-y-2">
              {p.url && <a className="inline-flex items-center gap-1 text-moss underline underline-offset-4" target="_blank" rel="noopener noreferrer" href={p.url}>Continue on the official site<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>}
              <p className="text-sm text-muted-foreground">Run the search there, then return here. What did you find?</p>
              <div className="flex flex-wrap gap-2">
                <select aria-label={`What you found on ${p.label}`} className={cn(inputCls, "w-auto")} value={rec[p.id] ?? ""} onChange={(e) => setRec({ ...rec, [p.id]: e.target.value })}><option value="">Record the outcome…</option>{Object.entries(SEARCH_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <input aria-label={`Search scope for ${p.label}`} className={inputCls} placeholder="What you checked (use synthetic details; no full identifiers)" maxLength={500} value={scopes[p.id] || ""} onChange={e => setScopes({ ...scopes, [p.id]: e.target.value })} />
                <Btn variant="quiet" disabled={!rec[p.id] || (scopes[p.id] || "").trim().length < 3} onClick={() => dispatch({ t: "plan.record", id: p.id, outcome: rec[p.id] as SearchOutcome, scope: scopes[p.id].trim(), searchedAt: new Date().toISOString(), requestId: crypto.randomUUID(), result: `${SEARCH_LABEL[rec[p.id] as SearchOutcome]}. Scope: ${scopes[p.id]}. Self-reported; this search does not cover other sources.` })}>Save search result</Btn>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── The side panel ────────────────────────────────────────────────────────────────────────

export function Panel({ c, onContinue }: { c: Case; onContinue?: () => void }) {
  const f = c.focus ?? { type: "know" as const };
  const asset = f.type === "asset" ? c.assets.find((x) => x.id === f.id) : null;
  const doc = f.type === "doc" ? c.docs.find((x) => x.id === f.id) : null;
  const claim = f.type === "claim" ? c.claims.find((x) => x.id === f.id) : null;
  const tabs: [typeof f.type, string][] = [["know", "Details"], ["plan", "Discovery"], ["family", "Family"]];
  const link = f.type === "asset" ? "/app/assets" : f.type === "doc" ? "/app/documents" : f.type === "claim" ? "/app/claims" : f.type === "family" ? "/app/family" : f.type === "plan" ? "/app/assets" : null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Details" className="flex w-full gap-1 border-b border-line">
          {tabs.map(([t, l]) => <button key={t} role="tab" aria-selected={f.type === t} onClick={() => dispatch({ t: "focus", focus: { type: t } })} className={cn("min-h-11 flex-1 border-b-2 px-2 text-[0.85rem] font-medium transition-colors", f.type === t ? "border-moss text-ink" : "border-transparent text-muted-foreground hover:text-ink")}>{l}</button>)}
        </div>
        {link && <Link href={link} className="text-[0.85rem] font-medium text-moss underline underline-offset-4">Open full view</Link>}
      </div>
      {f.type === "know" && <KnowPanel c={c} onContinue={onContinue} />}
      {f.type === "plan" && <PlanView c={c} />}
      {f.type === "family" && <FamilyView c={c} />}
      {asset && <AssetDetail a={asset} c={c} />}
      {doc && <DocDetail d={doc} c={c} stacked />}
      {claim && <ClaimDetail cl={claim} c={c} />}
    </div>
  );
}
