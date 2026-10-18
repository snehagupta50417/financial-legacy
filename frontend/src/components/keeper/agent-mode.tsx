"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Check, CircleSlash, Loader2, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { useAgent, type Phase } from "@/keeper/agent";
import { setPrefs, useKeeper } from "@/keeper/store";
import { useRecognitionSupport, VOICE_ERROR_TEXT } from "@/keeper/voice";
import { cn } from "@/lib/utils";
import { plainCopy } from "@/keeper/presentation";
import { Btn } from "./ui";

const LOOP: { id: string; label: string; on: Phase[] }[] = [
  { id: "listen", label: "Listen", on: ["listening", "idle"] },
  { id: "understand", label: "Understand", on: ["thinking"] },
  { id: "act", label: "Act", on: ["acting"] },
  { id: "confirm", label: "Confirm", on: ["confirming"] },
  { id: "speak", label: "Speak", on: ["speaking"] },
];
const CAPTION: Record<Phase, string> = {
  idle: "Tap the mic and talk",
  listening: "Listening. Pause when you’re done",
  thinking: "Understanding",
  acting: "Doing it now",
  confirming: "Waiting for your yes",
  speaking: "Keeper is speaking. Tap to interrupt",
  ended: "Session closed",
};

export function Orb({ phase, onClick, supported = true, small = false }: { phase: Phase; onClick?: () => void; supported?: boolean; small?: boolean }) {
  const live = phase === "listening" || phase === "speaking";
  return (
    <button type="button" onClick={onClick} disabled={!onClick} tabIndex={onClick ? 0 : -1} aria-label={phase === "listening" ? "Stop listening" : "Talk to Keeper"} className={cn("keeper-orb relative flex items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-moss/40", small ? "h-20 w-20" : "h-36 w-36 sm:h-44 sm:w-44", !onClick && "cursor-default")}>
      {live && <><span aria-hidden className={cn("keeper-ring absolute inset-0 rounded-full", phase === "speaking" ? "bg-moss/25" : "bg-apricot/40")} /><span aria-hidden className={cn("keeper-ring absolute inset-0 rounded-full [animation-delay:.9s]", phase === "speaking" ? "bg-moss/20" : "bg-apricot/30")} /></>}
      <span className={cn("relative flex h-full w-full items-center justify-center rounded-full border-2 shadow-sm transition-colors", phase === "listening" ? "border-apricot bg-apricot text-ink" : phase === "speaking" ? "border-moss bg-moss text-white" : phase === "thinking" || phase === "acting" ? "border-ink bg-ink text-ivory" : phase === "confirming" ? "border-apricot bg-paper text-ink" : "border-line bg-paper text-ink")}>
        {phase === "thinking" || phase === "acting" ? <Loader2 className="h-12 w-12 animate-spin" aria-hidden /> : phase === "speaking" ? <Volume2 className={small ? "h-8 w-8" : "h-12 w-12"} aria-hidden /> : supported ? <Mic className={small ? "h-8 w-8" : "h-12 w-12"} aria-hidden /> : <MicOff className={small ? "h-8 w-8" : "h-12 w-12"} aria-hidden />}
      </span>
    </button>
  );
}

export function LoopRail({ phase }: { phase: Phase }) {
  return (
    <ol aria-label="What Keeper is doing" className="flex w-full max-w-md items-center justify-between gap-1">
      {LOOP.map((s, i) => {
        const on = s.on.includes(phase);
        return (
          <li key={s.id} aria-current={on ? "step" : undefined} className="flex flex-1 items-center">
            <span className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border text-[0.7rem] font-semibold transition-all", on ? "scale-110 border-ink bg-ink text-ivory" : "border-line bg-paper text-muted-foreground")}>{i + 1}</span>
              <span className={cn("truncate text-[0.72rem]", on ? "font-semibold text-ink" : "text-muted-foreground")}>{s.label}</span>
            </span>
            {i < LOOP.length - 1 && <span aria-hidden className="mb-4 h-px w-3 shrink-0 bg-line sm:w-5" />}
          </li>
        );
      })}
    </ol>
  );
}

