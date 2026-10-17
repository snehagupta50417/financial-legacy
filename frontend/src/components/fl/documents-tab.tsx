"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/client";
import type { CaseWorkspace } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CATEGORY_LABEL, DOC_CATEGORY_LABEL } from "./ui-bits";
import { caseHref } from "./case-nav";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CircleAlert,
  CloudUpload,
  FileScan,
  Loader2,
  ShieldCheck,
  FileWarning,
} from "lucide-react";

export default function DocumentsTab({ ws, reload }: { ws: CaseWorkspace; reload: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("caseId", ws.case.id);
      form.append("file", file);
      const res = await api.upload<{
        document: { extractionStatus: string; extractionNote: string | null };
        cluesAdded: number;
      }>("/api/documents", form);
      if (res.document.extractionStatus === "extracted") {
        toast({
          title: "Extraction complete",
          description: `${file.name}: fields extracted${res.cluesAdded ? `, ${res.cluesAdded} new asset clue(s) added to your inventory` : ""}. Open the document to review them.`,
        });
      } else {
        toast({
          title: "Extraction failed — honest status",
          description: res.document.extractionNote ?? "No readable text found.",
          variant: "destructive",
        });
      }
      await reload();
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="max-w-2xl">
        <h1 className="font-display text-[26px] font-semibold text-navy">Documents</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          Statements, policy papers, letters and certificates. We read each one and show you what we found — nothing counts until
          you&apos;ve checked it.
        </p>
      </div>

      {/* Upload zone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card px-6 py-8 text-center transition-colors",
          dragOver ? "border-teal-brand bg-teal-soft/60" : "border-border hover:border-teal-brand/40"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.txt,.csv,.md,.jpg,.jpeg,.png,.webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.currentTarget.value = "";
          }}
        />
        {uploading ? (
          <>
            <Loader2 className="mb-2 h-9 w-7 animate-spin text-teal-brand" />
            <div className="text-[16px] font-medium text-navy">Running real text extraction…</div>
            <div className="mt-1 text-[14px] text-muted-foreground">PDF text layer → structured fields → evidence-linked clues</div>
          </>
        ) : (
          <>
            <CloudUpload className="mb-2 h-9 w-7 text-teal-brand" />
            <div className="text-[16px] font-medium text-navy">Drop a statement, policy, letter or will — or click to browse</div>
            <div className="mt-1 text-[14px] text-muted-foreground">
              PDFs (including scans), photos and text files · max 8MB · you check every field before it becomes a fact
            </div>
          </>
        )}
      </label>

      {/* Documents list */}
      <ul className="space-y-3">
        {ws.documents.map((d) => {
          const reviewHref = `${caseHref(ws.case.id, "records")}/documents/${d.id}`;
          const failed = d.extractionStatus === "failed";
          return (
            <li key={d.id}>
              <Card className="gap-0 rounded-2xl py-0">
                <CardContent className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal-brand">
                        {failed ? <FileWarning className="h-4.5 w-4.5" /> : <FileScan className="h-4.5 w-4.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[15px] font-semibold text-navy">{d.fileName}</span>
                          {d.isSynthetic && <Badge className="rounded bg-gold-soft px-1.5 text-[12px] font-bold text-[#7a5a1c]">DEMO</Badge>}
                        </div>
                        <div className="mt-0.5 text-[13px] text-muted-foreground">
                          {DOC_CATEGORY_LABEL[d.category] ?? CATEGORY_LABEL[d.category] ?? d.category} · {d.sizeLabel ?? ""} · {new Date(d.createdAt).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {failed ? (
                        <Badge variant="outline" className="rounded-full border-destructive/30 text-[12px] text-destructive">Could not read</Badge>
                      ) : d.userVerified ? (
                        <Badge variant="outline" className="rounded-full border-teal-brand/40 text-[12px] text-[#0b6b6a]">
                          <ShieldCheck className="mr-1 h-3 w-3" /> Fields reviewed
                        </Badge>
                      ) : d.extractedFields.length > 0 ? (
                        <Badge variant="outline" className="rounded-full border-gold/40 bg-gold-soft text-[12px] text-[#7a5a1c]">
                          {d.extractedFields.length} fields to review
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {d.extractionNote && (
                    <p className={cn("rounded-lg px-3.5 py-3 text-[14px] leading-relaxed", failed ? "flex items-start gap-2 border border-destructive/20 bg-destructive/5 text-destructive" : "bg-background text-ink/80")}>
                      {failed && <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
                      {d.extractionNote}
                    </p>
                  )}

                  {d.extractedFields.length > 0 && (
                    <div className="flex justify-end">
                      <Button asChild size="sm" className={cn("h-9 text-[14px]", d.userVerified ? "border bg-card text-navy hover:bg-teal-soft" : "bg-teal-brand text-white hover:bg-[#0c6a69]")}>
                        <Link href={reviewHref}>
                          {d.userVerified ? "View reviewed fields" : "Review fields"} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {!ws.documents.length && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FileScan className="h-9 w-7 text-muted-foreground/40" />
            <div className="text-[16px] font-medium text-navy">No documents yet</div>
            <p className="max-w-md text-[14px] leading-relaxed text-muted-foreground">
              Upload a bank statement, policy receipt, claim letter or will draft. Extraction runs on the actual file
              text — if nothing can be read, you&apos;ll see a clear error instead of fake results.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
