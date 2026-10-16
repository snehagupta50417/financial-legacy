"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading, LeafLogo, TrustFooter } from "./ui-bits";
import {
  Search,
  FileScan,
  ClipboardCheck,
  Users,
  MessageSquareText,
  Database,
  Link2,
  BookCheck,
  CircleCheckBig,
  Landmark,
  ShieldCheck,
  TrendingUp,
  PieChart,
  ArrowRight,
  AlertTriangle,
  Crown,
  FileSignature,
  HeartHandshake,
  Globe2,
  UserRound,
  Scale,
  ShieldQuestion,
  BookOpenCheck,
} from "lucide-react";

const PILLARS = [
  {
    icon: Search,
    title: "Asset Discovery",
    desc: "Find what may have been forgotten — deposits, policies, folios, shares — with AI-analysed records and official search portals.",
  },
  {
    icon: FileScan,
    title: "Document Intelligence",
    desc: "Real text extraction from statements, policies and letters — every finding shown beside its evidence, verified by you.",
  },
  {
    icon: ClipboardCheck,
    title: "Claims & Guidance",
    desc: "Institution-specific checklists, pre-filled fields you review, follow-up drafts, and the official grievance path when needed.",
  },
  {
    icon: Users,
    title: "Family & Legacy",
    desc: "Wills, beneficiaries, executor plans and nomination hygiene — so the next generation never starts from zero.",
  },
];

const JOURNEY_STEPS = [
  { icon: MessageSquareText, title: "1 · Ask", desc: "Describe your situation in your own words" },
  { icon: Database, title: "2 · Use your data", desc: "Upload records; AI extracts evidence-linked clues" },
  { icon: Link2, title: "3 · Connect", desc: "Route to official portals: UDGAM, Bima Bharosa, MITRA, IEPF" },
  { icon: BookCheck, title: "4 · Guide", desc: "Checklists, drafts and pre-filled fields — you approve" },
  { icon: CircleCheckBig, title: "5 · Complete", desc: "Track every action until the case is resolved" },
];

const SEVEN = [
  { icon: UserRound, label: "Living individual", desc: "Forgotten FD, policy or folio in your own name" },
  { icon: HeartHandshake, label: "Family after a death", desc: "Map a loved one's full financial footprint" },
  { icon: ShieldQuestion, label: "Nominee / legal heir", desc: "Claim with the right documents and authority" },
  { icon: FileSignature, label: "Will & estate planning", desc: "Inventory, beneficiaries, executor, draft will" },
  { icon: AlertTriangle, label: "Rejected or delayed claim", desc: "Extract the reason, fix the gap, escalate" },
  { icon: Users, label: "Elderly relative / caregiver", desc: "Consent-based organisation for a parent" },
  { icon: Globe2, label: "NRI & cross-border", desc: "Multi-jurisdiction checklists and attestation" },
];

const MOAT = [
  {
    title: "Personalised Journey Engine",
    desc: "One configurable engine adapts to seven family situations and every asset class — not seven hard-coded dashboards.",
  },
  {
    title: "Document Intelligence",
    desc: "Fragmented statements become structured, evidence-linked records — each finding shown beside its source.",
  },
  {
    title: "Action-Oriented AI",
    desc: "Beyond answers: checklists, drafts, official routing and completion tracking with your approval at each step.",
  },
  {
    title: "Cross-Institution Orchestration",
    desc: "Separate discovery and claim workflows unified into one case workspace with a live next-best-action.",
  },
  {
    title: "Trust & Traceability",
    desc: "Verified facts, user inputs and AI hypotheses are labelled differently — nothing pretends to be verified.",
  },
  {
    title: "Learning Workflow Architecture",
    desc: "Your approved corrections improve the scenario engine — under consent, privacy and audit controls.",
  },
];

const PORTALS = [
  { name: "RBI UDGAM", use: "Unclaimed bank deposits", icon: Landmark },
  { name: "IRDAI Bima Bharosa", use: "Unclaimed insurance & grievances", icon: ShieldCheck },
  { name: "SEBI MITRA", use: "Inactive / unclaimed mutual funds", icon: TrendingUp },
  { name: "IEPF (MCA)", use: "Unclaimed shares & dividends", icon: PieChart },
];

