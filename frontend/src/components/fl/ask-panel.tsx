"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, Send, X } from "lucide-react";

interface QA {
  q: string;
  a: string;
  error?: boolean;
}

/** Floating (with onClose) or inline in the Conversation area (without). */
export default function AskPanel({ caseId, onClose }: { caseId: string; onClose?: () => void }) {
  const [items, setItems] = useState<QA[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function ask() {
    const question = q.trim();
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
            ? { ...x, a: e instanceof Error ? e.message : "The assistant is unavailable — your case is unaffected.", error: true }
            : x
        )
      );
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <Card className={onClose ? "mb-3 w-[min(92vw,380px)] border-navy/20 shadow-xl" : "w-full min-w-0"}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-teal-brand" />
            <span className="text-[13px] font-semibold text-navy">Case assistant</span>
          </div>
          {onClose && (
            <button onClick={onClose} aria-label="Close assistant" className="text-muted-foreground hover:text-navy">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className={`nice-scroll overflow-y-auto px-4 py-3 ${onClose ? "max-h-[320px]" : "max-h-[420px]"}`}>
          {!items.length && (
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Ask anything about this case — &ldquo;what&apos;s blocking the LIC claim?&rdquo;, &ldquo;what do I need
              for UDGAM?&rdquo;, &ldquo;summarise where we are&rdquo;. Answers come from your case file only.
            </p>
          )}
          <div className="space-y-3">
            {items.map((x, i) => (
              <div key={i} className="space-y-1.5">
                <div className="ml-auto w-fit max-w-[90%] rounded-xl rounded-br-sm bg-navy px-3 py-2 text-[12.5px] text-white">{x.q}</div>
                {x.a ? (
                  <div className={`w-fit max-w-[95%] rounded-xl rounded-bl-sm border px-3 py-2 text-[12.5px] leading-relaxed ${x.error ? "border-destructive/25 bg-destructive/5 text-destructive" : "bg-background text-ink/85"}`}>
                    {x.a}
                  </div>
                ) : (
                  <div className="typing-dots w-fit px-3 py-2 text-teal-brand">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t p-3">
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ask about this case…"
            aria-label="Ask about this case"
            className="h-9 text-[12.5px]"
            disabled={busy}
          />
          <Button size="icon" onClick={ask} disabled={busy || !q.trim()} className="h-9 w-9 shrink-0 bg-navy text-white hover:bg-navy-deep" aria-label="Ask">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
