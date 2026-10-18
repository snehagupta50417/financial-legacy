"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSessionId } from "@/lib/client";

/**
 * Voice uses the BROWSER's own speech recognition (Web Speech API). It starts only when the user taps
 * the microphone, never listens in the background, and Keeper stores no audio. In Chrome and Edge the
 * browser sends audio to its vendor's speech service — the app discloses that before first use.
 */

interface RecEvent { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }
interface Rec {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: RecEvent) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
}
type RecCtor = new () => Rec;

const ctor = (): RecCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const noop = () => () => {};

export const useRecognitionSupport = () => useSyncExternalStore(noop, () => !!ctor(), () => false);
export const useSpeechOutSupport = () => useSyncExternalStore(noop, () => typeof window !== "undefined" && "speechSynthesis" in window, () => false);

export type VoiceError = "denied" | "unsupported" | "no-speech" | "network" | "other" | null;
export const VOICE_ERROR_TEXT: Record<Exclude<VoiceError, null>, string> = {
  denied: "Microphone access was blocked. You can allow it in your browser’s site settings, or just type — everything works the same.",
  unsupported: "This browser can’t do speech recognition. Please type instead, or try Chrome or Edge.",
  "no-speech": "I didn’t hear anything. Tap the microphone and try again, or type.",
  network: "The browser’s speech service couldn’t be reached. Please type instead.",
  other: "Voice stopped unexpectedly. Your words so far are kept — you can edit them or type.",
};

/** What the call needs from a speech recogniser, so the browser's and Sarvam's are interchangeable. */
export interface SpeechInput {
  supported: boolean;
  listening: boolean;
  text: string;
  setText: (t: string) => void;
  interim: string;
  error: VoiceError;
  start: (lang?: string) => void;
  stop: () => void;
  clear: () => void;
  /** How long to wait after speech ends before sending it (the browser's recogniser needs a longer pause). */
  finalDelay: number;
  /** Language detected for this turn (BCP-47), when the recogniser knows it. */
  language: string | null;
}

export function useSpeech(): SpeechInput {
  const supported = useRecognitionSupport();
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<VoiceError>(null);
  const rec = useRef<Rec | null>(null);

  useEffect(() => () => { if (rec.current) { rec.current.onresult = null; rec.current.onerror = null; rec.current.onend = null; rec.current.abort(); } }, []);

  const start = useCallback((lang?: string) => {
    rec.current?.abort();
    const C = ctor();
    if (!C) return setError("unsupported");
    window.speechSynthesis?.cancel(); // interruption: Keeper stops talking when you start
    setError(null);
    const r = new C();
    r.lang = lang || "en-IN";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let f = "", i = "";
      for (let k = 0; k < e.results.length; k++) {
        const part = e.results[k][0].transcript;
        if (e.results[k].isFinal) f += part;
        else i += part;
      }
      setText(f.trim());
      setInterim(i.trim());
    };
    r.onerror = (e) => setError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : e.error === "no-speech" ? "no-speech" : e.error === "network" ? "network" : e.error === "aborted" ? null : "other");
    r.onend = () => { setListening(false); setInterim(""); };
    rec.current = r;
    try { r.start(); setListening(true); } catch { setError("other"); }
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);
  const clear = useCallback(() => { rec.current?.abort(); setText(""); setInterim(""); setListening(false); }, []);
  return { supported, listening, text, setText, interim, error, start, stop, clear, finalDelay: 1400, language: null };
}

/** Speaks `text`. `onEnd` fires exactly once when it finishes, is cut off, or can't be spoken at all. */
export function speak(text: string, onEnd?: () => void, lang?: string) {
  let done = false;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  const finish = () => { if (!done) { done = true; clearTimeout(watchdog); onEnd?.(); } };
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return finish();
  const clean = text.replace(/\s+/g, " ");
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = lang || "en-IN";
  // Some browsers have no voice installed and never fire an event: don't leave the conversation waiting on one.
  u.onstart = () => { clearTimeout(watchdog); watchdog = setTimeout(finish, 6000 + clean.length * 110); };
  u.onend = finish; u.onerror = finish;
  watchdog = setTimeout(finish, 4000);
  window.speechSynthesis.speak(u);
}
let audio: HTMLAudioElement | null = null;
let voiceAbort: AbortController | null = null;
let geminiVoiceWorks = true;

/** Stops whatever Keeper is saying, in either voice. */
export function stopSpeaking() {
  voiceAbort?.abort(); voiceAbort = null;
  if (audio) { audio.pause(); audio = null; }
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

/** A new call tries Gemini's voice again, even if an earlier one was unavailable. */
export const resetKeeperVoice = () => { geminiVoiceWorks = true; };

/**
 * Keeper's voice. With `gemini` it asks the backend for Gemini's natural voice (free key, same opt-in as
 * every other model call) and plays it; if that is unavailable, over quota, or slow to fail, it falls back
 * to the browser's own voice, so a call never goes silent. `onEnd` fires once, when speech finishes.
 */
export function speakKeeper(text: string, onEnd?: () => void, opts: { gemini: boolean; lang?: string } = { gemini: false }) {
  if (!opts.gemini || !geminiVoiceWorks || typeof window === "undefined") return speak(text, onEnd, opts.lang);
  stopSpeaking();
  let done = false;
  const finish = () => { if (!done) { done = true; onEnd?.(); } };
  const ctrl = new AbortController();
  voiceAbort = ctrl;
  void (async () => {
    try {
      const res = await fetch("/api/ai/speak", { method: "POST", headers: { "content-type": "application/json", "x-session-id": getSessionId() }, body: JSON.stringify({ text: text.slice(0, 600) }), signal: ctrl.signal });
      if (!res.ok) { geminiVoiceWorks = false; throw new Error("voice unavailable"); }
      const url = URL.createObjectURL(await res.blob());
      const a = new Audio(url);
      audio = a;
      a.onended = () => { URL.revokeObjectURL(url); audio = null; finish(); };
      a.onerror = () => { URL.revokeObjectURL(url); audio = null; speak(text, finish, opts.lang); };
      await a.play();
    } catch {
      if (!ctrl.signal.aborted) speak(text, finish, opts.lang);
    }
  })();
}