/** The agent screen. The microphone only ever opens after the person has seen what the browser does with audio. */
export function AgentMode({ open, onClose, onTyping }: { open: boolean; onClose: () => void; onTyping: () => void }) {
  const { state } = useKeeper();
  const recognition = useRecognitionSupport();
  if (!open) return null;
  if (!state?.voiceDisclosed && recognition) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Before you use voice" className="fixed inset-0 z-50 flex items-center justify-center bg-ivory p-4">
        <div className="w-full max-w-md rounded-2xl border border-apricot/60 bg-[#fbf1e8] p-5">
          <p className="display text-[1.5rem]">Before you use voice</p>
          <p className="mt-2 text-[0.93rem]">Your browser turns speech into text. In Chrome and Edge, your audio goes to the browser company’s speech service. Keeper stores no audio and listens only while this screen is open. Replies are read aloud by your browser’s own voice. Nothing here needs a paid service.</p>
          <div className="mt-4 flex flex-wrap gap-2"><Btn onClick={() => setPrefs({ voiceDisclosed: true })}>Continue with voice</Btn><Btn variant="quiet" onClick={() => { onTyping(); onClose(); }}>Use typing instead</Btn></div>
        </div>
      </div>
    );
  }
  return <AgentSession onClose={onClose} />;
}

