"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client";
import type { AgentAction } from "@shared/contracts";
import { dispatch, getBackendStatus, peekState } from "./store";
import { nextWork, plainCopy } from "./presentation";
import type { Choice, Message } from "./types";
import { useSarvamSpeech } from "./sarvam-speech";
import { resetKeeperVoice, speak, speakKeeper, stopSpeaking, useSpeech } from "./voice";

/**
 * Keeper's voice-first agent loop, in the browser:
 *   listen -> understand (Gemini plans) -> act (vetted actions) -> confirm (anything that changes the
 *   record needs a yes) -> speak -> listen again ... until the person is done, then close with a summary.
 * The model only proposes. Every action runs through the same dispatch the buttons use, so trust gates,
 * masking and ownership stay in code. Without AI (not signed in, no opt-in, no key, outage) the same loop
 * runs on Keeper's built-in interviewer, so voice never depends on a model.
 */

export type Phase = "idle" | "listening" | "thinking" | "acting" | "confirming" | "speaking" | "ended";
export interface Step { id: number; kind: "heard" | "act" | "info"; text: string; state: "running" | "done" | "failed" | "skipped" }
type Turn = { say: string; actions: AgentAction[]; listen: boolean; finish: boolean; handoff?: boolean };
export type HandoffWhy = "person_asked" | "keeper_unsure" | "sensitive";
export interface HandoffResult { id: string; simulated: boolean }
type AskReply = { answer: string; sources: { n: number; title: string; url: string | null; excerpt: string }[] };