export default function Landing({
  onStart,
  onDemo,
  onResources,
}: {
  onStart: () => void;
  onDemo: () => void;
  onResources: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ─── Hero ─── */}
      <section className="hero-grid-bg relative text-white">
        <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-14 sm:pt-20">
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <LeafLogo className="h-7 w-7 shrink-0 text-[#7cc5c4]" />
              <div>
                <div className="font-display text-lg font-semibold leading-none">FinLegacy AI</div>
                <div className="hidden text-[10.5px] uppercase tracking-[0.2em] text-white/50 sm:block">
                  Financial legacy, in action
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onResources}
              className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            >
              Official portals
            </Button>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <Badge variant="outline" className="mb-5 rounded-full border-[#7cc5c4]/40 bg-[#7cc5c4]/10 px-3 py-1 text-[11px] font-medium tracking-wide text-[#7cc5c4]">
                AI-native · Built for India&apos;s BFSI reality
              </Badge>
              <h1 className="font-display text-4xl font-semibold leading-[1.12] sm:text-[3.4rem]">
                Your family&apos;s financial legacy,
                <br />
                <span className="text-[#7cc5c4]">finally within reach.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/70">
                Discover potential forgotten assets, organise documents, and turn complicated claims into clear next
                steps — with an AI agent that moves your case forward, from first question to documented resolution.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={onStart} className="pulse-ring h-12 bg-[#0e7c7b] px-7 text-[15px] font-semibold text-white hover:bg-[#0c6a69]">
                  Start My Journey <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={onDemo}
                  className="h-12 border-white/30 bg-transparent px-6 text-[15px] text-white hover:bg-white/10 hover:text-white"
                >
                  Explore with demo data
                </Button>
              </div>
              <p className="mt-5 text-[12px] text-white/40">
                No banking credentials. No OTPs. Every AI finding is evidence-linked and stays user-confirmed before any action.
              </p>
            </div>

            {/* Scatter → organised visual */}
            <div className="relative hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm lg:block">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/40">The transformation</div>
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {["Old PNB passbook", "LIC receipt", "Unknown CAS", "Dividend warrant 2016", "Locker keys"].map((x) => (
                    <span key={x} className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11.5px] text-white/60 line-through decoration-white/25">
                      {x}
                    </span>
                  ))}
                </div>
                <div className="flex justify-center py-1">
                  <ArrowRight className="h-4 w-4 rotate-90 text-[#7cc5c4]" />
                </div>
                <div className="rounded-xl border border-[#7cc5c4]/25 bg-[#0e7c7b]/15 p-4">
                  <div className="flex items-center justify-between text-[12px] text-[#7cc5c4]">
                    <span className="font-semibold uppercase tracking-wider">Consolidated inventory</span>
                    <span>4 workstreams · 63%</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      ["PNB deposit · **8821", "UDGAM search ready", 80],
                      ["LIC policy · **9021", "Checklist prepared", 60],
                      ["MF folios (2)", "MITRA route", 45],
                    ].map(([a, b, w]) => (
                      <div key={a as string}>
                        <div className="flex justify-between text-[11.5px] text-white/75">
                          <span>{a}</span>
                          <span className="text-white/45">{b}</span>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[#7cc5c4]" style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-navy-deep/60 px-3 py-2 text-[11.5px] text-white/70">
                    <BookCheck className="h-3.5 w-3.5 text-[#7cc5c4]" />
                    Next best action: file deceased-claim forms with PNB — 4 documents ready
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Problem ─── */}
      <section className="border-b bg-card">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-14 md:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            eyebrow="The problem"
            title="Families lose track of what they own — and institutions hold the rest."
            sub="India's unclaimed financial assets run past one lakh crore and keep growing. Behind every figure is a family that doesn't know where to start."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Deposits, investments and insurance drift out of memory and out of reach",
              "No nomination, or unclear ownership across family members",
              "Paper records scattered across homes, lockers and email",
              "Claim processes differ across every bank, insurer and AMC",
              "Rejections cite missing papers no one told you about",
              "No single place that keeps the whole case moving",
            ].map((p) => (
              <div key={p} className="flex items-start gap-2.5 rounded-lg border bg-background px-3.5 py-3 text-[13px] leading-relaxed text-ink/80">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                {p}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Four pillars ─── */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <SectionHeading
            eyebrow="The solution"
            title="An AI agent that understands the situation — then does the work."
            sub="FinLegacy connects your situation, your documents and India's official portals into one guided, trackable journey."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <Card key={p.title} className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-soft text-teal-brand">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-[17px] font-semibold text-navy">{p.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Journey strip */}
          <div className="mt-12 rounded-2xl border bg-card p-6">
            <div className="mb-6 text-center">
              <div className="eyebrow">Dynamic user journey</div>
              <p className="mt-1 text-[14px] text-muted-foreground">You don&apos;t choose a workflow. The agent builds the plan around your facts.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {JOURNEY_STEPS.map((s, i) => (
                <div key={s.title} className="relative rounded-xl border bg-background p-4">
                  <s.icon className="mb-2 h-5 w-5 text-teal-brand" />
                  <div className="text-[13.5px] font-semibold text-navy">{s.title}</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{s.desc}</div>
                  {i < JOURNEY_STEPS.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-border md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Seven journeys ─── */}
      <section className="border-y bg-navy text-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <SectionHeading
            light
            eyebrow="Seven journeys, one engine"
            title="Whatever your situation, the plan is already yours."
            sub="Each journey is a configuration of the same journey engine — so a nominee claim and an estate plan follow equally rigorous, evidence-linked paths."
          />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SEVEN.map((j) => (
              <div key={j.label} className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-[#7cc5c4]/40">
                <j.icon className="mb-2 h-5 w-5 text-[#7cc5c4]" />
                <div className="text-[14px] font-semibold">{j.label}</div>
                <div className="mt-1 text-[12px] leading-relaxed text-white/60">{j.desc}</div>
              </div>
            ))}
            <button
              onClick={onStart}
              className="group flex flex-col items-start justify-between rounded-xl bg-[#0e7c7b] p-4 text-left transition-colors hover:bg-[#0c6a69]"
            >
              <Crown className="mb-2 h-5 w-5 text-white/80" />
              <div className="text-[14px] font-semibold">Your situation here</div>
              <div className="mt-1 flex items-center gap-1 text-[12px] text-white/70">
                Describe it in one sentence <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ─── Moat ─── */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <SectionHeading
                eyebrow="Why FinLegacy"
                title="Hard to copy. Built for the long term."
                sub="Six layers that make the difference between an answer and a resolved case."
              />
              <Button onClick={onStart} className="mt-8 h-11 bg-navy px-6 text-white hover:bg-navy-deep">
                Experience the engine <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {MOAT.map((m, i) => (
                <div key={m.title} className="rounded-xl border bg-card p-4">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-soft font-display text-[12px] font-bold text-teal-brand">
                      {i + 1}
                    </span>
                    <span className="text-[14px] font-semibold text-navy">{m.title}</span>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Official portals ─── */}
      <section className="border-t bg-card">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Grounded in official infrastructure"
              title="Real portals. Honest integrations."
              sub="Where an official API exists, we build it. Where it doesn't, we prepare you and route you — and say so plainly."
            />
            <Button variant="outline" onClick={onResources} className="shrink-0 border-navy/20 text-navy hover:bg-teal-soft">
              Browse the resources centre <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PORTALS.map((p) => (
              <div key={p.name} className="flex items-start gap-3 rounded-xl border bg-background p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
                  <p.icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-[13.5px] font-semibold text-navy">{p.name}</div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">{p.use}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="hero-grid-bg text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-20 text-center">
          <Scale className="mb-4 h-8 w-8 text-[#7cc5c4]" />
          <h2 className="font-display max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
            More clarity today. A safer tomorrow.
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/65">
            One conversation is all it takes for the agent to open your case, map the journey, and put the first
            evidence-backed action in front of you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={onStart} className="h-12 bg-[#0e7c7b] px-8 text-[15px] font-semibold text-white hover:bg-[#0c6a69]">
              Start My Journey
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onDemo}
              className="h-12 border-white/30 px-6 text-[15px] text-white hover:bg-white/10 hover:text-white"
            >
              Explore a demo case
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-2 text-[12px] text-white/40">
            <BookOpenCheck className="h-3.5 w-3.5" /> Hackathon prototype · synthetic demo data · official portals linked, never impersonated
          </div>
        </div>
      </section>

      <TrustFooter dark />
    </div>
  );
}
