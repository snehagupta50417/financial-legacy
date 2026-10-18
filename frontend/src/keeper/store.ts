"use client";
import { useSyncExternalStore } from "react";
import { api } from "@/lib/client";
import { freshState, reduce, START_CHOICES, type Action } from "./engine";
import { SAMPLE_VERSION, sampleState } from "./sample";
import { WELCOME_NEW } from "./catalog";
import type { AppState } from "./types";

/**
 * Tiny external store with localStorage persistence. It holds SYNTHETIC demo progress and a display
 * name only — never real files, credentials or secrets. `undefined` = not loaded yet (server render),
 * `null` = signed out.
 */
const KEY = "keeper.demo.v1";
const PERSONAL_KEY = "keeper.personal.v1";
const EXAMPLE_KEY = "keeper.example.v2";
let state: AppState | null | undefined;
const listeners = new Set<() => void>();

function read(storageKey = KEY): AppState | null {
  try {
    const raw = localStorage.getItem(storageKey);
    const p = raw ? (JSON.parse(raw) as AppState) : null;
    if (!(p && p.v === 1 && p.cases && p.cases[p.activeCase])) return null;
    // The example is synthetic and rebuilt on demand: drop a saved one from an older version of its data.
    if (p.session?.mode === "sample" && p.sampleV !== SAMPLE_VERSION) return null;
    for (const record of Object.values(p.cases)) for (const thread of record.threads) if (thread.messages.length === 1 && !thread.journey && thread.messages[0].role === "keeper") { thread.messages[0].text = WELCOME_NEW; thread.messages[0].choices = START_CHOICES; }
    if (p.attachments) for (const attachment of Object.values(p.attachments)) if (attachment.state === "uploading") attachment.state = "ready";
    return p;
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
    if (next) { localStorage.setItem(KEY, JSON.stringify(next)); localStorage.setItem(next.session?.mode === "sample" ? EXAMPLE_KEY + "." + (next.session.persona || "arjun") : PERSONAL_KEY, JSON.stringify(next)); }
    else localStorage.removeItem(KEY);
  } catch { /* private mode: the session simply isn't remembered */ }
  listeners.forEach((l) => l());
}

type BackendStatus = { busy: boolean; error: string | null };
let backendStatus: BackendStatus = { busy: false, error: null };
let epoch = 0;
let queue: Promise<void> = Promise.resolve();
let pending = 0;
const pendingActions = new Set<string>();
let connected = false;
const statusSnapshot = () => backendStatus;
const serverStatus: BackendStatus = { busy: false, error: null };
function status(next: BackendStatus) { backendStatus = next; listeners.forEach(l => l()); }

function enqueue(work: (current: AppState) => Promise<AppState>, key?: string) {
  const token = epoch;
  const actionKey = key ? token + ":" + key : null;
  if (actionKey && pendingActions.has(actionKey)) return Promise.resolve(false);
  if (actionKey) pendingActions.add(actionKey);
  let succeeded = false;
  pending++; status({ busy: true, error: null });
  queue = queue.then(async () => {
    const current = getSnapshot();
    if (token !== epoch || current?.session?.mode !== "signin") return;
    try { const next = await work(current); if (token === epoch) { const latest = getSnapshot(); set({ ...next, drafts: latest?.drafts || next.drafts, attachments: latest?.attachments || next.attachments }); succeeded = true; } }
    catch (error) { if (token === epoch) status({ busy: pending > 1, error: error instanceof Error ? error.message : "Cannot reach Keeper. Please try again." }); }
  }).finally(() => { if (actionKey) pendingActions.delete(actionKey); if (token === epoch) { pending--; status({ ...backendStatus, busy: pending > 0 }); } });
  return queue.then(() => succeeded);
}

/** Seed one of the backend's synthetic demo cases into this account and open it. */
export function addDemoCase(scenario: string) {
  return enqueue(async current => {
    const r = await api.post<{ caseId: string }>("/api/demo", { scenario });
    const next = await (await import("./backend")).hydrateBackend(current);
    return next.cases[r.caseId] ? { ...next, activeCase: r.caseId } : next;
  });
}

/** Remove every demo case from this account. Real cases are untouched (the API refuses them). */
export function removeDemoCases() {
  return enqueue(async current => {
    const gone = new Set(Object.values(current.cases).filter(c => c.demo && c.backendId).map(c => c.backendId!));
    await Promise.all([...gone].map(id => api.delete("/api/cases/" + id)));
    const order = current.order.filter(id => !gone.has(id));
    const cases = Object.fromEntries(order.map(id => [id, current.cases[id]]));
    const base: AppState = order.length ? { ...current, order, cases, activeCase: order.includes(current.activeCase) ? current.activeCase : order[0] } : { ...freshState(current.session?.name || "You", "signin"), drafts: current.drafts, attachments: current.attachments };
    return (await import("./backend")).hydrateBackend(base);
  });
}

