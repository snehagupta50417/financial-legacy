"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Mic, Paperclip } from "lucide-react";
import { Wordmark, FamilyScene, Pill, Btn } from "./ui";
import { cn } from "@/lib/utils";

const NAV = [
  ["How it works", "#how"], ["Find assets", "#find"], ["Prepare for family", "#prepare"], ["Claims", "#claims"], ["Security", "#control"],
] as const;

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-ivory/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-3">
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-7 text-[0.95rem] lg:flex">
          {NAV.map(([l, h]) => <a key={h} href={h} className="rounded px-1 py-2 text-ink/80 hover:text-ink hover:underline decoration-apricot decoration-2 underline-offset-8">{l}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/signin" className="hidden min-h-11 items-center rounded-full px-4 text-[0.95rem] font-medium hover:bg-secondary sm:inline-flex">Sign in</Link>
          <Link href="/signin" className="inline-flex min-h-11 items-center rounded-full bg-apricot px-5 text-[0.95rem] font-semibold text-ink hover:bg-[#dd9566]">Get started</Link>
          <details className="relative lg:hidden">
            <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-paper text-[0.9rem] font-medium" aria-label="Menu">Menu</summary>
            <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-line bg-paper p-2 shadow-lg">
              {NAV.map(([l, h]) => <a key={h} href={h} className="block rounded-xl px-4 py-3 hover:bg-secondary">{l}</a>)}
              <Link href="/signin" className="block rounded-xl px-4 py-3 font-medium hover:bg-secondary">Sign in</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function Bubble({ who, children }: { who: "you" | "keeper"; children: React.ReactNode }) {
  return (
    <div className={cn("max-w-[88%] rounded-2xl px-4 py-3 text-[0.95rem] leading-relaxed", who === "you" ? "ml-auto rounded-br-md bg-ink text-ivory" : "rounded-bl-md border border-line bg-paper")}>
      {children}
    </div>
  );
}

function DemoWindow() {
  return (
    <div className="settle overflow-hidden rounded-[1.4rem] border border-line bg-paper shadow-[0_30px_60px_-30px_rgba(36,40,36,0.35)]" aria-label="Demo conversation with Keeper">
      <div className="flex items-center justify-between border-b border-line bg-secondary/60 px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden><i className="h-2.5 w-2.5 rounded-full bg-[#d9cfba]" /><i className="h-2.5 w-2.5 rounded-full bg-[#d9cfba]" /><i className="h-2.5 w-2.5 rounded-full bg-[#d9cfba]" /></div>
        <Pill tone="warn">Demo · synthetic conversation</Pill>
      </div>
      <div className="grid md:grid-cols-[minmax(0,1fr)_13rem]">
        <div className="space-y-3 p-4 md:p-5">
          <div className="text-[0.8rem] font-medium text-muted-foreground">Estate of a parent (sample)</div>
          <Bubble who="you">My father passed away. We know about his bank account, but not his investments.</Bubble>
          <Bubble who="keeper">We can work through both. Do you want to begin with the bank claim or investigate the investments?</Bubble>
          <div className="flex flex-wrap gap-2" aria-label="Suggested replies (demo)">
            {["Start the bank claim", "Look for investments", "Help me decide"].map((c) => <span key={c} className="inline-flex min-h-10 items-center rounded-full border border-moss/40 bg-moss-soft px-4 text-[0.9rem] font-medium">{c}</span>)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-3xl border border-line bg-ivory p-1.5 pl-4">
            <span className="min-w-0 flex-1 truncate text-[0.9rem] text-muted-foreground">Type, or tap the microphone…</span>
            <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="listening inline-flex h-11 items-center gap-2 rounded-full bg-apricot px-4 text-[0.9rem] font-semibold"><Mic className="h-4 w-4" aria-hidden /> Talk to Keeper</span>
          </div>
        </div>
        <aside className="border-t border-line bg-ivory/60 p-4 md:border-l md:border-t-0" aria-label="What Keeper noted">
          <div className="eyebrow mb-2">What Keeper knows</div>
          <dl className="space-y-2.5 text-[0.88rem]">
            {[["Their relation to you", "Child · you said"], ["Known asset", "Bank account · you said"], ["Investments", "Unknown · follow-up added"], ["Authority", "To review before any claim"]].map(([k, v]) => (
              <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="paper-grain relative overflow-hidden">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 pb-14 pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pb-20 lg:pt-10">
        <div>
          <p className="eyebrow settle">Financial discovery · Preparation · Claims</p>
          <h1 className="display settle mt-4 text-[clamp(2.4rem,5vw,3.9rem)]">
            Know what you own.<br /><span className="italic text-moss">Help your family know what comes next.</span>
          </h1>
          <p className="settle mt-4 max-w-[34rem] text-[1.08rem] leading-relaxed text-ink/80">
            Talk to Keeper to discover financial assets, prepare your financial affairs for the end of life, or navigate asset claims after a loved one dies.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signin" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-apricot px-7 font-semibold text-ink hover:bg-[#dd9566]">Get started <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            <a href="#stories" className="inline-flex min-h-12 items-center rounded-full border border-ink/25 bg-paper px-7 font-semibold hover:bg-secondary">See Keeper in action</a>
          </div>
          <ul className="mt-7 grid gap-3 text-[0.92rem] sm:grid-cols-3" aria-label="Three things Keeper helps with">
            {[["Find my assets", "Trace accounts, deposits, investments and insurance you may have lost track of."], ["Prepare for my family", "Organise assets, documents and instructions so they know where to begin."], ["After a death", "Organise the case and prepare each claim, one institution at a time."]].map(([t, d]) => (
              <li key={t} className="border-t-2 border-apricot pt-3"><strong className="block font-semibold">{t}</strong><span className="text-ink/70">{d}</span></li>
            ))}
          </ul>
        </div>
        <DemoWindow />
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="border-y border-line bg-paper">
      <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-5 py-20 lg:grid-cols-[1fr_1.1fr]">
        <FamilyScene variant="table" className="w-full rounded-3xl" />
        <div>
          <p className="eyebrow">The problem</p>
          <h2 className="display mt-3 text-[clamp(2rem,4vw,3.1rem)]">A financial life gets scattered. Families are left piecing it together.</h2>
          <ul className="mt-6 space-y-3 text-[1.02rem] text-ink/85">
            {["Old accounts at banks you stopped using, under a name or address that has since changed.", "Investments started through an employer and never revisited.", "Policies and statements in different drawers, apps and email inboxes.", "Nomination details that are missing, outdated, or nobody remembers.", "After a death, every institution has its own claim steps — and the family is learning them while grieving."].map((t) => (
              <li key={t} className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-moss" aria-hidden />{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Introduction() {
  return (
    <section id="how" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-20">
      <p className="eyebrow">One conversation</p>
      <h2 className="display mt-3 max-w-[18ch] text-[clamp(2rem,4vw,3.1rem)]">One conversation. A clearer financial picture.</h2>
      <p className="mt-4 max-w-[40rem] text-ink/80">Speak or type naturally. As you talk, Keeper turns what you say into structured records, asks the next useful question, and remembers what it already has.</p>
      <div className="mt-10 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <div className="rounded-2xl border border-line bg-paper p-5"><div className="eyebrow">You say</div><p className="mt-2 text-[1.05rem]">“There was an HDFC account from my first job, and my father had an LIC policy.”</p></div>
        <div className="hidden items-center md:flex" aria-hidden><ArrowRight className="text-apricot" /></div>
        <div className="rounded-2xl border border-line bg-paper p-5"><div className="eyebrow">Keeper records</div><ul className="mt-2 space-y-1.5 text-[0.95rem]"><li><b>HDFC Bank</b> · bank account · <Pill>Self-declared</Pill></li><li><b>LIC of India</b> · insurance · <Pill>Self-declared</Pill></li><li className="text-muted-foreground">Owner of the LIC policy: needs confirmation</li></ul></div>
        <div className="hidden items-center md:flex" aria-hidden><ArrowRight className="text-apricot" /></div>
        <div className="rounded-2xl border border-line bg-paper p-5"><div className="eyebrow">Then it asks</div><p className="mt-2 text-[1.05rem]">“Is a nominee recorded on the policy?”</p><p className="mt-2 text-[0.88rem] text-muted-foreground">One question at a time, with a reason if you ask.</p></div>
      </div>
    </section>
  );
}

type Tone = "ok" | "warn" | "plain";
interface Story { id: string; tab: string; anchor: string; quote: string; chat: ["you" | "keeper", string][]; view: { title: string; rows: [string, string, Tone][]; note: string } }
const STORIES: Story[] = [
  {
    id: "find", tab: "Find", anchor: "find", quote: "I changed jobs and cities. I’ve lost track of some investments.",
    chat: [["keeper", "Let’s trace them. Which banks, fund houses or insurers do you remember? Rough names are fine."], ["you", "An HDFC account, and Mirae funds I started through my first employer."], ["keeper", "Noted both. Two searches are ready for you to run on official sites. I’ll prepare exactly what to enter."]],
    view: { title: "Discovery plan", rows: [["Records you upload", "Needs information", "plain"], ["RBI UDGAM · unclaimed bank deposits", "Awaiting your permission", "warn"], ["SEBI MITRA · inactive fund folios", "Awaiting your permission", "warn"], ["Connected sources", "Unavailable in this prototype", "plain"]], note: "A search that finds nothing only tells us about that site and the details you gave." },
  },
  {
    id: "prepare", tab: "Prepare", anchor: "prepare", quote: "I want to put my financial affairs in order before the end of life.",
    chat: [["keeper", "I’ll help you build a record your family can use. It doesn’t replace a will. Where are your important papers kept?"], ["you", "Mostly in the blue folder at home. The LIC policy is in my locker."], ["keeper", "Saved. Have you named nominees on your accounts and policies?"]],
    view: { title: "Family record", rows: [["3 assets noted", "Self-declared", "plain"], ["Where papers are kept", "Blue folder · bank locker", "ok"], ["Nominees", "To check · task added", "warn"], ["Trusted contact: Anita", "Sees nothing until you choose", "plain"]], note: "Last reviewed: today. A trusted contact is not an heir." },
  },
  {
    id: "after", tab: "After a death", anchor: "claims", quote: "My mother died. I need help finding and claiming her assets.",
    chat: [["keeper", "We’ll take it one institution at a time. Do you already know about any of her assets?"], ["you", "Yes — her State Bank savings account."], ["keeper", "I’ll start that claim. Banks check who you are and your authority first. A death certificate alone doesn’t authorise everything."]],
    view: { title: "State Bank of India · claim", rows: [["Authority review", "Current step", "warn"], ["Requirements", "From RBI’s 2025 directions", "plain"], ["Documents", "3 still missing", "warn"], ["Approval", "Not requested yet", "plain"]], note: "Nothing is sent until you review and approve the exact package." },
  },
];

function Stories() {
  const [i, setI] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const s = STORIES[i];
  // The nav links "Find assets", "Prepare for family" and "Claims" open the matching story.
  useEffect(() => {
    const onHash = () => { const n = STORIES.findIndex((t) => t.anchor === location.hash.slice(1)); if (n >= 0) setI(n); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const go = (n: number) => { const k = (n + STORIES.length) % STORIES.length; setI(k); refs.current[k]?.focus(); };
  return (
    <section id="stories" className="relative scroll-mt-20 border-y border-line bg-paper">
      {STORIES.map((t) => <span key={t.anchor} id={t.anchor} className="absolute -top-20" aria-hidden />)}
      <div className="mx-auto max-w-[1180px] px-5 py-20">
        <p className="eyebrow">Three stories, one assistant</p>
        <h2 className="display mt-3 text-[clamp(2rem,4vw,3.1rem)]">Start with the situation you’re in.</h2>
        <div role="tablist" aria-label="Choose a story" className="mt-8 inline-flex flex-wrap gap-2 rounded-full border border-line bg-ivory p-1.5">
          {STORIES.map((t, n) => (
            <button key={t.id} ref={(el) => { refs.current[n] = el; }} role="tab" id={`tab-${t.id}`} aria-selected={i === n} aria-controls="story-panel" tabIndex={i === n ? 0 : -1}
              onClick={() => setI(n)} onKeyDown={(e) => { if (e.key === "ArrowRight") go(n + 1); if (e.key === "ArrowLeft") go(n - 1); }}
              className={cn("min-h-11 rounded-full px-5 text-[0.95rem] font-semibold transition-colors", i === n ? "bg-ink text-ivory" : "hover:bg-secondary")}>{t.tab}</button>
          ))}
        </div>
        <div id="story-panel" role="tabpanel" aria-labelledby={`tab-${s.id}`} key={s.id} className="settle mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-line bg-ivory p-5 md:p-7">
            <div className="mb-4 flex items-center justify-between"><span className="eyebrow">Conversation</span><Pill tone="warn">Demo</Pill></div>
            <div className="space-y-3">
              <Bubble who="you">{s.quote}</Bubble>
              {s.chat.map(([w, t], n) => <Bubble key={n} who={w}>{t}</Bubble>)}
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-ivory p-5 md:p-7">
            <div className="eyebrow">What this becomes</div>
            <h3 className="display mt-2 text-[1.7rem]">{s.view.title}</h3>
            <ul className="mt-4 divide-y divide-line">
              {s.view.rows.map(([a, b, tone]) => (
                <li key={a} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="font-medium">{a}</span><Pill tone={tone}>{b}</Pill></li>
              ))}
            </ul>
            <p className="mt-4 text-[0.9rem] text-muted-foreground">{s.view.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function How() {
  const steps = [["Talk or type", "Say what’s happening in your own words."], ["Establish permissions", "Keeper explains who may act and what it will use."], ["Gather information and documents", "Short questions over time, remembered between sessions."], ["Review evidence", "Each detail shown next to its source."], ["Prepare or claim", "A checklist and package for each institution."], ["Track outcomes", "Approvals, follow-ups and results in one place."]];
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-20">
      <p className="eyebrow">How it works</p>
      <h2 className="display mt-3 max-w-[20ch] text-[clamp(2rem,4vw,3.1rem)]">Keeper asks only what’s relevant, and remembers it.</h2>
      <ol className="mt-10 grid gap-x-8 gap-y-6 md:grid-cols-3">
        {steps.map(([t, d], n) => (
          <li key={t} className="relative border-t border-ink/20 pt-4"><span className="display text-[2.4rem] text-apricot-deep/70" aria-hidden>{n + 1}</span><h3 className="text-[1.05rem] font-semibold">{t}</h3><p className="mt-1 text-ink/75">{d}</p></li>
        ))}
      </ol>
      <p className="mt-8 max-w-[40rem] text-ink/80">Keeper asks relevant follow-up questions over time. You can say “I don’t know”, “skip for now” or “why do you need this?” at any point — nothing blocks you, and nothing you’ve confirmed is asked twice.</p>
    </section>
  );
}

function WhatYouGet() {
  const items = [["An evidence-backed asset inventory", "Each asset labelled Self-declared, Potential match, Document-backed or Institution-verified — with dated, labelled amounts, never a made-up total."], ["A family financial record", "Assets, documents, nominations, trusted contacts and instructions — with a preview of exactly what a contact would see."], ["An institution-specific claim plan", "Requirements from official sources, what’s missing, and the exact package you’ll approve."], ["Organised documents", "Original beside the extracted details, with corrections kept."], ["Outstanding tasks and follow-ups", "Unknown answers become tasks, not dead ends."]];
  return (
    <section className="border-y border-line bg-paper">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div><p className="eyebrow">What you get</p><h2 className="display mt-3 text-[clamp(2rem,4vw,3.1rem)]">Clear records instead of a pile of papers.</h2><FamilyScene variant="desk" className="mt-8 hidden w-full rounded-3xl lg:block" /></div>
        <ul className="divide-y divide-line self-center">
          {items.map(([t, d]) => <li key={t} className="py-5"><h3 className="text-[1.15rem] font-semibold">{t}</h3><p className="mt-1 text-ink/75">{d}</p></li>)}
        </ul>
      </div>
    </section>
  );
}

type Level = "Available" | "Guided assistance" | "Planned";
const COVERAGE: [string, Level, Level, Level][] = [
  ["Bank accounts and fixed deposits", "Available", "Guided assistance", "Available"],
  ["Mutual funds", "Available", "Guided assistance", "Available"],
  ["Shares and demat holdings", "Available", "Planned", "Planned"],
  ["Unclaimed dividends and shares", "Available", "Planned", "Planned"],
  ["Life insurance", "Available", "Guided assistance", "Available"],
  ["EPF and related benefits", "Available", "Planned", "Planned"],
  ["NPS", "Available", "Planned", "Planned"],
  ["PPF and small savings", "Available", "Planned", "Planned"],
  ["Bank lockers", "Available", "Planned", "Planned"],
];
const LV: Record<Level, "ok" | "warn" | "plain"> = { Available: "ok", "Guided assistance": "warn", Planned: "plain" };

function Coverage() {
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-20">
      <p className="eyebrow">Coverage</p>
      <h2 className="display mt-3 text-[clamp(2rem,4vw,3.1rem)]">What Keeper covers today, and what it doesn’t.</h2>
      <p className="mt-4 max-w-[44rem] text-ink/80">Three kinds of help are labelled separately. <b>Record organisation</b> means you can keep the asset in your record. <b>Discovery assistance</b> means Keeper guides you through an official search — it is never a live connection. <b>Claims assistance</b> means a prepared claim workflow. Active demo workflows: bank deposits, mutual funds and insurance.</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full min-w-[640px] text-left text-[0.95rem]">
          <caption className="sr-only">Coverage by asset type</caption>
          <thead className="border-b border-line bg-secondary/60 text-[0.85rem]"><tr><th scope="col" className="p-4">Asset type</th><th scope="col" className="p-4">Record organisation</th><th scope="col" className="p-4">Discovery assistance</th><th scope="col" className="p-4">Claims assistance</th></tr></thead>
          <tbody>{COVERAGE.map(([n, a, b, c]) => (
            <tr key={n} className="border-b border-line last:border-0"><th scope="row" className="p-4 font-medium">{n}</th>{[a, b, c].map((l, k) => <td key={k} className="p-4"><Pill tone={LV[l]}>{l}</Pill></td>)}</tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mt-4 text-[0.9rem] text-muted-foreground">Keeper coordinates information and approved workflows. It does not hold funds, decide legal entitlement, replace a will, or guarantee complete discovery or settlement.</p>
    </section>
  );
}

function Control() {
  return (
    <section id="control" className="scroll-mt-20 border-y border-line bg-ink text-ivory">
      <div className="mx-auto max-w-[1180px] px-5 py-20">
        <p className="eyebrow !text-apricot">Control</p>
        <h2 className="display mt-3 max-w-[22ch] text-[clamp(2rem,4vw,3.1rem)]">You see the evidence, preview access, and approve before anything leaves.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-ivory/20 p-5"><h3 className="font-semibold">Evidence you can inspect</h3><p className="mt-2 text-ivory/75">Every detail shows where it came from — what you said, what a document shows, or what Keeper inferred — and its review state.</p></div>
          <div className="rounded-2xl border border-ivory/20 p-5"><h3 className="font-semibold">Access previews and consent</h3><p className="mt-2 text-ivory/75">A trusted contact sees nothing until you choose, and you can preview their exact view. Guided searches need your permission first.</p></div>
          <div className="rounded-2xl border border-ivory/20 p-5"><h3 className="font-semibold">Approval and activity history</h3><p className="mt-2 text-ivory/75">Before anything is sent you see the exact action, recipient, contents and declarations. A change cancels the approval. History separates what Keeper prepared from what you approved.</p></div>
        </div>
        <p className="mt-8 max-w-[48rem] text-[0.95rem] text-ivory/75">This prototype runs on synthetic data in your browser. It makes no real connections, sends nothing to institutions, and doesn’t accept real documents. We only describe controls that exist today.</p>
      </div>
    </section>
  );
}

const FAQ: [string, string][] = [
  ["Can I use Keeper while I’m alive?", "Yes. You can discover forgotten accounts, or organise what you have so it’s easy to find later."],
  ["Is it for end-of-life preparation?", "Yes, without needing a medical reason. Keeper helps you record assets, documents, nominations, trusted contacts and practical instructions — and doesn’t ask about health."],
  ["Can it help after someone dies?", "Yes. It helps authorised family members, nominees or executors organise the case, find possible assets, understand each institution’s requirements and prepare claim documents."],
  ["Can I start a claim for an asset I already know about?", "Yes. You don’t have to search first. Tell Keeper which asset, and it starts that claim directly."],
  ["Can Keeper find every asset?", "No. It can analyse documents you upload and guide you through official searches. A search that finds nothing only covers that source and the details you gave."],
  ["What identity and authority are needed?", "Institutions decide. A death certificate alone doesn’t authorise every action, and requirements vary by institution and case. Keeper explains what’s typically needed before you reach protected steps."],
  ["Is a trusted contact an heir?", "No. A trusted contact is someone you choose to tell where your record is. Inheritance is decided by law and your will, not by Keeper."],
  ["Does it replace a will or legal advice?", "No. It doesn’t draft wills, decide who is entitled to what, or represent you before institutions. For legal questions, talk to a lawyer."],
  ["Does Keeper send anything without asking?", "No. Anything external needs your review of the exact package first, and a change cancels the approval. In this prototype nothing is actually sent."],
];

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-[860px] px-5 py-20">
      <p className="eyebrow">Questions</p>
      <h2 className="display mt-3 text-[clamp(2rem,4vw,3.1rem)]">Plain answers.</h2>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group py-1">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[1.05rem] font-semibold"><span>{q}</span><span aria-hidden className="text-apricot-deep transition-transform group-open:rotate-45">+</span></summary>
            <p className="pb-5 pr-8 text-ink/80">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  const links = [["Find my assets", "discover"], ["Prepare for my family", "prepare"], ["Get help after a death", "claim"]];
  return (
    <section className="bg-moss text-white">
      <div className="mx-auto max-w-[1180px] px-5 py-20 text-center">
        <h2 className="display text-[clamp(2.2rem,5vw,3.6rem)]">Start with the situation you’re in.</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {links.map(([l, j], n) => <Link key={j} href={`/signin?journey=${j}`} className={cn("inline-flex min-h-12 items-center rounded-full px-7 font-semibold", n === 0 ? "bg-apricot text-ink hover:bg-[#dd9566]" : "border border-white/50 hover:bg-white/10")}>{l}</Link>)}
        </div>
        <p className="mt-5 text-[0.9rem] text-white/80">Prototype with synthetic data. No real accounts, documents or institutions are connected.</p>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">Skip to content</a>
      <Header />
      <main id="main">
        <Hero /><Problem /><Introduction /><Stories /><How /><WhatYouGet /><Coverage /><Control /><Faq /><FinalCta />
      </main>
      <footer className="border-t border-line bg-paper"><div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-[0.9rem] text-muted-foreground"><Wordmark /><span>© keeper · A prototype. Synthetic data only. Not legal or financial advice.</span><Btn variant="quiet" className="min-h-10 px-4 text-[0.85rem]" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top</Btn></div></footer>
    </div>
  );
}
