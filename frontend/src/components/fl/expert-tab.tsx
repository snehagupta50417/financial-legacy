"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { CaseWorkspace } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { Copy, Handshake, Loader2, ShieldAlert } from "lucide-react";

const EXPERT_TYPES = [
  { value: "Estate / inheritance lawyer", label: "Estate or inheritance lawyer" },
  { value: "Insurance claims specialist", label: "Insurance claims specialist" },
  { value: "Cross-border tax advisor", label: "Cross-border tax advisor" },
  { value: "Succession certificate counsel", label: "Succession certificate counsel" },
  { value: "Will / probate solicitor (NRI)", label: "Will or probate solicitor (NRI matters)" },
];

export default function ExpertTab({ ws }: { ws: CaseWorkspace }) {
  const [expertType, setExpertType] = useState(EXPERT_TYPES[0].value);
  const [question, setQuestion] = useState("");
  const [pack, setPack] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const res = await api.post<{ draft: string; label: string }>("/api/ai/draft", {
        caseId: ws.case.id,
        kind: "expert",
        expertType,
        context: question,
      });
      setPack(res.draft);
      toast({ title: "Expert pack ready", description: "Case summary + enquiry draft — copy it into your own outreach." });
    } catch (e) {
      toast({ title: "Generation unavailable", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-navy">
              <Handshake className="h-4 w-4 text-teal-brand" /> Prepare a professional pack
            </div>
            <div>
              <div className="mb-1.5 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Type of expert needed</div>
              <Select value={expertType} onValueChange={setExpertType}>
                <SelectTrigger className="text-[15px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPERT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Your question / situation note</div>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., My father's will names me as executor but my brother contests it. What are my options?"
                className="min-h-[90px] text-[15px]"
              />
            </div>
            <Button onClick={generate} disabled={busy} className="w-full bg-navy text-white hover:bg-navy-deep">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generate case summary &amp; enquiry draft
            </Button>
            <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold-soft/60 px-3 py-2.5 text-[13px] leading-relaxed text-ink/75">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7a5a1c]" />
              Financial Legacy does not provide legal advice or broker professionals. This pack helps you brief a qualified
              expert efficiently — you choose and engage them yourself.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="self-start">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[15px] font-semibold text-navy">Expert enquiry pack</div>
            {pack && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-[14px]"
                onClick={() => {
                  navigator.clipboard.writeText(pack).then(
                    () => toast({ title: "Copied", description: "Pack copied to clipboard." }),
                    () => toast({ title: "Copy failed", variant: "destructive" })
                  );
                }}
              >
                <Copy className="mr-1 h-3 w-3" /> Copy
              </Button>
            )}
          </div>
          {pack ? (
            <div className="nice-scroll max-h-[620px] overflow-y-auto rounded-lg border bg-background p-4 text-[15px] leading-relaxed">
              <ReactMarkdown
                components={{
                  h1: (p) => <h1 className="font-display mb-3 text-[16px] font-bold text-navy" {...p} />,
                  h2: (p) => <h2 className="font-display mb-2 mt-4 text-[16px] font-semibold text-navy" {...p} />,
                  p: (p) => <p className="mb-2.5 text-ink/85" {...p} />,
                  li: (p) => <li className="mb-1 ml-4 list-disc text-ink/85" {...p} />,
                  strong: (p) => <strong className="font-semibold text-navy" {...p} />,
                }}
              >
                {pack}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Handshake className="h-9 w-7 text-muted-foreground/40" />
              <p className="max-w-xs text-[14px] leading-relaxed text-muted-foreground">
                Disputed inheritance, contested wills, complex succession or cross-border tax — describe the question
                and get a structured pack a professional can act on immediately.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