export function connectBackend() {
  if (connected || getSnapshot()?.session?.mode !== "signin") return;
  connected = true;
  enqueue(async current => (await import("./backend")).hydrateBackend(current));
}
export function refreshBackend() { connected = false; connectBackend(); }
export const getBackendStatus = () => backendStatus;
export function useBackendStatus() { return useSyncExternalStore(subscribe, statusSnapshot, () => serverStatus); }

export function dispatch(a: Action) {
  const cur = getSnapshot();
  if (a.t === "signOut") { for (const id of Object.keys(getSnapshot()?.attachments || {})) void import("./attachments").then(files => files.forgetFile(id)).catch(() => {}); epoch++; pending = 0; connected = false; localStorage.removeItem(PERSONAL_KEY); for (const id of ["arjun", "sunita", "rahul"]) localStorage.removeItem(EXAMPLE_KEY + "." + id); status({ busy: false, error: null }); return set(null); }
  if (a.t === "signIn") { epoch++; pending = 0; connected = false; status({ busy: false, error: null }); const saved = read(a.mode === "sample" ? EXAMPLE_KEY + "." + (a.persona || "arjun") : PERSONAL_KEY); set(saved || (a.mode === "sample" ? sampleState(a.name, a.persona) : freshState(a.name, a.mode))); if (a.mode === "signin") connectBackend(); return; }
  if (!cur) return;
  if (cur.session?.mode === "signin") {
    if (a.t === "choose" && a.id === "m:sample") return set(sampleState(cur.session.name, cur.session.persona));
    if (a.t === "focus" || a.t === "switchThread") return set(reduce(cur, a));
    return enqueue(async current => (await import("./backend")).backendAction(current, a), a.t === "doc.upload" ? a.t + ":" + a.file.name + ":" + a.file.size + ":" + a.file.lastModified : JSON.stringify(a));
  }
  let next = reduce(cur, a);
  for (const record of Object.values(next.cases)) for (const doc of record.docs) if (doc.state === "processing") next = reduce(next, { t: "doc.ready", id: doc.id });
  set(next);
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

export function getConversationDraft(threadId: string): string { return getSnapshot()?.drafts?.[threadId] || ""; }
export function saveConversationDraft(threadId: string, text: string) {
  const current = getSnapshot();
  if (current) set({ ...current, drafts: { ...current.drafts, [threadId]: text } });
}

export async function attachDocument(file: File) {
  const current = getSnapshot(); if (!current || current.session?.mode !== "signin") return;
  const token = epoch;
  const id = crypto.randomUUID();
  try {
    const files = await import("./attachments"); await files.keepFile(id, file);
    if (token !== epoch) { await files.forgetFile(id); return; }
    const latest = getSnapshot()!;
    const threadId = current.cases[current.activeCase].activeThread;
    set({ ...latest, attachments: { ...latest.attachments, [id]: { id, name: file.name, threadId, state: "ready" } } });
    await retryAttachment(id);
  } catch (error) { status({ busy: false, error: error instanceof Error ? error.message : "Could not preserve the attachment." }); }
}
export async function retryAttachment(id: string) {
  const current = getSnapshot(); const attachment = current?.attachments?.[id]; if (!current || !attachment || backendStatus.busy) return;
  const token = epoch;
  const files = await import("./attachments");
  const file = await files.readFile(id);
  if (token !== epoch || !getSnapshot()?.cases[getSnapshot()!.activeCase].threads.some(t => t.id === attachment.threadId)) return;
  if (!file) { status({ busy: false, error: "The attachment is no longer available. Please choose it again." }); return; }
  set({ ...current, attachments: { ...current.attachments, [id]: { ...attachment, state: "uploading" } } });
  const ok = await dispatch({ t: "doc.upload", file, threadId: attachment.threadId });
  if (token !== epoch) return;
  if (ok) { await removeAttachment(id); }
  else {
    const latest = getSnapshot(); if (latest) set({ ...latest, attachments: { ...latest.attachments, [id]: { ...attachment, state: "failed", error: backendStatus.error || "Could not upload this document." } } });
    status({ busy: false, error: null });
  }
}
export async function removeAttachment(id: string) {
  await (await import("./attachments")).forgetFile(id);
  const current = getSnapshot(); if (!current) return;
  const attachments = { ...current.attachments }; delete attachments[id]; set({ ...current, attachments });
}

/** The current state, for async code that must read what a dispatch just produced. */
export const peekState = () => getSnapshot();
