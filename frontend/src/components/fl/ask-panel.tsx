"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AnswerSource } from "@/server/knowledge/citations";
import { Bot, ExternalLink, FileText, Landmark, Send, X } from "lucide-react";

interface QA {
  q: string;
  a: string;
  error?: boolean;
  sources?: AnswerSource[];
  grounded?: boolean;
  passagesOnly?: boolean;
}

interface AskResponse {
  answer: string;
  sources: AnswerSource[];
  grounded: boolean;
  mode: "ai" | "passages";
}

const SUGGESTIONS = [
  "What should I do next?",
  "How long can the bank take to settle a claim?",
  "There's no nominee on the fund — what do we need?",
];

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Numbered sources under an answer: official pages open in a new tab; documents open in the case. */
function SourceList({ caseId, sources, showExcerpt }: { caseId: string; sources: AnswerSource[]; showExcerpt: boolean }) {
  return (
    <div className="max-w-[95%] rounded-xl border bg-card/60 px-3 py-2.5">
      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Sources</div>
      <ol className="space-y-2">
        {sources.map((s) => {
          const Icon = s.kind === "procedure" ? Landmark : s.kind === "document" ? FileText : Bot;
          const title = <span className="font-medium text-navy">{s.title}</span>;
          return (
            <li key={s.n} className="flex gap-2 text-[13px] leading-snug">
              <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-soft px-1 text-[11px] font-semibold text-teal-brand">
                {s.n}
              </span>
              <div className="min-w-0">
                <div className="flex items-start gap-1.5">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  {s.kind === "procedure" && s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {title}
                      <ExternalLink className="ml-1 inline h-3 w-3 align-[-1px]" aria-hidden />
                      <span className="sr-only"> (official page, opens in a new tab)</span>
                    </a>
                  ) : s.kind === "document" && s.documentId ? (
                    <Link href={`/cases/${caseId}/records/documents/${s.documentId}`} className="hover:underline">
                      {title}
                    </Link>
                  ) : (
                    title
                  )}
                </div>
                <div className="text-muted-foreground">
                  {s.publisher}
                  {s.checkedOn ? ` · checked ${formatDate(s.checkedOn)}` : ""}
                </div>
                {showExcerpt && <p className="mt-1 text-ink/75">{s.excerpt}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * The case assistant. Floating on desktop (with onClose) or inline in the
 * Conversation area (without). Answers are grounded in the case file, its
 * documents and the official procedure library, with numbered sources.
 * Answers are saved, but this panel does not reload them yet (needs GET /api/cases/:id/messages).
 */
export default function AskPanel({ caseId, onClose }: { caseId: string; onClose?: () => void }) {
  const [items, setItems] = useState<QA[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const floating = !!onClose;

  async function ask(text?: string) {
    const question = (text ?? q).trim();
    if (!question || busy) return;
    setQ("");
    setItems((arr) => [...arr, { q: question, a: "" }]);
    setBusy(true);
    try {
      const res = await api.post<AskResponse>("/api/ai/ask", { caseId, question });
      setItems((arr) =>
        arr.map((x, i) =>
          i === arr.length - 1
            ? { ...x, a: res.answer, sources: res.sources, grounded: res.grounded, passagesOnly: res.mode === "passages" }
            : x
        )
      );
    } catch (e) {
      setItems((arr) =>
        arr.map((x, i) =>
          i === arr.length - 1
            ? { ...x, a: e instanceof Error ? e.message : "The assistant is unavailable right now — your case is unaffected.", error: true }
            : x
        )
      );
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card", floating ? "mb-3 w-[min(92vw,420px)] shadow-xl" : "shadow-sm")}>
      {floating && (
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-teal-brand" />
            <span className="text-[15px] font-semibold text-navy">Case assistant</span>
          </div>
          <button onClick={onClose} aria-label="Close assistant" className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-navy">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={cn("nice-scroll overflow-y-auto px-4 py-4 sm:px-5", floating ? "max-h-[360px]" : "max-h-[460px]")} aria-live="polite">
        {!items.length && (
          <div>
            <p className="text-[15px] leading-relaxed text-ink/75">
              Ask anything about this case. Answers come from what is saved in it and from official rules (RBI, SEBI,
              IRDAI), with numbered sources — I won&apos;t guess or decide who is entitled to what.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="min-h-10 rounded-full border bg-background px-3.5 text-[14px] text-ink/85 hover:border-teal-brand/40 hover:bg-teal-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-4">
          {items.map((x, i) => (
            <div key={i} className="space-y-2">
              <div className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-md bg-navy px-4 py-2.5 text-[15px] leading-relaxed text-white">{x.q}</div>
              {x.a ? (
                <>
                  <div
                    className={cn(
                      "w-fit max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-bl-md border px-4 py-3 text-[15px] leading-relaxed",
                      x.error ? "border-destructive/25 bg-destructive/5 text-destructive" : "bg-background text-ink/90"
                    )}
                  >
                    {x.a}
                  </div>
                  {!!x.sources?.length && <SourceList caseId={caseId} sources={x.sources} showExcerpt={!!x.passagesOnly} />}
                  {x.grounded === false && !x.error && !x.passagesOnly && (
                    <p className="text-[13px] text-muted-foreground">No source was cited for this answer — check it before relying on it.</p>
                  )}
                </>
              ) : (
                <div className="typing-dots w-fit px-3 py-2 text-teal-brand" role="status" aria-label="Thinking">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-2 border-t bg-background/60 p-3">
        <Textarea
          ref={inputRef}
          value={q}
          rows={1}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
          placeholder="Type your question…"
          aria-label="Ask about this case"
          className="min-h-11 flex-1 resize-none bg-card text-[16px]"
          disabled={busy}
        />
        <Button onClick={() => ask()} disabled={busy || !q.trim()} className="h-11 w-11 shrink-0 bg-navy p-0 text-white hover:bg-navy-deep" aria-label="Send question">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {!floating && <p className="px-4 pb-3 text-[13px] text-muted-foreground">This chat isn&apos;t saved yet. Never share passwords, OTPs or full account numbers.</p>}
    </div>
  );
}