function AgentSession({ onClose }: { onClose: () => void }) {
  const { c } = useKeeper();
  const [muted, setMuted] = useState(false);
  const [typed, setTyped] = useState("");
  const agent = useAgent(!muted);
  const { sp, phase, steps, reply, choices, pending, summary, mode, notice } = agent;
  const logRef = useRef<HTMLDivElement>(null);
  const live = (sp.text + " " + sp.interim).trim();

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [steps.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => { e.preventDefault(); const t = typed.trim(); if (!t) return; setTyped(""); void agent.handle(t, false); };

  return (
    <div role="dialog" aria-modal="true" aria-label="Talk to Keeper" className="fixed inset-0 z-50 flex flex-col bg-ivory">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="display text-[1.4rem] font-semibold tracking-tight">keeper</span>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.78rem] font-medium", mode === "ai" ? "border-moss/40 bg-moss-soft" : "border-line bg-secondary")}>
            <Sparkles className="h-3.5 w-3.5 text-moss" aria-hidden />{mode === "ai" ? "Gemini agent" : "Built-in guide"}
          </span>
          <span className="hidden truncate text-[0.85rem] text-muted-foreground sm:block">{c?.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMuted((m) => !m)} aria-pressed={muted} aria-label={muted ? "Turn Keeper’s voice on" : "Mute Keeper’s voice"} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary">{muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}</button>
          <Btn variant="quiet" className="min-h-11 px-4" onClick={summary ? onClose : agent.finish}><X className="h-4 w-4" aria-hidden />{summary ? "Back to chat" : "End"}</Btn>
        </div>
      </header>

      <div className="scroll-soft flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        {summary ? (
          <div className="settle mx-auto flex max-w-xl flex-col gap-5 pt-4">
            <p className="text-[0.8rem] font-semibold uppercase tracking-wider text-moss">Loop closed</p>
            <h2 className="display text-[1.9rem] leading-tight">{plainCopy(summary.headline)}</h2>
            {summary.did.length > 0 && <ul className="space-y-2" aria-label="What changed">{summary.did.map((d, i) => <li key={i} className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-moss" aria-hidden /><span>{d}</span></li>)}</ul>}
            {summary.next && <div className="rounded-2xl border border-line bg-paper p-4"><p className="text-[0.78rem] font-semibold uppercase tracking-wider text-muted-foreground">Next step</p><p className="mt-1">{summary.next}</p></div>}
            <p className="text-[0.85rem] text-muted-foreground">Your record and this conversation are saved. Nothing was sent to any institution.</p>
            <div className="flex flex-wrap gap-2"><Btn onClick={onClose}>Back to chat <ArrowRight className="h-4 w-4" aria-hidden /></Btn><Btn variant="quiet" onClick={agent.resume}><Mic className="h-4 w-4" aria-hidden />Keep talking</Btn></div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-5">
            {!sp.supported && <p role="status" className="w-full rounded-xl border border-line bg-secondary p-3 text-[0.93rem]">{VOICE_ERROR_TEXT.unsupported} You can still type below and Keeper will answer out loud.</p>}
            {sp.error && sp.error !== "no-speech" && <p role="alert" className="flex w-full gap-2 rounded-xl border border-apricot/60 bg-[#fbf1e8] p-3 text-[0.93rem]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{VOICE_ERROR_TEXT[sp.error]}</p>}
            {notice && <p role="status" className="w-full rounded-xl border border-line bg-secondary p-3 text-[0.88rem]">{notice}</p>}

            <Orb phase={phase} onClick={agent.tapMic} supported={sp.supported} />
            <p role="status" aria-live="polite" className="text-[0.95rem] font-medium">{CAPTION[phase]}</p>
            <LoopRail phase={phase} />

            <div className="min-h-[3.5rem] w-full text-center" aria-live="polite">
              {live ? <p className="display text-[1.5rem] leading-snug"><span>{sp.text}</span>{sp.interim && <span className="text-muted-foreground"> {sp.interim}</span>}</p> : reply ? <p className="mx-auto max-w-xl whitespace-pre-wrap text-[1.12rem] leading-relaxed">{plainCopy(reply).split("\n\nSources\n")[0]}</p> : null}
            </div>

            {pending && (
              <div role="group" aria-label="Please confirm" className="settle w-full rounded-2xl border-2 border-apricot bg-paper p-4">
                <p className="text-[0.78rem] font-semibold uppercase tracking-wider text-muted-foreground">Keeper wants to</p>
                <ul className="mt-2 space-y-1.5">{pending.map((a, i) => <li key={i} className="flex gap-2 font-medium"><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-moss" aria-hidden />{a.label}</li>)}</ul>
                <p className="mt-2 text-[0.85rem] text-muted-foreground">This changes your record. It stays marked as what you said, not verified. Say “yes” or “no”, or tap.</p>
                <div className="mt-3 flex gap-2"><Btn onClick={() => void agent.answerPending(true)}><Check className="h-4 w-4" aria-hidden />Yes, do it</Btn><Btn variant="quiet" onClick={() => void agent.answerPending(false)}><CircleSlash className="h-4 w-4" aria-hidden />Not now</Btn></div>
              </div>
            )}

            {!pending && choices.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Suggested replies">
                {choices.map((ch) => <button key={ch.id} onClick={() => void agent.onChoice(ch)} className="min-h-11 rounded-full border border-moss/40 bg-paper px-4 text-[0.93rem] font-medium hover:bg-moss-soft">{plainCopy(ch.label)}</button>)}
              </div>
            )}

            {steps.length > 0 && (
              <div className="w-full">
                <p className="mb-1 text-[0.8rem] font-semibold uppercase tracking-wider text-muted-foreground">What I did</p>
                <div ref={logRef} className="max-h-44 overflow-y-auto rounded-2xl border border-line bg-paper p-2" role="log" aria-live="polite">
                  {steps.map((s) => (
                    <div key={s.id} className={cn("flex items-start gap-2 rounded-lg px-2 py-1.5 text-[0.9rem]", s.kind === "heard" && "text-muted-foreground")}>
                      <span className="mt-0.5 shrink-0">{s.state === "running" ? <Loader2 className="h-4 w-4 animate-spin text-moss" aria-hidden /> : s.state === "done" ? <Check className="h-4 w-4 text-moss" aria-hidden /> : s.state === "failed" ? <AlertCircle className="h-4 w-4 text-[#b4521a]" aria-hidden /> : <CircleSlash className="h-4 w-4 text-muted-foreground" aria-hidden />}</span>
                      <span className="min-w-0 break-words">{s.text}<span className="sr-only">{s.state === "failed" ? " (did not complete)" : s.state === "skipped" ? " (skipped)" : ""}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!summary && (
        <form onSubmit={submit} className="border-t border-line bg-ivory px-4 py-3 sm:px-8">
          <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-input bg-paper p-1.5 pl-4">
            <input value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Type to Keeper" placeholder="Or type here…" className="min-h-11 flex-1 bg-transparent focus:outline-none" />
            <button type="submit" disabled={!typed.trim()} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-ivory disabled:opacity-40"><Send className="h-4 w-4" aria-hidden /></button>
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[0.78rem] text-muted-foreground">Keeper never asks for passwords, PINs or OTPs, and never sends a claim for you.</p>
        </form>
      )}
    </div>
  );
}
