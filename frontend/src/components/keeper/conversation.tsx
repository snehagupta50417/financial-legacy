"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, FileText, Info, Mic, Paperclip, Send } from "lucide-react";
import { STARTERS } from "@/keeper/catalog";
import type { DocVariant } from "@/keeper/engine";
import { dispatch, setPrefs, useKeeper, useBackendStatus, saveConversationDraft, attachDocument, retryAttachment, removeAttachment } from "@/keeper/store";
import type { Choice, Message } from "@/keeper/types";
import { speak } from "@/keeper/voice";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";
import { AgentMode, Orb } from "./agent-mode";
import { DemoInline } from "./demo-data";
import { Btn, ChatBubble } from "./ui";
import { nextWork, plainCopy } from "@/keeper/presentation";

const JOURNEY_PARAM: Record<string, string> = { discover: "Find my assets", prepare: "Prepare for my family", claim: "Get help after a death" };
const SAMPLE_DOCS: [DocVariant, string][] = [
  ["statement", "Bank statement "], ["policy", "Insurance policy (sample)"], ["folio", "Mutual fund statement (sample)"],
  ["unreadable", "Blurred scan (sample)"], ["password", "Password-protected PDF (sample)"], ["duplicate", "A copy of a document you added"],
];
const GENERIC: Choice[] = [{ id: "m:unknown", label: "I don’t know" }, { id: "m:skip", label: "Skip for now" }, { id: "m:why", label: "Why do you need this?" }];
const CARD_LABEL = { know: "Review case details", plan: "Review sources", asset: "Review holding", doc: "Review document", claim: "Review claim", family: "Review family record" } as const;

function Chips({ choices, pending, onPick }: { choices?: Choice[]; pending?: string; onPick: (c: Choice) => void }) {
  const { busy } = useBackendStatus();
  const primary = (choices || []).filter(c => c.id !== "m:sample");
  if (!primary.length && !pending) return null;
  return <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Suggested replies">
    {primary.map(c => <button key={c.id} disabled={busy} onClick={() => onPick(c)} className="min-h-11 rounded-full border border-moss/40 bg-paper px-4 text-[0.93rem] font-medium hover:bg-moss-soft">{plainCopy(c.label)}</button>)}
    {pending && <><button disabled={busy} onClick={() => onPick(GENERIC[0])} className="min-h-11 rounded-full px-3 text-[0.88rem] text-muted-foreground hover:bg-secondary">I don’t know</button><details className="relative"><summary className="min-h-11 cursor-pointer rounded-full px-3 py-2.5 text-[0.88rem] text-moss hover:bg-secondary">More replies</summary><div className="absolute bottom-12 left-0 z-20 w-52 rounded-xl border border-line bg-paper p-1 shadow-sm">{GENERIC.slice(1).map(c => <button key={c.id} disabled={busy} className="block min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-secondary" onClick={e => { onPick(c); e.currentTarget.closest("details")?.removeAttribute("open"); }}>{c.label}</button>)}</div></details></>}
  </div>;
}

