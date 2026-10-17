"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeading, LeafLogo, TrustFooter } from "./ui-bits";
import {
  Search,
  HeartHandshake,
  NotebookPen,
  MessageSquareText,
  Fingerprint,
  FolderSearch,
  Send,
  KeyRound,
  CheckCheck,
  HandCoins,
  EyeOff,
  ListChecks,
  Landmark,
  ShieldCheck,
  TrendingUp,
  Globe2,
  ArrowRight,
  BookOpenCheck,
} from "lucide-react";

const JOURNEYS = [
  {
    icon: HeartHandshake,
    title: "Someone in the family has passed away",
    desc: "Find what they owned — bank accounts, deposits, mutual funds, insurance — and claim each one, step by step.",
    example: "“My father passed away. We know about one bank account, but not his investments or insurance.”",
  },
  {
    icon: Search,
    title: "I think I've forgotten some money",
    desc: "An old account from a previous city, a policy from years ago, a fund you never tracked — we help you look.",
    example: "“I invested in mutual funds years ago but don't remember where.”",
  },
  {
    icon: NotebookPen,
    title: "I want my family to find everything later",
    desc: "One dated record of what you own, which nominees are missing, and what your family would need — shared only when you choose.",
    example: "“I want my children to know where my money and investments are.”",
  },
];

const STEPS = [
  { icon: MessageSquareText, title: "Tell us what happened", desc: "In your own words — by typing, and soon by voice. No long forms." },
  { icon: Fingerprint, title: "Confirm who you are", desc: "So nobody else can see your family's records. Details unlock one step at a time." },
  { icon: FolderSearch, title: "We find and organise", desc: "From the papers you have and the official searches. Each item says how sure we are." },
  { icon: Send, title: "You submit, we track", desc: "We prepare each claim with you; you send it. We follow every step to the end." },
];

const PROMISES = [
  { icon: KeyRound, title: "We never ask for passwords or OTPs", desc: "Not your bank's, not your family's. Ever." },
  { icon: CheckCheck, title: "Nothing happens without your approval", desc: "You see exactly what will be sent, to whom, before anything leaves." },
  { icon: HandCoins, title: "We never touch your money", desc: "Banks and insurers pay you directly. We never take a share of what you recover." },
  { icon: ListChecks, title: "We tell you what we checked — and what we didn't", desc: "A possible match is shown as possible, never as confirmed." },
  { icon: EyeOff, title: "Your data is never sold", desc: "Collected only for your case, kept safe, deleted when you ask." },
];

const SOURCES = [
  { name: "RBI UDGAM", use: "Old unclaimed bank deposits", icon: Landmark },
  { name: "SEBI MITRA", use: "Inactive and unclaimed mutual funds", icon: TrendingUp },
  { name: "IRDAI Bima Bharosa", use: "Unclaimed insurance, by insurer", icon: ShieldCheck },
  { name: "Unclaimed assets portal", use: "The government's single starting point", icon: Globe2 },
];

const PREVIEW = [
  { item: "PNB savings · Delhi", status: "Document-backed", tone: "text-[#7cc5c4]" },
  { item: "LIC Jeevan Anand", status: "Document-backed", tone: "text-[#7cc5c4]" },
  { item: "HDFC Flexi Cap Fund", status: "Document-backed", tone: "text-[#7cc5c4]" },
  { item: "Old deposit found on UDGAM", status: "Potential match", tone: "text-[#d9b45e]" },
];

