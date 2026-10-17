"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LeafLogo, TrustFooter } from "./ui-bits";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BookOpenCheck,
  CheckCheck,
  CircleSlash,
  EyeOff,
  FolderSearch,
  Globe2,
  HandCoins,
  HeartHandshake,
  KeyRound,
  Landmark,
  ListChecks,
  MessageSquareText,
  NotebookPen,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
} from "lucide-react";

/** The three journeys, in the words the one-pager uses (§3, §12). */
const JOURNEYS = [
  {
    icon: HeartHandshake,
    title: "Someone in the family has passed away",
    desc: "Find what they owned — bank accounts, deposits, mutual funds, insurance — and claim each one, step by step.",
    prompt: "My father passed away. Help me find and claim what he left behind.",
  },
  {
    icon: Search,
    title: "I want to know what I have",
    desc: "An old account in a previous city, a policy from years ago, a fund you never tracked — we help you look.",
    prompt: "I want to know what financial assets I have. I invested in mutual funds years ago but don't remember where.",
  },
  {
    icon: NotebookPen,
    title: "I want my family to find everything later",
    desc: "One dated record of what you own, which nominees are missing, and what your family would need.",
    prompt: "I want to make sure my family can find everything when I'm gone.",
  },
];

/** One-pager §4 — the six steps. */
const STEPS = [
  { icon: MessageSquareText, title: "Tell us what happened", desc: "In your own words. No long forms — we ask only what we need." },
  { icon: UserCheck, title: "Confirm who you are", desc: "And, after a death, your relationship. Nothing about the assets opens before that." },
  { icon: FolderSearch, title: "Discover", desc: "From the papers you have and the official searches that fit your case." },
  { icon: ListChecks, title: "Check and organise", desc: "One list. Each item says how we know it — and possible matches stay possible." },
  { icon: NotebookPen, title: "Prepare or claim", desc: "A legacy record for your family, or each claim prepared with you." },
  { icon: Route, title: "Track to the end", desc: "Who you're waiting on, what's missing, and the final outcome — recorded." },
];

/** MVP scope (one-pager §10). */
const COVERAGE = [
  { icon: Banknote, title: "Bank accounts and fixed deposits", route: "Old statements · RBI UDGAM for unclaimed deposits · the bank's claim process" },
  { icon: TrendingUp, title: "Mutual funds", route: "Consolidated statements · SEBI MITRA for inactive folios · fund house transmission" },
  { icon: ShieldCheck, title: "Life insurance", route: "Policy papers · insurer searches and IRDAI Bima Bharosa · the insurer's death claim" },
];

/** One-pager §8 — being transparent about what is feasible. */
const CAN = [
  "Read your statements, policies and letters, and show where each detail came from",
  "Organise everything into one list, with how sure we are about each item",
  "Point you to the official searches that fit, and record what they found",
  "Prepare claim paperwork with you and track every reply",
];
const CANNOT = [
  "Search every bank, fund and insurer in India — no one can yet",
  "Decide who is legally entitled to an asset",
  "Submit a claim for you — you approve and send it",
  "Promise that money will be recovered",
];

const PROMISES = [
  { icon: KeyRound, title: "Never passwords or OTPs", desc: "Not your bank's, not your family's. Ever." },
  { icon: CheckCheck, title: "Nothing happens without your approval", desc: "You see what will be sent, to whom, before anything leaves." },
  { icon: HandCoins, title: "We never touch your money", desc: "Banks and insurers pay you directly. No share of what you recover." },
  { icon: EyeOff, title: "Your data is never sold", desc: "Used only for your case, kept safe, deleted when you ask." },
];

const SOURCES = [
  { name: "RBI UDGAM", use: "Old unclaimed bank deposits", icon: Landmark },
  { name: "SEBI MITRA", use: "Inactive and unclaimed mutual funds", icon: TrendingUp },
  { name: "IRDAI Bima Bharosa", use: "Unclaimed insurance, by insurer", icon: ShieldCheck },
  { name: "Unclaimed assets portal", use: "The government's single starting point", icon: Globe2 },
];

