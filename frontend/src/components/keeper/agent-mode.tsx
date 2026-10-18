"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Check, CircleSlash, Headset, Keyboard, Loader2, MessageSquare, Mic, MicOff, PhoneOff, Send, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useAgent, type Phase } from "@/keeper/agent";
import { setPrefs, useKeeper } from "@/keeper/store";
import { LANGUAGE_NAMES } from "@/keeper/sarvam-speech";
import { stopSpeaking, useRecognitionSupport, VOICE_ERROR_TEXT } from "@/keeper/voice";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  idle: "Tap the orb to talk",
  listening: "Listening. Pause when you’re done",
  thinking: "Understanding",
  acting: "Doing it now",
  confirming: "Waiting for your yes",
  speaking: "Keeper is speaking. Tap to interrupt",
  ended: "Call ended",
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

/** Ringing before Keeper picks up, so it feels like a call and the voice has a moment to be ready. */
const RING_MS = 1600;
const pace = (ms: number) => (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 1 : ms);
const clock = (s: number) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");

/** The call screen. The microphone only ever opens after the person has seen what the browser does with audio. */
export function AgentMode({ open, onClose, onTyping, startWith }: { open: boolean; onClose: () => void; onTyping: () => void; startWith?: string }) {
  const { state } = useKeeper();
  const recognition = useRecognitionSupport();
  if (!open) return null;
  if (!state?.voiceDisclosed && recognition) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Before you call Keeper" className="fixed inset-0 z-50 flex items-center justify-center bg-ivory p-4">
        <div className="w-full max-w-md rounded-2xl border border-apricot/60 bg-[#fbf1e8] p-5">
          <p className="display text-[1.5rem]">Before you call Keeper</p>
          <p className="mt-2 text-[0.93rem]">Your browser turns your speech into text. In Chrome and Edge, your audio goes to the browser company’s speech service. Keeper stores no audio and listens only while the call is open. Keeper’s voice comes from Google Gemini when AI help is on, or from your browser’s own voice. Nothing here needs a paid service.</p>
          <div className="mt-4 flex flex-wrap gap-2"><Btn onClick={() => setPrefs({ voiceDisclosed: true })}>Start the call</Btn><Btn variant="quiet" onClick={() => { onTyping(); onClose(); }}>Chat instead</Btn></div>
        </div>
      </div>
    );
  }
  return <CallRoom onClose={onClose} startWith={startWith} />;
}

