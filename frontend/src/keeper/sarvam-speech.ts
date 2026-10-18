"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, ApiError } from "@/lib/client";
import { stopSpeaking, type SpeechInput, type VoiceError } from "./voice";

/**
 * Listening in the person's own language. The browser records one spoken turn, notices when they stop
 * talking, and the backend sends it to Sarvam's speech model (Hindi, Tamil, Telugu and more, or Indian
 * English), which also says which language it heard. Same shape as the browser's own recogniser (see
 * useSpeech) so the call can use either. Audio is sent for that one turn and is not kept.
 */

export { SPEECH_LANGUAGES as LANGUAGE_NAMES } from "@shared/languages";

export interface EndpointerOptions { threshold?: number; maxThreshold?: number; calibrateMs?: number; speechMs?: number; silenceMs?: number; maxMs?: number; noSpeechMs?: number }
export type Verdict = "continue" | "stop" | "no-speech";

/**
 * Decides when a spoken turn is over, from loudness readings alone. A short blip is not speech; once real
 * speech has started, a pause ends the turn; a long recording is cut off before the service's limit; and
 * a quiet room gives up instead of recording forever.
 */
export function makeEndpointer(o: EndpointerOptions = {}) {
  // `threshold` is the quietest speech we trust. In a noisy room it rises (3x the noise floor, never above
  // `maxThreshold`), because the floor is measured over the first `calibrateMs` before speech is judged.
  const { threshold: minThreshold = 0.012, maxThreshold = 0.05, calibrateMs = 400, speechMs = 160, silenceMs = 1200, maxMs = 25_000, noSpeechMs = 9000 } = o;
  let threshold = minThreshold;
  let floor = Infinity;
  let start: number | null = null;
  let voicedSince: number | null = null;
  let lastVoiced = 0;
  let spoke = false;
  return {
    get spoke() { return spoke; },
    /** One loudness reading (0 to 1) taken at time `now` (ms). */
    push(level: number, now: number): Verdict {
      if (start === null) start = now;
      if (now - start < calibrateMs) {
        floor = Math.min(floor, level);
        threshold = Math.min(maxThreshold, Math.max(minThreshold, floor * 3));
        // Nothing counts as speech while the room is being measured, unless it is clearly loud.
        if (level < Math.max(threshold, 0.05)) return "continue";
      }
      if (level >= threshold) {
        if (voicedSince === null) voicedSince = now;
        lastVoiced = now;
        if (!spoke && now - voicedSince >= speechMs) spoke = true;
      } else if (!spoke) voicedSince = null;
      if (now - start >= maxMs) return "stop";
      if (spoke && now - lastVoiced >= silenceMs) return "stop";
      if (!spoke && now - start >= noSpeechMs) return "no-speech";
      return "continue";
    },
  };
}

const noop = () => () => {};
const canRecord = () => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

export function useSarvamSpeech(opts: { onFail?: (reason: "unavailable" | "quota") => void } = {}): SpeechInput & { level: number } {
  const supported = useSyncExternalStore(noop, canRecord, () => false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<VoiceError>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const token = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const release = useRef<() => void>(() => {});
  const verdictRef = useRef<Verdict>("continue");
  const onFail = useRef(opts.onFail);
  useEffect(() => { onFail.current = opts.onFail; }, [opts.onFail]);

  const cleanup = useCallback(() => { release.current(); release.current = () => {}; recorder.current = null; }, []);
  useEffect(() => () => { token.current++; cleanup(); }, [cleanup]);

  const start = useCallback(async (hint?: string) => {
    token.current++;
    const mine = token.current;
    cleanup();
    setError(null); setText(""); setInterim("Waiting for microphone permission…"); setLanguage(null);
    stopSpeaking(); // interruption: Keeper stops talking when you start
    let stream: MediaStream;
    try {
      let expired = false;
      let permissionTimer: ReturnType<typeof setTimeout> | undefined;
      const pending = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      void pending.then(s => { if (expired || mine !== token.current) s.getTracks().forEach(t => t.stop()); }, () => {});
      try {
        stream = await Promise.race([pending, new Promise<never>((_, reject) => {
          permissionTimer = setTimeout(() => { expired = true; reject(new Error("Microphone permission timed out")); }, 15_000);
        })]);
      } finally { clearTimeout(permissionTimer); }
    } catch (e) {
      if (mine === token.current) { setInterim(""); setError(e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "denied" : "other"); }
      return;
    }
    if (mine !== token.current) { stream.getTracks().forEach((t) => t.stop()); return; }

    const ctx = new AudioContext();
    // A context made outside a click can start suspended, which reads as silence. Wake it.
    void ctx.resume().catch(() => {});
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    const endpointer = makeEndpointer();
    verdictRef.current = "continue";
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) sum += v * v;
      const rms = Math.sqrt(sum / samples.length);
      setLevel(Math.min(4, Math.round(rms * 40)));
      const verdict = endpointer.push(rms, performance.now());
      if (verdict !== "continue") { verdictRef.current = verdict; if (mr.state === "recording") mr.stop(); }
    }, 80);
    release.current = () => { clearInterval(timer); stream.getTracks().forEach((t) => t.stop()); void ctx.close().catch(() => {}); if (mr.state === "recording") { mr.ondataavailable = null; mr.onstop = null; mr.stop(); } };

    mr.onstop = async () => {
      cleanup();
      if (mine !== token.current) return;
      setListening(false); setLevel(0);
      // A suspended analyser or quiet microphone can report zero while MediaRecorder captures speech.
      // Let STT decide whether the captured audio contains words; the meter is only an endpoint hint.
      if (!chunks.some(chunk => chunk.size > 0)) { setInterim(""); setError("no-speech"); return; }
      setInterim("Transcribing your recording…");
      try {
        const form = new FormData();
        if (hint) form.set("language", hint);
        form.set("audio", new Blob(chunks, { type: mr.mimeType || "audio/webm" }), "speech.webm");
        const r = await api.upload<{ transcript: string; language: string | null }>("/api/stt", form);
        if (mine !== token.current) return;
        setInterim("");
        if (!r.transcript) { setError("no-speech"); return; }
        setLanguage(r.language);
        setText(r.transcript);
      } catch (e) {
        if (mine !== token.current) return;
        setInterim("");
        setError("network");
        onFail.current?.(e instanceof ApiError && e.code === "stt_quota" ? "quota" : "unavailable");
      }
    };
    recorder.current = mr;
    mr.start(250);
    setInterim(""); setListening(true);
  }, [cleanup]);

  /** Finish now: whatever was said so far is sent. */
  const stop = useCallback(() => { verdictRef.current = "stop"; if (recorder.current?.state === "recording") recorder.current.stop(); }, []);
  /** Throw this turn away. */
  const clear = useCallback(() => { token.current++; cleanup(); setListening(false); setLevel(0); setText(""); setInterim(""); setLanguage(null); }, [cleanup]);

  return { supported, listening, text, setText, interim, error, start: (lang?: string) => { void start(lang); }, stop, clear, finalDelay: 120, language, level };
}
