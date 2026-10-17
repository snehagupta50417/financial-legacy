"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bot, Send, X } from "lucide-react";

interface QA {
  q: string;
  a: string;
  error?: boolean;
}

const SUGGESTIONS = ["What should I do next?", "Which documents do I still need?", "Explain where we are in simple words"];

/**
 * The case assistant. Floating on desktop (with onClose) or inline in the
 * Conversation area (without). Answers come from the case file only; this
 * thread is not saved yet (needs GET /api/cases/:id/messages).
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
      const res = await api.post<{ answer: string }>("/api/ai/ask", { caseId, question });
      setItems((arr) => arr.map((x, i) => (i === arr.length - 1 ? { ...x, a: res.answer } : x)));
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
              Ask anything about this case. Answers come only from what is saved in it — I won&apos;t guess or decide who is
              entitled to what.
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
                <div
                  className={cn(
                    "w-fit max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-bl-md border px-4 py-3 text-[15px] leading-relaxed",
                    x.error ? "border-destructive/25 bg-destructive/5 text-destructive" : "bg-background text-ink/90"
                  )}
                >
                  {x.a}
                </div>
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
