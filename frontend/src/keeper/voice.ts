"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

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

export function useSpeech() {
  const supported = useRecognitionSupport();
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<VoiceError>(null);
  const rec = useRef<Rec | null>(null);

  useEffect(() => () => { if (rec.current) { rec.current.onresult = null; rec.current.onerror = null; rec.current.onend = null; rec.current.abort(); } }, []);

  const start = useCallback(() => {
    rec.current?.abort();
    const C = ctor();
    if (!C) return setError("unsupported");
    window.speechSynthesis?.cancel(); // interruption: Keeper stops talking when you start
    setError(null);
    const r = new C();
    r.lang = "en-IN";
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
  return { supported, listening, text, setText, interim, error, start, stop, clear };
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, " "));
  u.lang = "en-IN";
  window.speechSynthesis.speak(u);
}
export const stopSpeaking = () => typeof window !== "undefined" && window.speechSynthesis?.cancel();
