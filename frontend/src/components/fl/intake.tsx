"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client";
import { takeStartMessage } from "@/lib/start-message";
import { LeafLogo } from "./ui-bits";
import type { ClassifiedSituation, GateSummary } from "@/lib/types";
import { ArrowRight, CircleAlert, CircleCheckBig, CircleHelp, HeartHandshake, NotebookPen, Search, Send, ShieldCheck } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  classification?: ClassifiedSituation;
  gate?: GateSummary;
  aiDegraded?: boolean;
}

const STARTERS = [
  { icon: HeartHandshake, label: "Someone in my family has passed away", text: "My father passed away. Help me find and claim what he left behind." },
  { icon: Search, label: "I want to know what I have", text: "I want to know what financial assets I have. I invested in mutual funds years ago but don't remember where." },
  { icon: NotebookPen, label: "I want my family to find everything later", text: "I want to make sure my family can find everything when I'm gone." },
];

const MORE = [
  "I found an old LIC policy belonging to my mother.",
  "My husband passed away, and I am the nominee on some investments.",
  "My insurance claim was rejected.",
  "I live abroad, but my parents have assets in India.",
  "I am helping my elderly mother organise her finances.",
];

function Understood({ c, gate, onOpen }: { c: ClassifiedSituation; gate?: GateSummary; onOpen?: () => void }) {
  return (
    <div className="mt-3 space-y-3 rounded-2xl border bg-background p-4">
      <div>
        <div className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">What I understood</div>
        <div className="mt-1 text-[17px] font-semibold text-navy">{c.scenarioLabel}</div>
        {c.assetHolderName && (
          <div className="text-[15px] text-ink/80">
            Whose assets: {c.assetHolderName}
            {c.holderLiving === false ? " (passed away)" : ""}
          </div>
        )}
      </div>
      {c.confirmedFacts.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#0b6b6a]">
            <CircleCheckBig className="h-4 w-4" /> What you told me
          </div>
          <ul className="mt-1.5 space-y-1">
            {c.confirmedFacts.slice(0, 6).map((f, i) => (
              <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-ink/90">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-brand" aria-hidden /> {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      {c.assumptions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#7a5a1c]">
            <CircleHelp className="h-4 w-4" /> What I&apos;m assuming — tell me if it&apos;s wrong
          </div>
          <ul className="mt-1.5 space-y-1">
            {c.assumptions.slice(0, 4).map((a, i) => (
              <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-ink/80">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden /> {a}
              </li>
            ))}
          </ul>
        </div>
      )}
      {gate && !gate.discoveryUnlocked && (
        <div className="flex gap-2.5 rounded-xl bg-teal-soft/70 px-3.5 py-3 text-[15px] leading-relaxed text-ink/90">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-brand" />
          <span>
            <span className="font-semibold">Next: {gate.nextLabel ?? "verification"}.</span>{" "}
            {gate.journeyKind === "personal"
              ? "One quick identity check, then we start looking for your assets."
              : "Before anything about the assets is looked up, we check who you are, the death and your relationship."}
          </span>
        </div>
      )}
      {onOpen && (
        <Button onClick={onOpen} className="h-11 w-full rounded-xl bg-teal-brand text-[16px] font-semibold text-white hover:bg-[#0c6a69] sm:w-auto sm:px-6">
          Open my case <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/** Start — the first conversation, which creates the case (FL-01). */
export default function Intake({ onWorkspace }: { onWorkspace: (caseId: string) => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "I'm here to help, one step at a time. Tell me what's happened — a sentence is enough. I'll work out what you need, keep what you tell me separate from what I'm assuming, and only ask what's essential.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

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
      const res = await api.post<{ reply: string; classification: ClassifiedSituation; caseId: string; aiDegraded: boolean; gate: GateSummary }>(
        "/api/intake",
        { message: trimmed, caseId }
      );
      setMessages((m) => [...m, { role: "assistant", content: res.reply, classification: res.classification, gate: res.gate, aiDegraded: res.aiDegraded }]);
      setCaseId((id) => id ?? res.caseId);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `${e instanceof Error && e.message ? e.message : "Something went wrong."} What you wrote is back in the box — please try again.` },
      ]);
      setInput(trimmed);
    } finally {
      setBusy(false);
    }
  }

  // A message typed on the landing page starts the conversation straight away.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const first = takeStartMessage();
    if (first) setTimeout(() => void send(first), 0);
  }, []);

  const lastClassified = messages.reduce((acc, m, i) => (m.classification ? i : acc), -1);
  const userCount = messages.filter((m) => m.role === "user").length;

  return (
    <div className="paper-wash flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col">
      <div className="mx-auto flex w-full min-w-0 max-w-[780px] flex-1 flex-col px-4 pt-6 sm:pt-10">
        <div className="flex-1 space-y-5 pb-6" aria-live="polite">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-navy px-4 py-3 text-[16px] leading-relaxed text-white">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-[#7cc5c4]" aria-hidden>
                  <LeafLogo className="h-5 w-5" />
                </span>
                <div className="assistant-bubble min-w-0 flex-1 px-4 py-3.5 shadow-sm sm:px-5">
                  <div className="whitespace-pre-wrap text-[16px] leading-relaxed text-ink">{m.content}</div>
                  {m.aiDegraded && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-gold-soft px-3 py-2 text-[14px] text-[#7a5a1c]">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> The AI service was unreachable, so I used simple rules. Nothing was invented.
                    </div>
                  )}
                  {m.classification && (
                    <Understood c={m.classification} gate={m.gate} onOpen={i === lastClassified && caseId ? () => onWorkspace(caseId) : undefined} />
                  )}
                  {i === 0 && userCount === 0 && (
                    <div className="mt-4 flex flex-col gap-2">
                      {STARTERS.map((s) => (
                        <button
                          key={s.label}
                          disabled={busy}
                          onClick={() => send(s.text)}
                          className="flex min-h-12 items-center gap-3 rounded-xl border bg-background px-4 py-2.5 text-left text-[16px] font-medium text-navy transition-colors hover:border-teal-brand/40 hover:bg-teal-soft disabled:opacity-50"
                        >
                          <s.icon className="h-5 w-5 shrink-0 text-teal-brand" /> {s.label}
                        </button>
                      ))}
                      <details className="mt-1">
                        <summary className="min-h-10 cursor-pointer py-2 text-[15px] font-medium text-teal-brand">Other situations</summary>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {MORE.map((ex) => (
                            <button
                              key={ex}
                              disabled={busy}
                              onClick={() => send(ex)}
                              className="min-h-10 rounded-full border bg-background px-3.5 text-left text-[14px] text-ink/85 hover:bg-teal-soft disabled:opacity-50"
                            >
                              {ex}
                            </button>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
          {busy && (
            <div className="flex gap-3" role="status">
              <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-[#7cc5c4]" aria-hidden>
                <LeafLogo className="h-5 w-5" />
              </span>
              <div className="assistant-bubble flex items-center gap-2 px-4 py-3 text-muted-foreground">
                <span className="typing-dots text-teal-brand" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
                <span className="text-[15px]">Understanding your situation…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="flex items-end gap-2">
            <label htmlFor="intake-message" className="sr-only">Describe your situation</label>
            <Textarea
              id="intake-message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={userCount ? "Add anything else, or correct me…" : "Describe what happened…"}
              className="min-h-12 flex-1 resize-none bg-card text-[16px]"
              disabled={busy}
            />
            <Button onClick={() => send(input)} disabled={busy || !input.trim()} className="h-12 w-12 shrink-0 bg-navy p-0 text-white hover:bg-navy-deep" aria-label="Send message">
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Never share passwords, OTPs or full account numbers. Enter to send, Shift+Enter for a new line.
          </p>
        </div>
      </div>
    </div>
  );
}