export default function Landing({
  onStart,
  onDemo,
  onResources,
  onCases,
}: {
  onStart: () => void;
  onDemo: () => void;
  onResources: () => void;
  onCases: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      {/* ─── Hero ─── */}
      <section className="hero-grid-bg relative text-white">
        <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
          <div className="mb-10 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <LeafLogo className="h-7 w-7 shrink-0 text-[#7cc5c4]" />
              <div className="font-display truncate text-lg font-semibold leading-none">Financial Legacy</div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCases}
                className="text-white/85 hover:bg-white/10 hover:text-white"
              >
                My cases
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onResources}
                className="hidden border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white sm:inline-flex"
              >
                Official portals
              </Button>
            </div>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="min-w-0">
              <Badge
                variant="outline"
                className="mb-5 rounded-full border-[#7cc5c4]/40 bg-[#7cc5c4]/10 px-3 py-1 text-[12px] font-medium text-[#7cc5c4]"
              >
                For Indian families · Free during our pilot
              </Badge>
              <h1 className="font-display text-[2.4rem] font-semibold leading-[1.12] sm:text-[3.3rem]">
                Find what&apos;s yours.
                <br />
                <span className="text-[#7cc5c4]">Make sure nothing gets left behind.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/75">
                When someone you love has passed away — or you simply can&apos;t remember where everything is — we help
                you find the money, organise the papers, and claim it, one calm step at a time.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  onClick={onStart}
                  className="h-12 bg-[#0e7c7b] px-7 text-[15px] font-semibold text-white hover:bg-[#0c6a69]"
                >
                  Tell us what happened <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={onDemo}
                  className="h-12 border-white/30 bg-transparent px-6 text-[15px] text-white hover:bg-white/10 hover:text-white"
                >
                  See an example
                </Button>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/60">
                <li className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-[#7cc5c4]" /> Never passwords or OTPs
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCheck className="h-3.5 w-3.5 text-[#7cc5c4]" /> You approve everything
                </li>
                <li className="flex items-center gap-1.5">
                  <HandCoins className="h-3.5 w-3.5 text-[#7cc5c4]" /> We never touch your money
                </li>
              </ul>
            </div>

            {/* Gentle preview of what a family sees */}
            <div className="relative hidden min-w-0 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm lg:block">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">What you&apos;ll see</div>
              <div className="mt-2 text-[15px] font-semibold text-white">Your father&apos;s accounts, in one place</div>
              <div className="mt-4 space-y-2.5">
                {PREVIEW.map((p) => (
                  <div
                    key={p.item}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5"
                  >
                    <span className="truncate text-[13px] text-white/85">{p.item}</span>
                    <span className={`shrink-0 text-[12px] font-medium ${p.tone}`}>{p.status}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-navy-deep/60 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white/75">
                <span className="font-semibold text-[#7cc5c4]">Next step:</span> get the LIC claim form ready — 4 of 5
                documents are already here.
              </div>
              <div className="mt-3 text-[11px] text-white/40">Example with synthetic data</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How we can help ─── */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6">
          <SectionHeading
            eyebrow="How we can help"
            title="Start from where you are."
            sub="Choose what fits — or just describe your situation and we'll work out the rest with you."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {JOURNEYS.map((j) => (
              <button
                key={j.title}
                onClick={onStart}
                className="group flex min-w-0 flex-col rounded-2xl border bg-card p-6 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-soft text-teal-brand">
                  <j.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-[19px] font-semibold leading-snug text-navy">{j.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{j.desc}</p>
                <p className="mt-4 text-[13.5px] italic leading-relaxed text-ink/70">{j.example}</p>
                <span className="mt-5 flex items-center gap-1 text-[14px] font-semibold text-teal-brand">
                  Start here <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="border-y bg-card">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6">
          <SectionHeading eyebrow="How it works" title="Four steps. At your pace." />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="min-w-0 rounded-2xl border bg-background p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy font-display text-[14px] font-semibold text-white">
                    {i + 1}
                  </span>
                  <s.icon className="h-5 w-5 text-teal-brand" />
                </div>
                <div className="text-[16px] font-semibold text-navy">{s.title}</div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── Promises ─── */}
      <section className="bg-navy text-white">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6">
          <SectionHeading light eyebrow="Our promises" title="Your family's information stays safe." />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROMISES.map((p) => (
              <div key={p.title} className="flex min-w-0 gap-3 rounded-xl border border-white/10 bg-white/5 p-5">
                <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#7cc5c4]" />
                <div>
                  <div className="text-[15px] font-semibold">{p.title}</div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-white/65">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Official sources ─── */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Official sources"
              title="We work with the official searches — honestly."
              sub="These government and regulator websites don't let anyone search on your behalf. We show you which ones fit, walk you through them, and keep track of what they found."
            />
            <Button
              variant="outline"
              onClick={onResources}
              className="shrink-0 border-navy/20 text-navy hover:bg-teal-soft"
            >
              See all official portals <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SOURCES.map((p) => (
              <div key={p.name} className="flex min-w-0 items-start gap-3 rounded-xl border bg-card p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
                  <p.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-navy">{p.name}</div>
                  <div className="mt-0.5 text-[13px] text-muted-foreground">{p.use}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Closing ─── */}
      <section className="hero-grid-bg text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-5 py-20 text-center sm:px-6">
          <h2 className="font-display max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
            Take it one step at a time.
          </h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/70">
            Tell us what happened. We&apos;ll suggest the first step and stay with you until every account has an answer.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              onClick={onStart}
              className="h-12 bg-[#0e7c7b] px-8 text-[15px] font-semibold text-white hover:bg-[#0c6a69]"
            >
              Tell us what happened
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onDemo}
              className="h-12 border-white/30 bg-transparent px-6 text-[15px] text-white hover:bg-white/10 hover:text-white"
            >
              See an example
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-2 text-[12px] text-white/45">
            <BookOpenCheck className="h-3.5 w-3.5" /> Pilot · examples use synthetic data · official portals are linked,
            never imitated
          </div>
        </div>
      </section>

      <TrustFooter dark />
    </div>
  );
}