function MessageText({ text, user }: { text: string; user?: boolean }) {
  const clean = user ? text : plainCopy(text);
  const split = clean.indexOf("\n\nSources\n");
  if (split < 0) return <>{clean}</>;
  return <>{clean.slice(0, split)}<details className="mt-3 whitespace-normal"><summary className="cursor-pointer text-[0.85rem] font-medium text-moss">Sources and evidence</summary><div className="mt-2 whitespace-pre-wrap text-[0.85rem] text-muted-foreground">{clean.slice(split + 10).split(/(https?:\/\/[^\s]+)/g).map((part, i) => /^https?:\/\//.test(part) ? <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all underline">{part}</a> : part)}</div></details></>;
}

function Bubble({ m, onOpen, current }: { current?: boolean; m: Message; onOpen: (type: NonNullable<Message["card"]>["type"], id?: string) => void }) {
  if (m.role === "user") {
    return <ChatBubble user><span className="sr-only">You: </span>{m.voice && <span className="mb-1 flex items-center gap-1 text-[0.78rem] text-ivory/70"><Mic className="h-3 w-3" aria-hidden />Spoken, as transcribed</span>}<MessageText text={m.text} user /></ChatBubble>;
  }
  return (
    <ChatBubble className={cn("border", m.role === "note" ? "border-dashed border-moss/50 bg-moss-soft/50" : current && m.pending ? "border-moss/30 bg-paper" : "border-transparent bg-paper")}>
      <span className="sr-only">Keeper: </span>
      {m.role === "note" && <span className="mb-1 block text-[0.78rem] font-semibold text-moss">Update</span>}
      <MessageText text={m.text} />
      {m.card && <button onClick={() => onOpen(m.card!.type, m.card!.id)} className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-line bg-ivory px-4 text-left text-[0.92rem] font-semibold hover:bg-secondary"><span className="flex items-center gap-2"><FileText className="h-4 w-4 text-moss" aria-hidden />{CARD_LABEL[m.card.type]}</span><ArrowRight className="h-4 w-4 text-moss" aria-hidden /></button>}
    </ChatBubble>
  );
}

export default function Conversation() {
  const backend = useBackendStatus();
  const router = useRouter();
  const params = useSearchParams();
  const { state, c, th } = useKeeper();
  const text = th ? state?.drafts?.[th.id] || "" : "";
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  // The details panel is there when asked for, not by default: the conversation leads.
  const [asideOpen, setAsideOpen] = useState(() => { try { return localStorage.getItem("keeper.details") === "open"; } catch { return false; } });
  const toggleDetails = () => {
    dispatch({ t: "focus", focus: c?.focus ?? { type: "know" } });
    if (window.matchMedia("(min-width: 1280px)").matches) setAsideOpen((o) => { try { localStorage.setItem("keeper.details", o ? "closed" : "open"); } catch { /* not remembered */ } return !o; });
    else setSheet(true);
  };
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastThread = useRef<string | null>(null);
  const followLatest = useRef(true);
  const started = useRef(false);
  const spoken = useRef<string | null>(null);
  const msgs = th?.messages ?? [];

  // A choice made on the landing page carries into the conversation.
  useEffect(() => {
    const j = params.get("journey");
    if (!j || !JOURNEY_PARAM[j] || started.current || !th) return;
    started.current = true;
    if (!th.journey && th.messages.length <= 1) dispatch({ t: "choose", id: `j:${j}`, label: JOURNEY_PARAM[j] });
    router.replace("/app");
  }, [params, th, router]);

  useEffect(() => {
    if (!th?.id || !scrollRef.current) return;
    const container = scrollRef.current;
    if (lastThread.current !== th.id) {
      container.scrollTop = Number(sessionStorage.getItem("keeper.scroll." + th.id) || container.scrollHeight);
      lastThread.current = th.id;
    } else if (followLatest.current) container.scrollTop = container.scrollHeight;
  }, [msgs.length, th?.id]);

  useEffect(() => {
    const container = scrollRef.current; if (!container) return;
    const observer = new ResizeObserver(() => { if (followLatest.current) container.scrollTop = container.scrollHeight; });
    observer.observe(container); return () => observer.disconnect();
  }, []);

  // Spoken replies only when the user turned them on and the browser supports it.
  const lastK = msgs.filter((m) => m.role === "keeper").at(-1);
  useEffect(() => {
    if (state?.speakReplies && lastK && spoken.current !== lastK.id) { if (spoken.current !== null) speak(lastK.text); spoken.current = lastK.id; }
    else if (lastK && spoken.current === null) spoken.current = lastK.id;
  }, [lastK, state?.speakReplies]);

  if (!c || !th) return null;
  const fresh = msgs.length === 1 && !th.journey && Object.keys(c.facts).length === 0;
  const work = nextWork(c);
  const updateText = (value: string) => { saveConversationDraft(th.id, value); };
  const open = (type: NonNullable<Message["card"]>["type"], id?: string) => {
    dispatch({ t: "focus", focus: { type, id } });
    if (!window.matchMedia("(min-width: 1280px)").matches) setSheet(true);
  };
  const submit = () => { const t = text.trim(); if (!t || backend.busy) return; followLatest.current = true; const result = dispatch({ t: "send", text: t }); if (result) void result.then(ok => { if (ok) updateText(""); }); else updateText(""); };
  const pick = (ch: Choice) => { followLatest.current = true; if (ch.id.startsWith("a:sampleDoc:") || ch.id.startsWith("a:linkStatement:")) { router.push("/app/documents"); return; } dispatch({ t: "choose", id: ch.id, label: ch.label }); };
  const lastMsg = msgs.at(-1);
  const who = state?.session?.name?.trim();
  const greeting = who && who !== "You" ? "Hi " + who.split(" ")[0] + ". What’s on your mind?" : "What’s on your mind?";

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Conversation with Keeper">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-8">
          <div className="min-w-0"><p className="truncate font-semibold">{th.title}</p><p className="truncate text-[0.85rem] text-muted-foreground">Whose information: <b className="text-ink">{c.name}</b></p></div>
          <div className="flex items-center gap-2"><Btn variant="quiet" className="min-h-10 px-4 text-[0.88rem]" aria-pressed={asideOpen} onClick={toggleDetails}><Info className="h-4 w-4" aria-hidden />Details</Btn></div>
        </header>

        <div ref={scrollRef} onScroll={e => { const el = e.currentTarget; followLatest.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; sessionStorage.setItem("keeper.scroll." + th.id, String(el.scrollTop)); }} className="scroll-soft flex-1 overflow-y-auto px-4 py-6 sm:px-8" role="log" aria-live="polite" aria-label="Messages">
          <div className="mx-auto flex max-w-[44rem] flex-col gap-3">
            {!fresh && msgs.map((m) => <Bubble key={m.id} m={m} current={m.id === lastMsg?.id} onOpen={open} />)}
            {backend.busy && <p role="status" className="px-4 text-sm text-muted-foreground">Reviewing records…</p>}
            {fresh ? (
              <div className="settle flex flex-col items-center gap-6 pt-4 text-center sm:pt-10">
                <Orb phase="idle" onClick={() => setVoiceOpen(true)} />
                <div>
                  <h2 className="display text-[1.9rem] leading-tight sm:text-[2.3rem]">{greeting}</h2>
                  <p className="mx-auto mt-2 max-w-md text-ink/75">Tap the mic and tell Keeper what’s going on, or type below. It takes things one step at a time and asks before it changes anything.</p>
                </div>
                <div className="w-full max-w-md">
                  <p className="mb-2 text-[0.85rem] font-medium text-muted-foreground">Or start with a situation</p>
                  <div className="flex flex-col gap-2">{STARTERS.map((s) => <button key={s.journey} onClick={() => dispatch({ t: "send", text: s.text })} className="min-h-12 rounded-2xl border border-moss/40 bg-paper px-4 py-2 text-left font-medium hover:bg-moss-soft">{s.label}</button>)}</div>
                  <div className="mt-4 flex flex-col items-center"><p className="text-[0.85rem] text-muted-foreground">Not ready to share anything yet?</p><DemoInline /></div>
                </div>
              </div>
            ) : work && lastMsg?.card === undefined && !lastMsg?.pending ? <div className="flex flex-wrap items-center gap-2 text-sm"><span className="mr-1 text-muted-foreground">{work.text}</span><Btn variant="quiet" onClick={() => open(work.card.type, work.card.id)}>Continue</Btn><button className="min-h-11 px-3 text-moss" onClick={() => dispatch({ t: "choose", id: "m:something", label: "Something else" })}>Something else</button></div> : lastMsg && lastMsg.role !== "user" ? <Chips choices={lastMsg.card ? lastMsg.choices?.filter(c => c.id !== "m:resume") : lastMsg.choices} pending={lastMsg.pending} onPick={pick} /> : null}
            <div ref={endRef} />
          </div>
        </div>

        <form className="border-t border-line bg-ivory px-4 py-3 sm:px-8" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {Object.values(state?.attachments || {}).filter(a => a.threadId === th.id).map(a => <div key={a.id} className="mx-auto mb-2 flex max-w-[44rem] flex-wrap items-center gap-2 text-sm"><FileText className="h-4 w-4 text-moss" aria-hidden /><span className="max-w-52 truncate">{a.name}</span><span role="status" className="text-muted-foreground">{a.state === "uploading" ? "Reviewing records" : a.state === "failed" ? "Could not complete" : "Ready to upload"}</span>{a.state !== "uploading" && <><button type="button" className="min-h-11 px-2 font-medium text-moss" disabled={backend.busy} onClick={() => void retryAttachment(a.id)}>Retry</button><button type="button" className="min-h-11 px-2 text-muted-foreground" onClick={() => void removeAttachment(a.id)}>Remove</button></>}{a.error && <p role="alert" className="w-full text-sm">{a.error}</p>}</div>)}
          <div className="mx-auto flex max-w-[44rem] items-end gap-2 rounded-3xl border border-input bg-paper p-2">
            <details className="relative">
              <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full hover:bg-secondary" aria-label="Add a document"><Paperclip className="h-5 w-5" aria-hidden /></summary>
              <div className="absolute bottom-14 left-0 z-20 w-72 rounded-2xl border border-line bg-paper p-2 shadow-lg">

                {state?.session?.mode === "signin" && <label className="block min-h-11 cursor-pointer rounded-xl px-3 py-3 font-medium hover:bg-secondary">Add a document<input type="file" accept=".pdf,.txt,.png,.jpg,.jpeg,.webp" className="mt-2 block w-full text-sm" disabled={backend.busy} onChange={e => { const file = e.target.files?.[0]; if (file) void attachDocument(file); e.target.value = ""; }} /></label>}
                {state?.session?.mode === "sample" && SAMPLE_DOCS.map(([v, l]) => <button type="button" key={v} onClick={(e) => { dispatch({ t: "doc.sample", variant: v }); (e.currentTarget.closest("details") as HTMLDetailsElement).open = false; }} className="block min-h-11 w-full rounded-xl px-3 text-left hover:bg-secondary">{l}</button>)}
              </div>
            </details>
            <textarea readOnly={backend.busy} value={text} onChange={(e) => updateText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} rows={1} aria-label="Message Keeper" placeholder="Message Keeper…" className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 [field-sizing:content] focus:outline-none" />
            <button type="button" onClick={() => setVoiceOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-full bg-apricot px-4 font-semibold hover:bg-[#dd9566]"><Mic className="h-5 w-5" aria-hidden /><span className="hidden sm:inline">Talk to Keeper</span><span className="sr-only sm:hidden">Talk to Keeper</span></button>
            <button type="submit" disabled={!text.trim() || backend.busy} aria-label="Send message" className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-ivory disabled:opacity-40"><Send className="h-4 w-4" aria-hidden /></button>
          </div>
          <p className="mx-auto mt-2 max-w-[44rem] text-center text-[0.78rem] text-muted-foreground">Keeper never asks for passwords, PINs or OTPs.</p>
        </form>
      </section>

      <aside className={cn("scroll-soft hidden w-[26rem] shrink-0 overflow-y-auto border-l border-line bg-card/60 p-5", asideOpen && "xl:block")} aria-label="Details panel"><Panel c={c} onContinue={() => dispatch({ t: "choose", id: "m:resume", label: "Continue" })} /></aside>
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-ivory p-5">
          <SheetHeader className="p-0"><SheetTitle className="display text-[1.6rem]">Details</SheetTitle><SheetDescription className="sr-only">Saved case details</SheetDescription></SheetHeader>
          <div className="mt-3"><Panel c={c} onContinue={() => { dispatch({ t: "choose", id: "m:resume", label: "Continue" }); setSheet(false); }} /></div>
        </SheetContent>
      </Sheet>
      <AgentMode open={voiceOpen} onClose={() => setVoiceOpen(false)} onTyping={() => {}} />
    </div>
  );
}
