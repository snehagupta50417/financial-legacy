"use client";
import { useSyncExternalStore } from "react";
import { freshState, reduce, type Action } from "./engine";
import { sampleState } from "./sample";
import type { AppState } from "./types";

/**
 * Tiny external store with localStorage persistence. It holds SYNTHETIC demo progress and a display
 * name only — never real files, credentials or secrets. `undefined` = not loaded yet (server render),
 * `null` = signed out.
 */
const KEY = "keeper.demo.v1";
let state: AppState | null | undefined;
const listeners = new Set<() => void>();

function read(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    const p = raw ? (JSON.parse(raw) as AppState) : null;
    return p && p.v === 1 && p.cases && p.cases[p.activeCase] ? p : null;
  } catch {
    return null;
  }
}

const getSnapshot = () => (state === undefined ? (state = read()) : state);
const getServerSnapshot = () => undefined;
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));

function set(next: AppState | null) {
  state = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch { /* private mode: the session simply isn't remembered */ }
  listeners.forEach((l) => l());
}

export function dispatch(a: Action) {
  const cur = getSnapshot();
  if (a.t === "signOut") return set(null);
  if (a.t === "signIn") return set(a.mode === "sample" ? sampleState(a.name) : freshState(a.name, a.mode));
  if (!cur) return;
  set(reduce(cur, a));
}

export function useKeeper() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const c = s ? s.cases[s.activeCase] : null;
  const th = c ? (c.threads.find((t) => t.id === c.activeThread) ?? c.threads[0]) : null;
  return { state: s, loaded: s !== undefined, c, th, dispatch };
}

export function setPrefs(p: Partial<Pick<AppState, "voiceDisclosed" | "speakReplies">>) {
  const cur = getSnapshot();
  if (cur) set({ ...cur, ...p });
}
