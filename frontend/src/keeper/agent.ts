"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SPEECH_LANGUAGES, localConfirmation } from "@shared/languages";
import { api, ApiError } from "@/lib/client";
import type { AgentAction } from "@shared/contracts";
import { dispatch, getBackendStatus, peekState } from "./store";
import { captureScope, matchesScope, executionReply } from "./turn-scope";
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
type Turn = { say: string; actions: AgentAction[]; listen: boolean; finish: boolean; handoff?: boolean; language?: string };
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
    reason: (s?.session?.mode === "signin" ? null : "example") as "not_configured" | "consent" | "example" | null,
    hello: last && last.pending ? withoutSources(last.text).slice(0, 280) : GREETING,
    choices: last?.pending ? (last.choices ?? []).filter((x) => x.id !== "m:sample") : [],
  };
}

export function useAgent(speakAloud: boolean, opts: { micOn?: boolean; delayMs?: number; startWith?: string; natural?: boolean; passive?: boolean } = {}) {
  const { micOn = true, delayMs = 0, startWith, natural = false, passive = false } = opts;
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [steps, setSteps] = useState<Step[]>([]);
  const [reply, setReply] = useState("");
  const [start] = useState(opening);
  const [choices, setChoices] = useState<Choice[]>(start.choices);
  const [pending, setPendingState] = useState<AgentAction[] | null>(null);
  const [summary, setSummary] = useState<{ headline: string; did: string[]; next: string | null } | null>(null);
  const [mode, setMode] = useState<"ai" | "basic">(start.mode);
  const [notice, setNotice] = useState<string | null>(null);
  // Why Keeper is in basic mode, so the call can say so plainly instead of quietly following a script.
  const [aiReason, setAiReason] = useState<"not_configured" | "consent" | "example" | null>(start.reason);
  const [consentNeeded, setConsentNeeded] = useState(false);
  const [handoffOffer, setHandoffOffer] = useState<HandoffWhy | null>(null);
  const [handoffSent, setHandoffSent] = useState<HandoffResult | null>(null);

  const phaseRef = useRef<Phase>("idle");
  const origin = useRef(captureScope(peekState()));
  const alive = useRef(true);
  const requestController = useRef<AbortController | null>(null);
  const current = () => alive.current && matchesScope(peekState(), origin.current);
  type SavedTurn = Extract<Parameters<typeof dispatch>[0], { t: "agent.turn" }>;
  const [unsaved, setUnsaved] = useState<SavedTurn | null>(null);
  const unsavedRef = useRef<SavedTurn | null>(null);
  const saveTurn = async (turn: SavedTurn) => {
    if (!current() || !origin.current) return false;
    turn = { ...turn, turnId: turn.turnId ?? crypto.randomUUID() };
    let ok = false;
    try { ok = (await Promise.resolve(dispatch(turn, origin.current))) !== false; } catch { /* Retry preserves the turn. */ }
    if (!current()) return false;
    unsavedRef.current = ok ? null : turn; setUnsaved(unsavedRef.current);
    if (!ok) setNotice("This turn was not saved. Retry saving before sending another message.");
    else setNotice(null);
    return ok;
  };
  const pendingRef = useRef<{ actions: AgentAction[]; user: string; voice: boolean; say: string } | null>(null);
  const history = useRef<{ role: "user" | "keeper"; text: string }[]>((() => {
    const s = peekState(); const c = s?.cases[s.activeCase];
    return (c?.threads.find(t => t.id === c.activeThread)?.messages ?? [])
      .filter(m => m.role === "user" || m.role === "keeper").slice(-10)
      .map(m => ({ role: m.role as "user" | "keeper", text: m.text.slice(0, 800) }));
  })());
  const aiBlocked = useRef(false);
  const stepId = useRef(0);
  const stepsRef = useRef<Step[]>([]);
  const busy = useRef(false);
  const micRef = useRef(micOn);
  const confused = useRef(0);
  const aiVoice = useRef(false); // Gemini's voice can be used (the AI is on)
  const naturalRef = useRef(natural); // and the person chose it
  useEffect(() => { naturalRef.current = natural; }, [natural]);
  useEffect(() => { micRef.current = micOn; }, [micOn]);
  // Two recognisers: Sarvam's (Indian languages, detected per turn) when the backend has it, else the browser's.
  const [languagePreference, setLanguagePreference] = useState("");
  const preferenceRef = useRef("");
  const sarvamAvailable = useRef(false);
  const [engine, setEngine] = useState<"browser" | "sarvam">("browser");
  const [language, setLanguage] = useState<string | null>(null);
  const langRef = useRef<string | null>(null);
  const web = useSpeech();
  const sarvam = useSarvamSpeech({ onFail: (reason) => {
    setEngine("browser");
    setNotice(reason === "quota" ? "Speech in your language is busy, so Keeper is using your browser's speech recognition for now." : "Speech in your language isn't available right now, so Keeper is using your browser's speech recognition.");
    web.start(langRef.current ?? undefined);
    phaseRef.current = "listening"; setPhaseState("listening");
  } });
  const sp = engine === "sarvam" && sarvam.supported ? sarvam : web;
  // Timers and callbacks outlive renders. The greeting's timer is set before we know whether Sarvam is available,
  // so it must look up the recogniser when it fires, or the first turn is heard by one and watched on the other.
  const spRef = useRef(sp);
  useEffect(() => { spRef.current = sp; });
  const noHear = useRef(0);
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
    const cur = spRef.current;
    if (!cur.supported || !micRef.current) return setPhase("idle");
    cur.clear(); cur.start(preferenceRef.current || (engine === "browser" ? langRef.current ?? undefined : undefined)); setPhase("listening");
  }, [setPhase, engine]);

  const say = useCallback((text: string, after: "listen" | "stay" = "listen") => {
    setReply(text);
    if (phaseRef.current === "ended") return;
    const live = () => phaseRef.current === "speaking" || phaseRef.current === "confirming";
    const next = () => { if (live()) { if (after === "listen") listenAgain(); else if (phaseRef.current === "speaking") setPhase("idle"); } };
    if (phaseRef.current !== "confirming") setPhase("speaking");
    if (!speakRef.current) { setTimeout(next, 0); return; }
    speakKeeper(withoutSources(text).slice(0, 700), next, { gemini: aiVoice.current && (naturalRef.current || (!!langRef.current && !window.speechSynthesis?.getVoices().some(v => v.lang.split("-")[0] === langRef.current?.split("-")[0]))), lang: langRef.current ?? undefined });
  }, [listenAgain, setPhase]);

  const run = async (a: AgentAction, caseId: string): Promise<{ ok: boolean; answer?: AskReply }> => {
    if (!current()) return { ok: false };
    const id = addStep("act", a.label, "running");
    const send = async (action: Parameters<typeof dispatch>[0]) => { if (!current() || !origin.current) throw new Error("Conversation changed; action cancelled."); const r = await Promise.resolve(dispatch(action, origin.current)); if (r === false) throw new Error(getBackendStatus().error || "That didn't go through."); };
    try {
      let answer: AskReply | undefined;
      switch (a.type) {
        case "open": await send({ t: "focus", focus: { type: a.card, id: a.id } }); break;
        case "remember": await send({ t: "fact.edit", key: a.key, value: a.value }); break;
        case "look_up": answer = await api.post<AskReply>("/api/ai/ask", { caseId, question: a.question }, { signal: requestController.current?.signal }); break;
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
    spRef.current.clear(); if (!keepSpeech) stopSpeaking();
    const c = peekState()?.cases[peekState()!.activeCase];
    const did = stepsRef.current.filter((s) => s.kind === "act" && s.state === "done").map((s) => s.text);
    const next = c ? nextWork(c)?.text.replace(/^Next:\s*/, "") ?? null : null;
    const text = headline || (did.length ? "Here is what we did together." : "We didn't change anything this time.");
    setSummary({ headline: text, did, next });
    setPending(null); setChoices([]); setPhase("ended");
  }, [setPhase]);

  const basicTurn = async (text: string, voice: boolean) => {
    const th = () => { const s = peekState(); const c = s?.cases[s.activeCase]; return c?.threads.find((t) => t.id === c.activeThread) ?? c?.threads[0]; };
    const before = th()?.messages.length ?? 0;
    const stepRef = addStep("info", "Built-in guide is replying", "running");
    const ok = await Promise.resolve(dispatch({ t: "send", text, voice }, origin.current ?? undefined));
    if (!current()) return;
    const added = (th()?.messages.slice(before) ?? []).filter((m: Message) => m.role !== "user");
    markStep(stepRef, ok === false ? "failed" : "done", ok === false ? getBackendStatus().error || "Could not reply" : "Built-in guide replied");
    if (added.length) confused.current = 0; else confused.current++;
    if (confused.current >= 2) setHandoffOffer("keeper_unsure");
    const last = added.at(-1);
    setChoices(last?.choices?.filter((c) => c.id !== "m:sample") ?? []);
    say(added.length ? added.map((m) => m.text).join(" ") : getBackendStatus().error || "Sorry, that didn't go through. Please try again.");
  };

  const applyTurn = async (text: string, voice: boolean, turn: Turn, caseId: string, closing: boolean) => {
    if (turn.language) { langRef.current = turn.language; setLanguage(turn.language); }
    const auto = turn.actions.filter((a) => !a.confirm);
    const needYes = turn.actions.filter((a) => a.confirm);
    let answer: AskReply | undefined;
    if (auto.length) setPhase("acting");
    const completed: string[] = [], failed: string[] = [];
    for (const a of auto) { if (!current()) return; const r = await run(a, caseId); (r.ok ? completed : failed).push(a.label); if (r.answer) answer = r.answer; }
    if (!current()) return;
    const actualReply = executionReply(turn.say, completed, failed);
    history.current = [...history.current, { role: "user" as const, text }, { role: "keeper" as const, text: actualReply }].slice(-10);
    const card = auto.find((a) => a.type === "open") as Extract<AgentAction, { type: "open" }> | undefined;
    const threadText = actualReply + (answer ? "\n\n" + plainCopy(answer.answer) + sourcesBlock(answer) : "");
    const spokenText = actualReply + (answer ? " " + plainCopy(answer.answer) : "");
    if (!(await saveTurn({ t: "agent.turn", user: text, reply: threadText, voice, card: card ? { type: card.card, id: card.id } : undefined }))) { if (current()) setPhase("idle"); return; }
    if (closing || turn.finish) { say(spokenText, "stay"); if (!passive) finish(turn.say, true); return; }
    if (needYes.length) {
      setPending({ actions: needYes, user: text, voice, say: turn.say });
      setPhase("confirming");
      say(spokenText.replace(/\s+$/, "") + " Say yes to confirm, or no to skip.");
      return;
    }
    say(spokenText, turn.listen ? "listen" : "stay");
  };

  const handle = useCallback(async (raw: string, voice: boolean, heard?: string | null) => {
    const text = raw.trim().slice(0, 800);
    if (!text || busy.current || !current()) return;
    if (unsavedRef.current) { setNotice("Save the previous turn first using Retry saving this turn."); return; }
    busy.current = true;
    requestController.current = new AbortController();
    if (heard) { langRef.current = heard; setLanguage(heard); }
    try {
      spRef.current.clear(); stopSpeaking(); setNotice(null); setChoices([]);
      noHear.current = 0;
      addStep("heard", "“" + text + "”");
      const s = peekState(); const c = s?.cases[s.activeCase];
      let caseId = c?.backendId;
      // A new person has no saved case yet. Open one from their first words so the AI, not the script, answers turn one.
      if (!caseId && !aiBlocked.current && s?.session?.mode === "signin") {
        const stepRef = addStep("info", "Opening your private record", "running");
        const ok = await Promise.resolve(dispatch({ t: "case.ensure", text }, origin.current ?? undefined));
        if (!alive.current) return;
        const s2 = peekState();
        if (s2?.cases[s2.activeCase]?.activeThread !== origin.current?.threadId) return;
        origin.current = captureScope(s2);
        caseId = s2?.cases[s2.activeCase]?.backendId;
        markStep(stepRef, ok === false || !caseId ? "failed" : "done", ok === false || !caseId ? "Could not open a record" : "Opened your private record");
      }
      const queued = pendingRef.current;
      if (HUMAN.test(text)) {
        if (queued) { setPending(null); queued.actions.forEach((a) => addStep("act", a.label, "skipped")); }
        setHandoffOffer("person_asked");
        say("Of course. I can ask a person to look at this. Check the request on your screen, and add anything you want them to know.", "stay");
        return;
      }
      if (queued) {
        if ((YES.test(text) || localConfirmation(text) === "yes") && caseId) {
          setPending(null); setPhase("acting");
          const done: string[] = [], failed: string[] = [];
          for (const a of queued.actions) { if (!current()) return; const r = await run(a, caseId); if (r.ok) done.push(a.label); else failed.push(a.label); }
          const line = executionReply("Done. " + done.join(". ") + ".", done, failed);
          if (!(await saveTurn({ t: "agent.turn", user: text, reply: line + " What would you like to do next?", voice, note: true }))) { if (current()) setPhase("idle"); return; }
          history.current = [...history.current, { role: "user" as const, text }, { role: "keeper" as const, text: line }].slice(-10);
          say(line + " What next?");
          return;
        }
        if (NO.test(text) || localConfirmation(text) === "no") {
          setPending(null); queued.actions.forEach((a) => addStep("act", a.label, "skipped"));
          say("Okay, I won't do that. What would you like instead?");
          return;
        }
        setPending(null); queued.actions.forEach((a) => addStep("act", a.label, "skipped"));
      }
      if (aiBlocked.current && s?.session?.mode === "signin") {
        try {
          const availability = await api.get<{ available: boolean }>("/api/ai/agent");
          if (availability.available) { aiBlocked.current = false; aiVoice.current = true; setConsentNeeded(false); setAiReason(null); }
        } catch { /* Existing fallback stays available. */ }
      }
      const closing = DONE.test(text);
      setPhase("thinking");
      if (!aiBlocked.current && s?.session?.mode === "signin" && caseId) {
        const stepRef = addStep("info", "Understanding with Gemini", "running");
        try {
          const turn = await api.post<Turn>("/api/ai/agent", { caseId, threadId: origin.current?.threadId, utterance: text, history: history.current.map(m => ({ ...m, text: m.text.slice(0, 800) })), ...(langRef.current ? { language: langRef.current } : {}) }, { signal: requestController.current?.signal });
          if (!current() || phaseRef.current === "ended") return;
          markStep(stepRef, "done", "Understood"); setMode("ai");
          confused.current = 0;
          await applyTurn(text, voice, turn, caseId, closing);
          if (turn.handoff) setHandoffOffer("keeper_unsure");
          return;
        } catch (e) {
          if (!current() || phaseRef.current === "ended") return;
          const code = e instanceof ApiError ? e.code : undefined;
          if (code === "ai_consent_required") { aiBlocked.current = true; setNotice("AI help is off. Keeper is using its built-in guide. You can turn AI help on in Settings."); }
          else {
            // Transient failures must not disable AI or send the conversation into the interview script.
            confused.current++;
            const reply = "I couldn't get a reply just then. Please try again, or carry on from where we were.";
            history.current = [...history.current, { role: "user" as const, text }, { role: "keeper" as const, text: reply }].slice(-10);
            if (!(await saveTurn({ t: "agent.turn", user: text, reply, voice }))) { if (current()) setPhase("idle"); return; }
            setNotice("The AI reply failed this time. Keeper will try AI again on your next message.");
            markStep(stepRef, "failed", "Reply unavailable; you can try again");
            if (confused.current >= 2) setHandoffOffer("keeper_unsure");
            say(reply);
            return;
          }
          markStep(stepRef, "skipped", "Using the built-in guide");
          setMode("basic");
        }
      }
      if (closing) { say("Alright, that's all for now.", "stay"); if (!passive) finish(undefined, true); return; }
      await basicTurn(text, voice);
    } finally { busy.current = false; }
  }, [say, finish, setPhase]);

  // Nothing heard: listen again on its own a couple of times (the screen says what is happening).
  useEffect(() => {
    if (phase !== "listening" || sp.listening || sp.text.trim() || sp.error !== "no-speech" || noHear.current >= 2) return;
    const id = setTimeout(() => { noHear.current++; listenAgain(); }, 700);
    return () => clearTimeout(id);
  }, [phase, sp.listening, sp.text, sp.error, listenAgain]);

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
    if (!passive) resetKeeperVoice();
    alive.current = true;
    if (phaseRef.current === "ended") phaseRef.current = "idle";
    const greet = passive ? undefined : setTimeout(() => { if (startWith) void handle(startWith, false); else say(start.hello); }, delayMs);
    // Say honestly, before the first turn, whether the AI planner is on.
    if (peekState()?.session?.mode === "signin") {
      api.get<{ available: boolean; reason?: string; stt?: "sarvam" | "browser" }>("/api/ai/agent").then((r) => {
        if (r.stt === "sarvam") { sarvamAvailable.current = true; setEngine("sarvam"); }
        aiBlocked.current = !r.available;
        aiVoice.current = r.available;
        setMode(r.available ? "ai" : "basic");
        setConsentNeeded(!r.available && r.reason === "consent");
        setAiReason(r.available ? null : r.reason === "consent" ? "consent" : "not_configured");
      }).catch(() => {});
    }
    return () => { alive.current = false; requestController.current?.abort(); phaseRef.current = "ended"; clearTimeout(greet); if (!passive) { spRef.current.clear(); stopSpeaking(); } };
  }, []);

  /** One tap to allow AI help, so a first call is not sent to Settings. */
  const allowAi = async () => {
    try {
      await api.post("/api/consent", { purpose: "ai_processing", status: "granted" });
      const r = await api.get<{ available: boolean; stt?: string }>("/api/ai/agent");
      if (r.stt === "sarvam") { sarvamAvailable.current = true; setEngine("sarvam"); }
      aiBlocked.current = !r.available; aiVoice.current = r.available;
      setMode(r.available ? "ai" : "basic"); setConsentNeeded(false);
      setAiReason(r.available ? null : "not_configured");
      setNotice(null);
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

  const chooseLanguage = (code: string) => {
    spRef.current.clear(); stopSpeaking(); setPhase("idle");
    preferenceRef.current = code; setLanguagePreference(code);
    langRef.current = code || null; setLanguage(code || null);
    setEngine(sarvamAvailable.current && (!code || SPEECH_LANGUAGES[code]) ? "sarvam" : "browser");
    setNotice(code && !SPEECH_LANGUAGES[code] ? "Speech recognition and spoken replies for this language depend on your browser. You can always type." : null);
  };

  const pauseMic = () => { spRef.current.clear(); if (phaseRef.current === "listening") setPhase("idle"); };
  const onChoice = (ch: Choice) => handle(ch.label, false);
  const tapMic = () => {
    if (spRef.current.listening) { spRef.current.stop(); return; }
    stopSpeaking(); setPhase("idle"); listenAgain();
  };
  const resume = () => { setSummary(null); setPhase("idle"); listenAgain(); };

  // A listening turn that heard nothing (the browser ended it) reads as idle, not as a stuck mic.
  const shown: Phase = phase === "listening" && !sp.listening && !sp.text.trim() ? "idle" : phase;
  return { unsaved, retrySave: () => unsavedRef.current ? saveTurn(unsavedRef.current) : Promise.resolve(true), languagePreference, chooseLanguage, aiReason, micLevel: engine === "sarvam" && sarvam.supported ? sarvam.level : null, sp, engine: engine === "sarvam" && sarvam.supported ? "sarvam" as const : "browser" as const, language, phase: shown, consentNeeded, allowAi, handoffOffer, setHandoffOffer, handoffSent, requestHuman, pauseMic, steps, reply, choices, pending, summary, mode, notice, handle, onChoice, tapMic, finish: () => finish(), resume, answerPending: (yes: boolean) => handle(yes ? "yes" : "no", false) };
}
