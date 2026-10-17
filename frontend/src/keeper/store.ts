"use client";
import { useSyncExternalStore } from "react";
import { freshState, reduce, START_CHOICES, type Action } from "./engine";
import { sampleState } from "./sample";
import { WELCOME_NEW } from "./catalog";
import type { AppState } from "./types";

/**
 * Tiny external store with localStorage persistence. It holds SYNTHETIC demo progress and a display
 * name only — never real files, credentials or secrets. `undefined` = not loaded yet (server render),
 * `null` = signed out.
 */
const KEY = "keeper.demo.v1";
const PERSONAL_KEY = "keeper.personal.v1";
const EXAMPLE_KEY = "keeper.example.v1";
let state: AppState | null | undefined;
const listeners = new Set<() => void>();

function read(storageKey = KEY): AppState | null {
  try {
    const raw = localStorage.getItem(storageKey);
    const p = raw ? (JSON.parse(raw) as AppState) : null;
    if (!(p && p.v === 1 && p.cases && p.cases[p.activeCase])) return null;
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
    if (next) { localStorage.setItem(KEY, JSON.stringify(next)); localStorage.setItem(next.session?.mode === "sample" ? EXAMPLE_KEY : PERSONAL_KEY, JSON.stringify(next)); }
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

export function connectBackend() {
  if (connected || getSnapshot()?.session?.mode !== "signin") return;
  connected = true;
  enqueue(async current => (await import("./backend")).hydrateBackend(current));
}
export function refreshBackend() { connected = false; connectBackend(); }
export function useBackendStatus() { return useSyncExternalStore(subscribe, statusSnapshot, () => serverStatus); }

export function dispatch(a: Action) {
  const cur = getSnapshot();
  if (a.t === "signOut") { for (const id of Object.keys(getSnapshot()?.attachments || {})) void import("./attachments").then(files => files.forgetFile(id)).catch(() => {}); epoch++; pending = 0; connected = false; localStorage.removeItem(PERSONAL_KEY); localStorage.removeItem(EXAMPLE_KEY); status({ busy: false, error: null }); return set(null); }
  if (a.t === "signIn") { epoch++; pending = 0; connected = false; status({ busy: false, error: null }); const saved = read(a.mode === "sample" ? EXAMPLE_KEY : PERSONAL_KEY); set(saved || (a.mode === "sample" ? sampleState(a.name) : freshState(a.name, a.mode))); if (a.mode === "signin") connectBackend(); return; }
  if (!cur) return;
  if (cur.session?.mode === "signin") {
    if (a.t === "choose" && a.id === "m:sample") return set(sampleState(cur.session.name));
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