const YES = /^\s*(yes|yeah|yep|yup|sure|ok|okay|confirm|go ahead|do it|please do|haan|ha|theek hai)\b/i;
const NO = /^\s*(no|nope|nah|don'?t|skip|cancel|not now|stop that|nahi|nahin)\b/i;
const DONE = /\b(that'?s (all|it)|i'?m done|we'?re done|all done|goodbye|bye|that will be all)\b/i;
const HUMAN = /\b(human|real person|actual person|talk to (a |an )?(person|someone|agent|advisor|adviser)|speak (to|with) (a |an )?(person|someone|agent|advisor|adviser)|connect me to (a |an )?(person|someone|agent))\b/i;
const GREETING = "Hi, I'm Keeper. Tell me what you'd like to sort out, or ask me anything about your family's financial records.";

const withoutSources = (t: string) => { const i = t.indexOf("\n\nSources\n"); return plainCopy(i < 0 ? t : t.slice(0, i)); };
const sourcesBlock = (r: AskReply) => (r.sources.length ? "\n\nSources\n" + r.sources.map((x) => "[" + x.n + "] " + x.title + (x.url ? "\n" + x.url : "") + "\n" + x.excerpt).join("\n\n") : "");

/** Mount this only while the agent screen is open: it greets on mount and releases the mic and voice on unmount. */
function opening() {
  const s = peekState(); const c = s?.cases[s.activeCase]; const th = c?.threads.find((t) => t.id === c.activeThread);
  const last = th?.messages.filter((m) => m.role !== "user").at(-1);
  return {
    mode: "basic" as "ai" | "basic",
    hello: last && last.pending ? withoutSources(last.text).slice(0, 280) : GREETING,
    choices: last?.pending ? (last.choices ?? []).filter((x) => x.id !== "m:sample") : [],
  };
}

export function useAgent(speakAloud: boolean, opts: { micOn?: boolean; delayMs?: number; startWith?: string } = {}) {
  const { micOn = true, delayMs = 0, startWith } = opts;
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [steps, setSteps] = useState<Step[]>([]);
  const [reply, setReply] = useState("");
  const [start] = useState(opening);
  const [choices, setChoices] = useState<Choice[]>(start.choices);
  const [pending, setPendingState] = useState<AgentAction[] | null>(null);
  const [summary, setSummary] = useState<{ headline: string; did: string[]; next: string | null } | null>(null);
  const [mode, setMode] = useState<"ai" | "basic">(start.mode);
  const [notice, setNotice] = useState<string | null>(null);
  const [consentNeeded, setConsentNeeded] = useState(false);
  const [handoffOffer, setHandoffOffer] = useState<HandoffWhy | null>(null);
  const [handoffSent, setHandoffSent] = useState<HandoffResult | null>(null);

  const phaseRef = useRef<Phase>("idle");
  const pendingRef = useRef<{ actions: AgentAction[]; user: string; voice: boolean; say: string } | null>(null);
  const history = useRef<{ role: "user" | "keeper"; text: string }[]>([]);
  const aiBlocked = useRef(false);
  const stepId = useRef(0);
  const stepsRef = useRef<Step[]>([]);
  const busy = useRef(false);
  const micRef = useRef(micOn);
  const confused = useRef(0);
  const aiVoice = useRef(false);
  useEffect(() => { micRef.current = micOn; }, [micOn]);
  // Two recognisers: Sarvam's (Indian languages, detected per turn) when the backend has it, else the browser's.
  const [engine, setEngine] = useState<"browser" | "sarvam">("browser");
  const [language, setLanguage] = useState<string | null>(null);
  const web = useSpeech();
  const sarvam = useSarvamSpeech({ onFail: (reason) => {
    setEngine("browser");
    setNotice(reason === "quota" ? "Speech in your language is busy, so Keeper is using your browser's speech recognition for now." : "Speech in your language isn't available right now, so Keeper is using your browser's speech recognition.");
    phaseRef.current = "idle"; setPhaseState("idle");
  } });
  const sp = engine === "sarvam" && sarvam.supported ? sarvam : web;
  const langRef = useRef<string | null>(null);
  const speakRef = useRef(speakAloud);
  useEffect(() => { speakRef.current = speakAloud; }, [speakAloud]);

  const setPhase = useCallback((p: Phase) => { phaseRef.current = p; setPhaseState(p); }, []);
  const setPending = (p: typeof pendingRef.current) => { pendingRef.current = p; setPendingState(p ? p.actions : null); };
  const addStep = (kind: Step["kind"], text: string, state: Step["state"] = "done") => {
    const id = ++stepId.current;
    stepsRef.current = [...stepsRef.current, { id, kind, text, state }].slice(-40);
    setSteps(stepsRef.current);
    return id;
  };
  const markStep = (id: number, state: Step["state"], text?: string) => {
    stepsRef.current = stepsRef.current.map((s) => (s.id === id ? { ...s, state, ...(text ? { text } : {}) } : s));
    setSteps(stepsRef.current);
  };

  const listenAgain = useCallback(() => {
    if (phaseRef.current === "ended") return;
    if (!sp.supported || !micRef.current) return setPhase("idle");
    sp.clear(); sp.start(langRef.current ?? undefined); setPhase("listening");
  }, [sp, setPhase, langRef]);

  const say = useCallback((text: string, after: "listen" | "stay" = "listen") => {
    setReply(text);
    if (phaseRef.current === "ended") return;
    const live = () => phaseRef.current === "speaking" || phaseRef.current === "confirming";
    const next = () => { if (live()) { if (after === "listen") listenAgain(); else if (phaseRef.current === "speaking") setPhase("idle"); } };
    if (phaseRef.current !== "confirming") setPhase("speaking");
    if (!speakRef.current) { setTimeout(next, 0); return; }
    speakKeeper(withoutSources(text).slice(0, 700), next, { gemini: aiVoice.current, lang: langRef.current ?? undefined });
  }, [listenAgain, setPhase, langRef]);

  const run = async (a: AgentAction, caseId: string): Promise<{ ok: boolean; answer?: AskReply }> => {
    const id = addStep("act", a.label, "running");
    const send = async (action: Parameters<typeof dispatch>[0]) => { const r = await Promise.resolve(dispatch(action)); if (r === false) throw new Error(getBackendStatus().error || "That didn't go through."); };
    try {
      let answer: AskReply | undefined;
      switch (a.type) {
        case "open": await send({ t: "focus", focus: { type: a.card, id: a.id } }); break;
        case "remember": await send({ t: "fact.edit", key: a.key, value: a.value }); break;
        case "look_up": answer = await api.post<AskReply>("/api/ai/ask", { caseId, question: a.question }); break;
        case "add_asset": await send({ t: "asset.add", institution: a.institution, category: a.category, ref: a.ref ?? "" }); break;
        case "confirm_asset": await send({ t: "asset.confirm", id: a.assetId }); break;
        case "start_claim": await send({ t: "claim.start", assetId: a.assetId }); break;
        case "complete_task": await send({ t: "task.toggle", id: a.taskId }); break;
      }
      markStep(id, "done");
      return { ok: true, answer };
    } catch (e) {
      markStep(id, "failed", a.label + ": " + (e instanceof Error ? e.message : "did not complete"));
      return { ok: false };
    }
  };

  /** Close the loop: what changed, and the one next thing. */
  const finish = useCallback((headline?: string, keepSpeech = false) => {
    sp.clear(); if (!keepSpeech) stopSpeaking();
    const c = peekState()?.cases[peekState()!.activeCase];
    const did = stepsRef.current.filter((s) => s.kind === "act" && s.state === "done").map((s) => s.text);
    const next = c ? nextWork(c)?.text.replace(/^Next:\s*/, "") ?? null : null;
    const text = headline || (did.length ? "Here is what we did together." : "We didn't change anything this time.");
    setSummary({ headline: text, did, next });
    setPending(null); setChoices([]); setPhase("ended");
  }, [sp, setPhase]);

  const basicTurn = async (text: string, voice: boolean) => {
    const th = () => { const s = peekState(); const c = s?.cases[s.activeCase]; return c?.threads.find((t) => t.id === c.activeThread) ?? c?.threads[0]; };
    const before = th()?.messages.length ?? 0;
    const stepRef = addStep("info", "Built-in guide is replying", "running");
    const ok = await Promise.resolve(dispatch({ t: "send", text, voice }));
    const added = (th()?.messages.slice(before) ?? []).filter((m: Message) => m.role !== "user");
    markStep(stepRef, ok === false ? "failed" : "done", ok === false ? getBackendStatus().error || "Could not reply" : "Built-in guide replied");
    if (added.length) confused.current = 0; else confused.current++;
    if (confused.current >= 2) setHandoffOffer("keeper_unsure");
    const last = added.at(-1);
    setChoices(last?.choices?.filter((c) => c.id !== "m:sample") ?? []);
    say(added.length ? added.map((m) => m.text).join(" ") : getBackendStatus().error || "Sorry, that didn't go through. Please try again.");
  };

  const applyTurn = async (text: string, voice: boolean, turn: Turn, caseId: string, closing: boolean) => {
    history.current = [...history.current, { role: "user" as const, text }, { role: "keeper" as const, text: turn.say }].slice(-10);
    const auto = turn.actions.filter((a) => !a.confirm);
    const needYes = turn.actions.filter((a) => a.confirm);
    let answer: AskReply | undefined;
    if (auto.length) setPhase("acting");
    for (const a of auto) { const r = await run(a, caseId); if (r.answer) answer = r.answer; }
    const card = auto.find((a) => a.type === "open") as Extract<AgentAction, { type: "open" }> | undefined;
    const threadText = turn.say + (answer ? "\n\n" + plainCopy(answer.answer) + sourcesBlock(answer) : "");
    const spokenText = turn.say + (answer ? " " + plainCopy(answer.answer) : "");
    await Promise.resolve(dispatch({ t: "agent.turn", user: text, reply: threadText, voice, card: card ? { type: card.card, id: card.id } : undefined }));
    if (closing || turn.finish) { say(spokenText, "stay"); finish(turn.say, true); return; }
    if (needYes.length) {
      setPending({ actions: needYes, user: text, voice, say: turn.say });
      setPhase("confirming");
      say(spokenText.replace(/\s+$/, "") + " Say yes to confirm, or no to skip.");
      return;
    }
    say(spokenText, turn.listen ? "listen" : "stay");
  };

  const handle = useCallback(async (raw: string, voice: boolean, heard?: string | null) => {
    const text = raw.trim();
    if (!text || busy.current) return;
    busy.current = true;
    if (heard) { langRef.current = heard; setLanguage(heard); }
    try {
      sp.clear(); stopSpeaking(); setNotice(null); setChoices([]);
      addStep("heard", "“" + text + "”");
      const s = peekState(); const c = s?.cases[s.activeCase];
      const caseId = c?.backendId;
      const queued = pendingRef.current;
      if (HUMAN.test(text)) {
        if (queued) { setPending(null); queued.actions.forEach((a) => addStep("act", a.label, "skipped")); }
        setHandoffOffer("person_asked");
        say("Of course. I can ask a person to look at this. Check the request on your screen, and add anything you want them to know.", "stay");
        return;
      }
      if (queued) {
        if (YES.test(text) && caseId) {
          setPending(null); setPhase("acting");
          const done: string[] = [];
          for (const a of queued.actions) { const r = await run(a, caseId); if (r.ok) done.push(a.label); }
          const line = done.length ? "Done. " + done.join(". ") + "." : "I couldn't finish that. " + (getBackendStatus().error || "Nothing was changed.");
          await Promise.resolve(dispatch({ t: "agent.turn", user: text, reply: line + " What would you like to do next?", voice, note: true }));
          history.current = [...history.current, { role: "user" as const, text }, { role: "keeper" as const, text: line }].slice(-10);
          say(line + " What next?");
          return;
        }
        if (NO.test(text)) {
          setPending(null); queued.actions.forEach((a) => addStep("act", a.label, "skipped"));
          say("Okay, I won't do that. What would you like instead?");
          return;
        }
        setPending(null); queued.actions.forEach((a) => addStep("act", a.label, "skipped"));
      }
      const closing = DONE.test(text);
      setPhase("thinking");
      if (!aiBlocked.current && s?.session?.mode === "signin" && caseId) {
        const stepRef = addStep("info", "Understanding with Gemini", "running");
        try {
          const turn = await api.post<Turn>("/api/ai/agent", { caseId, utterance: text, history: history.current, ...(langRef.current ? { language: langRef.current } : {}) });
          markStep(stepRef, "done", "Understood"); setMode("ai");
          confused.current = 0;
          await applyTurn(text, voice, turn, caseId, closing);
          if (turn.handoff) setHandoffOffer("keeper_unsure");
          return;
        } catch (e) {
          const code = e instanceof ApiError ? e.code : undefined;
          if (code === "ai_consent_required") { aiBlocked.current = true; setNotice("AI help is off. Keeper is using its built-in guide. You can turn AI help on in Settings."); }
          else if (code === "ai_unavailable") { aiBlocked.current = true; setNotice("The AI assistant isn't available right now, so Keeper is using its built-in guide."); }
          else { confused.current++; setNotice("That one didn't reach the assistant, so the built-in guide answered."); }
          markStep(stepRef, "skipped", "Using the built-in guide");
          setMode("basic");
        }
      }
      if (closing) { say("Alright, that's all for now.", "stay"); finish(undefined, true); return; }
      await basicTurn(text, voice);
    } finally { busy.current = false; }
  }, [sp, say, finish, setPhase]);

  // Hands-free turn taking: when the person pauses after speaking, send what they said.
  useEffect(() => {
    if (phase !== "listening") return;
    const t = sp.text.trim();
    if (!t || sp.interim) return;
    const id = setTimeout(() => { sp.stop(); void handle(t, true, sp.language); }, sp.finalDelay);
    return () => clearTimeout(id);
  }, [phase, sp, sp.text, sp.interim, handle]);

  // Greet on mount, then listen. Cleanup releases the mic and the voice.
  useEffect(() => {
    resetKeeperVoice();
    const greet = setTimeout(() => { if (startWith) void handle(startWith, false); else say(start.hello); }, delayMs);
    // Say honestly, before the first turn, whether the AI planner is on.
    if (peekState()?.session?.mode === "signin") {
      api.get<{ available: boolean; reason?: string; stt?: "sarvam" | "browser" }>("/api/ai/agent").then((r) => {
        if (r.stt === "sarvam") setEngine("sarvam");
        aiBlocked.current = !r.available;
        aiVoice.current = r.available;
        setMode(r.available ? "ai" : "basic");
        setConsentNeeded(!r.available && r.reason === "consent");
        if (!r.available) setNotice(r.reason === "consent" ? "AI help is off, so Keeper is using its built-in guide. Turn it on in Settings to talk freely." : "The AI assistant isn't set up here, so Keeper is using its built-in guide.");
      }).catch(() => {});
    }
    return () => { clearTimeout(greet); sp.clear(); stopSpeaking(); };
  }, []);

  /** One tap to allow AI help, so a first call is not sent to Settings. */
  const allowAi = async () => {
    try {
      await api.post("/api/consent", { purpose: "ai_processing", status: "granted" });
      const r = await api.get<{ available: boolean }>("/api/ai/agent");
      aiBlocked.current = !r.available; aiVoice.current = r.available;
      setMode(r.available ? "ai" : "basic"); setConsentNeeded(false);
      setNotice(r.available ? null : "The AI assistant isn't set up here, so Keeper is using its built-in guide.");
    } catch { setNotice("Could not save your permission. Try again."); }
  };

  /** Ask for a person. Real accounts save a request with a redacted transcript; the example only pretends. */
  const requestHuman = async (why: HandoffWhy, note: string): Promise<HandoffResult | null> => {
    const s = peekState(); const c = s?.cases[s.activeCase];
    const th = c?.threads.find((t) => t.id === c.activeThread) ?? c?.threads[0];
    const transcript = (th?.messages ?? []).filter((m) => m.role !== "note").slice(-12).map((m) => ({ role: m.role === "user" ? "user" : "keeper", text: m.text.slice(0, 600) }));
    if (s?.session?.mode === "signin") {
      if (!c?.backendId) { setNotice("Tell Keeper a little about the situation first, then ask for a person."); return null; }
      try {
        const r = await api.post<{ handoff: { id: string } }>("/api/cases/" + c.backendId + "/handoff", { why, note, transcript });
        const out = { id: r.handoff.id, simulated: false };
        setHandoffSent(out); setHandoffOffer(null);
        return out;
      } catch (e) { setNotice(e instanceof Error ? e.message : "Could not save the request."); return null; }
    }
    const out = { id: "example", simulated: true };
    setHandoffSent(out); setHandoffOffer(null);
    return out;
  };

  const pauseMic = () => { sp.clear(); if (phaseRef.current === "listening") setPhase("idle"); };
  const onChoice = (ch: Choice) => handle(ch.label, false);
  const tapMic = () => {
    if (sp.listening) { sp.stop(); return; }
    stopSpeaking(); setPhase("idle"); listenAgain();
  };
  const resume = () => { setSummary(null); setPhase("idle"); listenAgain(); };

  // A listening turn that heard nothing (the browser ended it) reads as idle, not as a stuck mic.
  const shown: Phase = phase === "listening" && !sp.listening && !sp.text.trim() ? "idle" : phase;
  return { sp, engine: engine === "sarvam" && sarvam.supported ? "sarvam" as const : "browser" as const, language, phase: shown, consentNeeded, allowAi, handoffOffer, setHandoffOffer, handoffSent, requestHuman, pauseMic, steps, reply, choices, pending, summary, mode, notice, handle, onChoice, tapMic, finish: () => finish(), resume, answerPending: (yes: boolean) => handle(yes ? "yes" : "no", false) };
}