function CallButton({ icon: Icon, label, onClick, pressed, danger, badge }: { icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; label: string; onClick: () => void; pressed?: boolean; danger?: boolean; badge?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={pressed} className="group flex w-16 flex-col items-center gap-1.5 outline-none">
      <span className={cn("relative flex h-14 w-14 items-center justify-center rounded-full border transition-colors group-focus-visible:ring-4 group-focus-visible:ring-moss/40", danger ? "border-[#a03a2a] bg-[#a03a2a] text-white group-hover:bg-[#8a3123]" : pressed ? "border-ink bg-ink text-ivory" : "border-line bg-paper text-ink group-hover:bg-secondary")}>
        <Icon className="h-6 w-6" aria-hidden />
        {badge && <span aria-hidden className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-ivory bg-apricot" />}
      </span>
      <span className="text-[0.75rem] text-muted-foreground">{label}</span>
    </button>
  );
}

function CallRoom({ onClose, startWith }: { onClose: () => void; startWith?: string }) {
  const { c } = useKeeper();
  const [speaker, setSpeaker] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [transcript, setTranscript] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [note, setNote] = useState("");
  const [ringing, setRinging] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const agent = useAgent(speaker, { micOn, delayMs: pace(RING_MS), startWith });
  const { sp, phase, steps, reply, choices, pending, summary, mode, notice, handoffOffer, handoffSent } = agent;
  const live = (sp.text + " " + sp.interim).trim();
  const messages = c?.threads.find((t) => t.id === c.activeThread)?.messages ?? [];

  useEffect(() => { const id = setTimeout(() => setRinging(false), pace(RING_MS)); return () => clearTimeout(id); }, []);
  useEffect(() => {
    if (ringing || summary) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [ringing, summary]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !handoffOpen && !transcript) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, handoffOpen, transcript]);

  const dialogOpen = handoffOpen || handoffOffer === "person_asked";
  const closeDialog = () => { setHandoffOpen(false); agent.setHandoffOffer(null); };
  const toggleMic = () => { if (micOn) { setMicOn(false); agent.pauseMic(); } else { setMicOn(true); agent.tapMic(); } };
  const send = (e: React.FormEvent) => { e.preventDefault(); const t = typed.trim(); if (!t) return; setTyped(""); void agent.handle(t, false); };
  const status = summary ? "Call ended" : ringing ? "Calling Keeper…" : `On call · ${clock(seconds)}`;

  return (
    <div role="dialog" aria-modal="true" aria-label="Call with Keeper" className="fixed inset-0 z-50 flex flex-col bg-ivory">
      <header className="flex items-center justify-between gap-2 px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="display flex h-10 w-10 items-center justify-center rounded-full bg-moss text-[1.2rem] font-semibold text-white">k</span>
          <div className="min-w-0 leading-tight">
            <p className="font-semibold">Keeper</p>
            <p role="status" aria-live="polite" className="text-[0.85rem] text-muted-foreground">{status}</p>
          </div>
          <span className={cn("hidden items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.75rem] font-medium sm:inline-flex", mode === "ai" ? "border-moss/40 bg-moss-soft" : "border-line bg-secondary")}><Sparkles className="h-3.5 w-3.5 text-moss" aria-hidden />{mode === "ai" ? "Gemini" : "Built-in guide"}</span>
          {agent.engine === "sarvam" && <span className="hidden items-center rounded-full border border-line bg-paper px-2.5 py-0.5 text-[0.75rem] font-medium sm:inline-flex" title="Keeper understands Indian languages">{agent.language && agent.language !== "en-IN" ? LANGUAGE_NAMES[agent.language] ?? "Your language" : "Any Indian language"}</span>}
        </div>
        <button onClick={() => setTranscript(true)} aria-label="Show the written conversation" className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary"><MessageSquare className="h-5 w-5" aria-hidden /></button>
      </header>

      <div className="scroll-soft flex-1 overflow-y-auto px-4 pb-4 sm:px-8">
        {summary ? (
          <div className="settle mx-auto flex max-w-xl flex-col gap-5 pt-6">
            <p className="text-[0.8rem] font-semibold uppercase tracking-wider text-moss">Call ended · {clock(seconds)}</p>
            <h2 className="display text-[1.9rem] leading-tight">{plainCopy(summary.headline)}</h2>
            {summary.did.length > 0 && <ul className="space-y-2" aria-label="What changed">{summary.did.map((d, i) => <li key={i} className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-moss" aria-hidden /><span>{d}</span></li>)}</ul>}
            {summary.next && <div className="rounded-2xl border border-line bg-paper p-4"><p className="text-[0.78rem] font-semibold uppercase tracking-wider text-muted-foreground">Next step</p><p className="mt-1">{summary.next}</p></div>}
            {handoffSent && <p className="flex gap-2 text-[0.93rem]"><Check className="mt-1 h-4 w-4 shrink-0 text-moss" aria-hidden />You asked for a person to look at this. {handoffSent.simulated ? "In this example nobody is on the other end." : "Nobody has picked it up yet."}</p>}
            <p className="text-[0.85rem] text-muted-foreground">Your record and this conversation are saved. Nothing was sent to any institution.</p>
            <div className="flex flex-wrap gap-2"><Btn onClick={onClose}>Done <ArrowRight className="h-4 w-4" aria-hidden /></Btn><Btn variant="quiet" onClick={agent.resume}><Mic className="h-4 w-4" aria-hidden />Keep talking</Btn></div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 pt-2">
            {agent.consentNeeded && !ringing && (
              <div role="group" aria-label="Turn on AI help" className="w-full rounded-2xl border border-apricot/60 bg-[#fbf1e8] p-4">
                <p className="font-semibold">Let Keeper use AI to understand you</p>
                <p className="mt-1 text-[0.9rem]">Keeper uses Google Gemini to follow what you say and to speak back, and Sarvam to understand Indian languages. Without it, Keeper uses a simpler built-in guide. Use made-up details only while this is a demo.</p>
                <div className="mt-3"><Btn onClick={() => void agent.allowAi()}>Allow AI help</Btn></div>
              </div>
            )}
            {agent.aiReason && agent.aiReason !== "consent" && !ringing && (
              <div role="note" aria-label="Keeper is in basic mode" className="w-full rounded-2xl border border-apricot/60 bg-[#fbf1e8] p-4 text-left">
                <p className="font-semibold">Keeper is in basic mode right now</p>
                <p className="mt-1 text-[0.9rem]">{agent.aiReason === "example" ? "In the example, Keeper follows a script, so it can’t hold a real conversation. To talk freely, open the sign-in page, choose “Continue to Keeper”, and make sure Keeper’s AI key is set up." : "Keeper follows a simple script until it has an AI key, so it can’t talk with you freely or understand you properly. To switch it on, stop the app, run this in the project folder, then start the app again:"}</p>
                {agent.aiReason === "not_configured" && <code className="mt-2 block rounded-lg bg-ink px-3 py-2 text-[0.85rem] text-ivory">npm run set-key</code>}
              </div>
            )}
            {!sp.supported && <p role="status" className="w-full rounded-xl border border-line bg-secondary p-3 text-[0.93rem]">{VOICE_ERROR_TEXT.unsupported} You can type from the keyboard button, and Keeper will answer out loud.</p>}
            {sp.error && sp.error !== "no-speech" && <p role="alert" className="flex w-full gap-2 rounded-xl border border-apricot/60 bg-[#fbf1e8] p-3 text-[0.93rem]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{VOICE_ERROR_TEXT[sp.error]}</p>}
            {notice && !agent.consentNeeded && <p role="status" className="w-full rounded-xl border border-line bg-secondary p-3 text-[0.88rem]">{notice}</p>}

            <div className="mt-2 flex flex-col items-center gap-3">
              <Orb phase={ringing ? "idle" : phase} onClick={ringing ? undefined : agent.tapMic} supported={sp.supported} />
              <p role="status" aria-live="polite" className="text-[0.9rem] font-medium text-ink/80">{ringing ? "Ringing…" : !micOn && phase === "idle" ? "Your mic is muted" : CAPTION[phase]}</p>
            </div>

            <div className="min-h-[7rem] w-full text-center" aria-live="polite">
              {live && <p className="mx-auto max-w-xl text-[1.05rem] italic text-ink/70">“{sp.text}{sp.interim && <span className="text-muted-foreground"> {sp.interim}</span>}”</p>}
              {!live && reply && !ringing && <p className="display mx-auto line-clamp-6 max-w-xl whitespace-pre-wrap text-[1.45rem] leading-snug sm:text-[1.7rem]">{plainCopy(reply).split("\n\nSources\n")[0]}</p>}
            </div>

            {pending && (
              <div role="group" aria-label="Please confirm" className="settle w-full rounded-2xl border-2 border-apricot bg-paper p-4">
                <p className="text-[0.78rem] font-semibold uppercase tracking-wider text-muted-foreground">Keeper wants to</p>
                <ul className="mt-2 space-y-1.5">{pending.map((a, i) => <li key={i} className="flex gap-2 font-medium"><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-moss" aria-hidden />{a.label}</li>)}</ul>
                <p className="mt-2 text-[0.85rem] text-muted-foreground">This changes your record. It stays marked as what you said, not verified. Say “yes” or “no”, or tap.</p>
                <div className="mt-3 flex gap-2"><Btn onClick={() => void agent.answerPending(true)}><Check className="h-4 w-4" aria-hidden />Yes, do it</Btn><Btn variant="quiet" onClick={() => void agent.answerPending(false)}><CircleSlash className="h-4 w-4" aria-hidden />Not now</Btn></div>
              </div>
            )}

            {handoffOffer === "keeper_unsure" && !handoffSent && (
              <div role="group" aria-label="Bring in a person" className="settle w-full rounded-2xl border border-moss/40 bg-moss-soft/60 p-4">
                <p className="font-semibold">Want a person to look at this?</p>
                <p className="mt-1 text-[0.9rem]">Keeper may not have understood everything. A person can read this conversation and follow up.</p>
                <div className="mt-3 flex flex-wrap gap-2"><Btn onClick={() => setHandoffOpen(true)}><Headset className="h-4 w-4" aria-hidden />Ask a person</Btn><Btn variant="quiet" onClick={() => agent.setHandoffOffer(null)}>No, keep going</Btn></div>
              </div>
            )}

            {!pending && choices.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Suggested replies">
                {choices.map((ch) => <button key={ch.id} onClick={() => void agent.onChoice(ch)} className="min-h-11 rounded-full border border-moss/40 bg-paper px-4 text-[0.93rem] font-medium hover:bg-moss-soft">{plainCopy(ch.label)}</button>)}
              </div>
            )}
          </div>
        )}
      </div>

      {!summary && (
        <div className="border-t border-line bg-ivory px-4 pb-4 pt-3 sm:px-8">
          {typing && (
            <form onSubmit={send} className="mx-auto mb-3 flex max-w-xl items-center gap-2 rounded-full border border-input bg-paper p-1.5 pl-4">
              <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Type to Keeper" placeholder="Type instead of speaking…" className="min-h-11 flex-1 bg-transparent focus:outline-none" />
              <button type="submit" disabled={!typed.trim()} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-ivory disabled:opacity-40"><Send className="h-4 w-4" aria-hidden /></button>
            </form>
          )}
          <div className="mx-auto flex max-w-xl items-start justify-center gap-4 sm:gap-6">
            <CallButton icon={micOn ? Mic : MicOff} label={micOn ? "Mute" : "Unmute"} onClick={toggleMic} pressed={!micOn} />
            <CallButton icon={speaker ? Volume2 : VolumeX} label={speaker ? "Speaker" : "Silent"} onClick={() => { setSpeaker((v) => !v); stopSpeaking(); }} pressed={!speaker} />
            <CallButton icon={Keyboard} label="Type" onClick={() => setTyping((v) => !v)} pressed={typing} />
            <CallButton icon={Headset} label="Person" onClick={() => setHandoffOpen(true)} badge={handoffOffer === "keeper_unsure" && !handoffSent} />
            <CallButton icon={PhoneOff} label="End" onClick={agent.finish} danger />
          </div>
          <p className="mx-auto mt-3 max-w-xl text-center text-[0.75rem] text-muted-foreground">Keeper never asks for passwords, PINs or OTPs, and never sends a claim for you.</p>
        </div>
      )}

      <Sheet open={transcript} onOpenChange={setTranscript}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-ivory sm:max-w-md">
          <SheetHeader className="p-0"><SheetTitle className="display text-[1.5rem]">The written conversation</SheetTitle><SheetDescription>What was said on this call, and what Keeper did.</SheetDescription></SheetHeader>
          <div className="space-y-2 px-4 pb-6">
            {messages.length === 0 && <p className="text-[0.93rem] text-muted-foreground">Nothing yet. Words from the call appear here.</p>}
            {messages.map((m) => (
              <div key={m.id} className={cn("rounded-2xl px-3.5 py-2.5 text-[0.93rem]", m.role === "user" ? "ml-8 bg-ink text-ivory" : "mr-8 border border-line bg-paper")}>
                <span className="sr-only">{m.role === "user" ? "You: " : "Keeper: "}</span>{plainCopy(m.text).split("\n\nSources\n")[0]}
              </div>
            ))}
            {steps.length > 0 && (
              <div className="pt-3">
                <p className="mb-1 text-[0.78rem] font-semibold uppercase tracking-wider text-muted-foreground">What Keeper did</p>
                <ul className="space-y-1">
                  {steps.filter((s) => s.kind !== "heard").map((s) => (
                    <li key={s.id} className="flex items-start gap-2 text-[0.88rem]">
                      <span className="mt-0.5 shrink-0">{s.state === "running" ? <Loader2 className="h-4 w-4 animate-spin text-moss" aria-hidden /> : s.state === "done" ? <Check className="h-4 w-4 text-moss" aria-hidden /> : s.state === "failed" ? <AlertCircle className="h-4 w-4 text-[#b4521a]" aria-hidden /> : <CircleSlash className="h-4 w-4 text-muted-foreground" aria-hidden />}</span>
                      <span className="min-w-0 break-words">{s.text}<span className="sr-only">{s.state === "failed" ? " (did not complete)" : s.state === "skipped" ? " (skipped)" : ""}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="display text-[1.5rem]">{handoffSent ? "Request saved" : "Ask a person to look at this"}</DialogTitle>
            <DialogDescription>{handoffSent ? "" : "Use this if Keeper didn’t understand your problem, or you’d rather speak to someone."}</DialogDescription>
          </DialogHeader>
          {handoffSent ? (
            <div className="space-y-3 text-[0.95rem]">
              <p className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-moss" aria-hidden />{handoffSent.simulated ? "In this example, nobody is on the other end. A real request is saved with your case." : "Your request is saved with your case. Nobody has picked it up yet, and Keeper can’t say when someone will."}</p>
              <p className="text-ink/80">A person would see this conversation with names and numbers hidden, so you don’t have to repeat yourself. {!handoffSent.simulated && <>Reference: <b>{handoffSent.id.slice(-6)}</b></>}</p>
              <Btn onClick={closeDialog}>Back to the call</Btn>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await agent.requestHuman(handoffOffer === "keeper_unsure" ? "keeper_unsure" : "person_asked", note); if (r) { setNote(""); setHandoffOpen(true); } }}>
              <label className="block"><span className="text-[0.88rem] font-medium">What should the person know? <span className="font-normal text-muted-foreground">(optional)</span></span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={4} placeholder="For example: I’m not sure which bank this is about." className="mt-1 w-full rounded-xl border border-input bg-paper p-3" /></label>
              <p className="text-[0.85rem] text-muted-foreground">They’ll see our conversation with names and numbers hidden. Don’t type account numbers, passwords or OTPs.</p>
              {notice && <p role="alert" className="text-[0.88rem] text-[#a03a2a]">{notice}</p>}
              <div className="flex flex-wrap gap-2"><Btn type="submit"><Headset className="h-4 w-4" aria-hidden />Ask a person</Btn><Btn type="button" variant="quiet" onClick={closeDialog}>Not now</Btn></div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
