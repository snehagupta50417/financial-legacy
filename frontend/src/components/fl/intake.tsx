"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/client";
import { ConfidenceMeter, LeafLogo, DemoBadge } from "./ui-bits";
import type { ClassifiedSituation, GateSummary } from "@/lib/types";
import {
  ArrowRight,
  Bot,
  CircleAlert,
  CircleCheckBig,
  CircleHelp,
  Send,
  Sparkles,
} from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  classification?: ClassifiedSituation;
  aiDegraded?: boolean;
}

const EXAMPLES = [
  "My father passed away, and I don't know which banks he used.",
  "I found an old LIC policy belonging to my mother.",
  "My husband passed away, and I am the nominee on some investments.",
  "We found an old mutual fund statement but don't know if the investment still exists.",
  "I want to create a will and organise all my financial assets.",
  "My insurance claim was rejected.",
  "I live abroad, but my parents have assets in India.",
  "I am helping my elderly mother organise her finances.",
];

export default function Intake({
  onWorkspace,
  initialCaseId,
  onCaseCreated,
}: {
  onWorkspace: (caseId: string) => void;
  initialCaseId?: string | null;
  onCaseCreated: (caseId: string) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Let's help you find, protect, or recover your family's financial legacy. What's your situation?\n\nDescribe it in your own words — a sentence is enough. I'll classify the case, note confirmed facts separately from assumptions, ask only what's essential, and build your personalised journey.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [latest, setLatest] = useState<ClassifiedSituation | null>(null);
  const [aiDegraded, setAiDegraded] = useState(false);
  const [gate, setGate] = useState<GateSummary | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setBusy(true);
    try {
      const res = await api.post<{
        reply: string;
        classification: ClassifiedSituation;
        caseId: string;
        aiDegraded: boolean;
        gate: GateSummary;
      }>("/api/intake", { message: trimmed, caseId });
      setGate(res.gate);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.reply, classification: res.classification, aiDegraded: res.aiDegraded },
      ]);
      setLatest(res.classification);
      setAiDegraded(res.aiDegraded);
      if (!caseId) {
        setCaseId(res.caseId);
        onCaseCreated(res.caseId);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            e instanceof Error && e.message
              ? `${e.message} Your conversation is safe — please try sending that again.`
              : "Something went wrong. Your conversation is safe — please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_360px]">
      {/* Conversation column */}
      <div className="flex min-h-[70vh] flex-col rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[#7cc5c4]">
              <LeafLogo className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-navy">Legacy Intake Agent</div>
              <div className="text-[11px] text-muted-foreground">Understands your situation · builds your journey</div>
            </div>
          </div>
          {latest && caseId && (
            <Button size="sm" onClick={() => onWorkspace(caseId)} className="bg-teal-brand text-white hover:bg-[#0c6a69]">
              Open case workspace <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="nice-scroll flex-1 overflow-y-auto px-5 py-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-navy px-4 py-3 text-[13.5px] leading-relaxed text-white"
                      : "max-w-[90%] rounded-2xl rounded-bl-md border bg-background px-4 py-3 text-[13.5px] leading-relaxed text-ink"
                  }
                >
                  {m.role === "assistant" && (
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-teal-brand">
                      <Bot className="h-3 w-3" /> Financial Legacy assistant
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.role === "assistant" && m.aiDegraded && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-md bg-gold-soft px-2 py-1.5 text-[11px] text-gold">
                      <CircleAlert className="h-3 w-3" /> AI service unreachable — rule-based classification used. Nothing was invented.
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border bg-background px-4 py-3 text-muted-foreground">
                  <div className="typing-dots text-teal-brand">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="text-[12px]">Understanding your situation…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Suggested prompts */}
        <div className="border-t bg-background/60 px-5 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3 text-gold" /> Or start from an example
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 nice-scroll">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                disabled={busy}
                onClick={() => send(ex)}
                className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-[12px] text-ink/75 transition-colors hover:border-teal-brand/40 hover:bg-teal-soft disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t px-5 py-4">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Describe your situation… (Enter to send, Shift+Enter for a new line)"
              className="min-h-[52px] flex-1 resize-none text-[13.5px]"
              disabled={busy}
            />
            <Button
              size="icon"
              onClick={() => send(input)}
              disabled={busy || !input.trim()}
              className="h-[52px] w-[52px] shrink-0 bg-navy text-white hover:bg-navy-deep"
              aria-label="Send message"
            >
              <Send className="h-4.5 w-4.5" />
            </Button>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
            Share only what you&apos;re comfortable with — never bank credentials, OTPs, or full account numbers.
            Confirmed facts are stored separately from AI assumptions, and you can delete your data anytime.
          </p>
        </div>
      </div>

      {/* Understanding panel */}
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[13px] font-semibold text-navy">What the agent understands</div>
            {latest && <ConfidenceMeter value={latest.confidence} />}
          </div>
          {!latest ? (
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              As you describe your situation, the agent classifies it, separates confirmed facts from assumptions, and
              lists exactly what it still needs to know. This panel updates live.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-teal-soft/70 px-3 py-2.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-teal-brand">Journey type</div>
                <div className="mt-0.5 text-[13.5px] font-semibold text-navy">{latest.scenarioLabel}</div>
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-brand">
                  <CircleCheckBig className="h-3 w-3" /> Confirmed facts
                </div>
                <ul className="space-y-1">
                  {latest.confirmedFacts.slice(0, 6).map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-ink/85">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal-brand" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              {latest.assumptions.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold">
                    <CircleHelp className="h-3 w-3" /> Assumptions — correct me
                  </div>
                  <ul className="space-y-1">
                    {latest.assumptions.slice(0, 4).map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-ink/70">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" /> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {latest.assetCategories.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Asset categories</div>
                  <div className="flex flex-wrap gap-1.5">
                    {latest.assetCategories.map((c) => (
                      <Badge key={c} variant="outline" className="rounded-full text-[11px] capitalize text-navy">
                        {c.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {gate && !gate.discoveryUnlocked && gate.nextLabel && (
          <div className="rounded-2xl border border-navy/15 bg-card p-4 text-[12.5px] leading-relaxed text-ink/80 shadow-sm">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-navy">Next: {gate.nextLabel}</div>
            {gate.journeyKind === "personal"
              ? "One quick identity check, then we start looking for your assets."
              : "Before anything about the assets is looked up, you'll verify your identity, the death and your relationship. Name, date of birth and PAN alone unlock nothing."}
          </div>
        )}

        {caseId && (
          <Button onClick={() => onWorkspace(caseId)} className="w-full bg-teal-brand text-white hover:bg-[#0c6a69]">
            Continue to case workspace <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        <div className="rounded-2xl border border-teal-brand/20 bg-teal-soft/50 p-5">
          <div className="text-[13px] font-semibold text-navy">How your data is handled</div>
          <ul className="mt-2.5 space-y-2 text-[12px] leading-relaxed text-ink/75">
            <li className="flex gap-2"><CircleCheckBig className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-brand" /> Purpose-specific consent, revocable anytime</li>
            <li className="flex gap-2"><CircleCheckBig className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-brand" /> Session-scoped storage — nobody else can see your case</li>
            <li className="flex gap-2"><CircleCheckBig className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-brand" /> Masked references; no full account numbers required</li>
            <li className="flex gap-2"><CircleCheckBig className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-brand" /> Nothing is submitted externally without your explicit approval</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