export default function Landing({
  onStart,
  onDemo,
  onResources,
  onCases,
}: {
  onStart: (message?: string) => void;
  onDemo: () => void;
  onResources: () => void;
  onCases: () => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      {/* ─── Hero: the conversation starts here ─── */}
      <section className="hero-grid-bg relative text-white">
        <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-6 sm:px-6 sm:pb-24">
          <div className="mb-10 flex items-center justify-between gap-3 sm:mb-14">
            <div className="flex min-w-0 items-center gap-2.5">
              <LeafLogo className="h-7 w-7 shrink-0 text-[#7cc5c4]" />
              <div className="font-display truncate text-lg font-semibold leading-none">Financial Legacy</div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button variant="ghost" onClick={onCases} className="h-10 text-[15px] text-white/85 hover:bg-white/10 hover:text-white">
                My cases
              </Button>
              <Button
                variant="outline"
                onClick={onResources}
                className="hidden h-10 border-white/25 bg-white/5 text-[15px] text-white hover:bg-white/15 hover:text-white sm:inline-flex"
              >
                Official portals
              </Button>
            </div>
          </div>

          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="min-w-0">
              <p className="mb-5 inline-flex rounded-full border border-[#7cc5c4]/40 bg-[#7cc5c4]/10 px-3.5 py-1.5 text-[14px] font-medium text-[#9fd6d5]">
                For Indian families · Free during our pilot
              </p>
              <h1 className="font-display text-[2.5rem] font-semibold leading-[1.1] sm:text-[3.5rem]">
                Find what&apos;s yours.
                <br />
                <span className="text-[#7cc5c4]">Make sure nothing gets left behind.</span>
              </h1>
              <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-white/80">
                One patient assistant that helps you find forgotten money, keep your family&apos;s records in order, and
                claim what a loved one left behind — and remembers your case from start to finish.
              </p>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-white/70">
                <li className="flex items-center gap-1.5"><KeyRound className="h-4 w-4 text-[#7cc5c4]" /> Never passwords or OTPs</li>
                <li className="flex items-center gap-1.5"><CheckCheck className="h-4 w-4 text-[#7cc5c4]" /> You approve everything</li>
                <li className="flex items-center gap-1.5"><HandCoins className="h-4 w-4 text-[#7cc5c4]" /> We never touch your money</li>
              </ul>
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onStart(text.trim() || undefined);
              }}
              className="min-w-0 rounded-3xl bg-card p-5 text-ink shadow-2xl sm:p-6"
              aria-labelledby="composer-heading"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-[#7cc5c4]" aria-hidden>
                  <LeafLogo className="h-5 w-5" />
                </span>
                <h2 id="composer-heading" className="text-[18px] font-semibold text-navy">
                  Tell us what happened, in your own words
                </h2>
              </div>
              <label htmlFor="hero-message" className="sr-only">Your situation</label>
              <textarea
                id="hero-message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onStart(text.trim() || undefined);
                  }
                }}
                rows={4}
                placeholder="For example: My mother passed away last month. We found an old LIC receipt and a bank passbook…"
                className="mt-4 w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-[17px] leading-relaxed text-ink placeholder:text-muted-foreground"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[14px] text-muted-foreground">A sentence is enough. Voice in Indian languages is coming.</p>
                <Button type="submit" className="h-12 rounded-xl bg-teal-brand px-6 text-[16px] font-semibold text-white hover:bg-[#0c6a69]">
                  Start <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
              <div className="mt-5 border-t pt-4">
                <p className="mb-2.5 text-[14px] font-medium text-ink/75">Or start with one of these:</p>
                <div className="flex flex-col gap-2">
                  {JOURNEYS.map((j) => (
                    <button
                      key={j.title}
                      type="button"
                      onClick={() => onStart(j.prompt)}
                      className="flex min-h-11 items-center gap-3 rounded-xl border bg-background px-3.5 py-2.5 text-left text-[15px] text-ink/90 transition-colors hover:border-teal-brand/40 hover:bg-teal-soft"
                    >
                      <j.icon className="h-4 w-4 shrink-0 text-teal-brand" />
                      <span className="min-w-0">“{j.prompt}”</span>
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={onDemo} className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-[15px] font-medium text-teal-brand underline-offset-4 hover:underline">
                <Sparkles className="h-4 w-4" /> Or explore an example case first
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ─── Three journeys ─── */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="eyebrow">Start from where you are</p>
          <h2 className="mt-2 max-w-2xl font-display text-[30px] font-semibold leading-tight text-navy sm:text-[36px]">
            Discover, plan or claim — on their own or together.
          </h2>
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
            If you already know which accounts to claim, we skip straight to the claims. If you&apos;re not sure, we look first.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {JOURNEYS.map((j) => (
              <button
                key={j.title}
                onClick={() => onStart(j.prompt)}
                className="group flex min-w-0 flex-col rounded-2xl border bg-card p-6 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-soft text-teal-brand">
                  <j.icon className="h-6 w-6" />
                </span>
                <h3 className="font-display text-[21px] font-semibold leading-snug text-navy">{j.title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">{j.desc}</p>
                <span className="mt-auto flex items-center gap-1 pt-5 text-[16px] font-semibold text-teal-brand">
                  Start here <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Six steps ─── */}
      <section className="border-y bg-card">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 font-display text-[30px] font-semibold leading-tight text-navy sm:text-[36px]">Six steps, at your pace.</h2>
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
            The assistant keeps track of where you are. Leave any time — your case is saved.
          </p>
          <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex min-w-0 gap-4 rounded-2xl border bg-background p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy font-display text-[17px] font-semibold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[17px] font-semibold text-navy">
                    {s.title} <s.icon className="h-4 w-4 text-teal-brand" aria-hidden />
                  </div>
                  <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── Coverage ─── */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="eyebrow">What we cover in the pilot</p>
          <h2 className="mt-2 font-display text-[30px] font-semibold leading-tight text-navy sm:text-[36px]">Three kinds of assets, done properly.</h2>
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
            Each has its own way of being found and claimed. Shares, provident fund, NPS and more come later.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {COVERAGE.map((c) => (
              <div key={c.title} className="min-w-0 rounded-2xl border bg-card p-6">
                <c.icon className="h-7 w-7 text-teal-brand" aria-hidden />
                <h3 className="mt-4 text-[19px] font-semibold text-navy">{c.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{c.route}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Honest about what's possible ─── */}
      <section className="border-y bg-card">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="eyebrow">Honest about what&apos;s possible</p>
          <h2 className="mt-2 max-w-2xl font-display text-[30px] font-semibold leading-tight text-navy sm:text-[36px]">
            What we can do for you — and what we can&apos;t.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-teal-brand/30 bg-teal-soft/40 p-6">
              <h3 className="flex items-center gap-2 text-[18px] font-semibold text-[#0b6b6a]"><BadgeCheck className="h-5 w-5" /> We can</h3>
              <ul className="mt-4 space-y-3">
                {CAN.map((x) => (
                  <li key={x} className="flex gap-2.5 text-[16px] leading-relaxed text-ink/90">
                    <CheckCheck className="mt-1 h-4 w-4 shrink-0 text-teal-brand" /> {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0 rounded-2xl border bg-background p-6">
              <h3 className="flex items-center gap-2 text-[18px] font-semibold text-navy"><CircleSlash className="h-5 w-5" /> We can&apos;t</h3>
              <ul className="mt-4 space-y-3">
                {CANNOT.map((x) => (
                  <li key={x} className="flex gap-2.5 text-[16px] leading-relaxed text-ink/80">
                    <CircleSlash className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /> {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Promises ─── */}
      <section className="bg-navy text-white">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="eyebrow !text-[#7cc5c4]">Our promises</p>
          <h2 className="mt-2 font-display text-[30px] font-semibold leading-tight sm:text-[36px]">Your family&apos;s information stays safe.</h2>
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PROMISES.map((p) => (
              <div key={p.title} className="flex min-w-0 gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
                <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#7cc5c4]" />
                <div>
                  <div className="text-[17px] font-semibold">{p.title}</div>
                  <p className="mt-1 text-[15px] leading-relaxed text-white/70">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Official sources ─── */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="eyebrow">Official sources</p>
              <h2 className="mt-2 font-display text-[30px] font-semibold leading-tight text-navy sm:text-[36px]">We work with the official searches.</h2>
              <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground">
                These government and regulator websites don&apos;t let anyone search on your behalf. We show you which ones
                fit, walk you through them, and record what they found.
              </p>
            </div>
            <Button variant="outline" onClick={onResources} className="h-11 shrink-0 border-navy/20 text-[15px] text-navy hover:bg-teal-soft">
              See all official portals <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SOURCES.map((p) => (
              <div key={p.name} className="flex min-w-0 items-start gap-3 rounded-2xl border bg-card p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
                  <p.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-[16px] font-semibold text-navy">{p.name}</div>
                  <div className="mt-0.5 text-[14px] text-muted-foreground">{p.use}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Closing ─── */}
      <section className="hero-grid-bg text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-5 py-20 text-center sm:px-6">
          <h2 className="max-w-2xl font-display text-[32px] font-semibold leading-tight sm:text-[40px]">Take it one step at a time.</h2>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-white/75">
            Tell us what happened. We&apos;ll suggest the first step and stay with you until every account has an answer.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => onStart()} className="h-12 bg-[#0e7c7b] px-8 text-[16px] font-semibold text-white hover:bg-[#0c6a69]">
              Tell us what happened
            </Button>
            <Button size="lg" variant="outline" onClick={onDemo} className="h-12 border-white/30 bg-transparent px-6 text-[16px] text-white hover:bg-white/10 hover:text-white">
              See an example
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-2 text-[14px] text-white/55">
            <BookOpenCheck className="h-4 w-4" /> Pilot · examples use synthetic data · official portals are linked, never imitated
          </div>
        </div>
      </section>

      <TrustFooter dark />
    </div>
  );
}
