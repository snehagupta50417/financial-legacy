"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/client";
import type { CaseWorkspace } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfidenceMeter, EvidenceBox, CATEGORY_LABEL } from "./ui-bits";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CircleCheckBig,
  CircleAlert,
  CloudUpload,
  FileScan,
  Loader2,
  Pencil,
  ShieldCheck,
  FileWarning,
} from "lucide-react";

export default function DocumentsTab({ ws, reload }: { ws: CaseWorkspace; reload: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftFields, setDraftFields] = useState<{ label: string; value: string }[]>([]);

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
          description: `${file.name}: fields extracted${res.cluesAdded ? `, ${res.cluesAdded} new asset clue(s) added to your inventory` : ""}. Review them below.`,
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

  function startEditing(docId: string, fields: { label: string; value: string }[]) {
    setEditing(docId);
    setDraftFields(fields.map((f) => ({ label: f.label, value: f.value })));
  }

  async function saveEdits(docId: string) {
    try {
      const full = ws.documents.find((d) => d.id === docId);
      const merged = draftFields.map((d, i) => ({
        ...d,
        confidence: full?.extractedFields[i]?.confidence ?? 0.9,
        sourceExcerpt: full?.extractedFields[i]?.sourceExcerpt ?? "Corrected by user",
      }));
      await api.patch(`/api/documents/${docId}`, { extractedFields: merged, userVerified: true });
      toast({ title: "Corrections saved", description: "Marked as user-verified — the AI treats these as confirmed facts." });
      setEditing(null);
      await reload();
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
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
          accept=".pdf,.txt,.csv,.md,.jpg,.jpeg,.png"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.currentTarget.value = "";
          }}
        />
        {uploading ? (
          <>
            <Loader2 className="mb-2 h-7 w-7 animate-spin text-teal-brand" />
            <div className="text-[14px] font-medium text-navy">Running real text extraction…</div>
            <div className="mt-1 text-[12px] text-muted-foreground">PDF text layer → structured fields → evidence-linked clues</div>
          </>
        ) : (
          <>
            <CloudUpload className="mb-2 h-7 w-7 text-teal-brand" />
            <div className="text-[14px] font-medium text-navy">Drop a statement, policy, letter or will — or click to browse</div>
            <div className="mt-1 text-[12px] text-muted-foreground">
              Text files &amp; text-based PDFs get real AI extraction · max 8MB · you verify every field before it becomes a fact
            </div>
          </>
        )}
      </label>

      {/* Documents list */}
      <div className="space-y-3">
        {ws.documents.map((d) => {
          const open = expanded === d.id;
          return (
            <Card key={d.id}>
              <CardContent className="p-0">
                <button
                  onClick={() => setExpanded(open ? null : d.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal-brand">
                      {d.extractionStatus === "failed" ? <FileWarning className="h-4.5 w-4.5" /> : <FileScan className="h-4.5 w-4.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-semibold text-navy">{d.fileName}</span>
                        {d.isSynthetic && <Badge className="rounded bg-gold-soft px-1.5 text-[9.5px] font-bold text-gold">DEMO</Badge>}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                        {CATEGORY_LABEL[d.category] ?? d.category} · {d.sizeLabel ?? ""} · {new Date(d.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {d.extractionStatus === "extracted" && (
                      <Badge className="rounded-full bg-teal-brand text-[10.5px] text-white">Extracted</Badge>
                    )}
                    {d.extractionStatus === "failed" && (
                      <Badge variant="outline" className="rounded-full border-destructive/30 text-[10.5px] text-destructive">Failed — honest</Badge>
                    )}
                    {d.userVerified && (
                      <Badge variant="outline" className="rounded-full border-teal-brand/30 text-[10.5px] text-teal-brand">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                      </Badge>
                    )}
                  </div>
                </button>

                {open && (
                  <div className="border-t px-5 py-4">
                    {d.extractionNote && (
                      <div className="mb-3 rounded-lg bg-background px-3.5 py-3 text-[12.5px] leading-relaxed text-ink/80">
                        <span className="font-semibold text-navy">Summary: </span>
                        {d.extractionNote}
                      </div>
                    )}

                    {d.extractionStatus === "failed" && (
                      <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-[12.5px] leading-relaxed text-destructive">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        {d.extractionNote}
                      </div>
                    )}

                    {d.extractedFields.length > 0 && (
                      <>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Extracted fields — {d.userVerified ? "user-verified" : "review & correct"}
                          </div>
                          {editing === d.id ? (
                            <div className="flex gap-1.5">
                              <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => setEditing(null)}>Cancel</Button>
                              <Button size="sm" className="h-7 bg-teal-brand text-[12px] text-white hover:bg-[#0c6a69]" onClick={() => saveEdits(d.id)}>
                                <CircleCheckBig className="mr-1 h-3 w-3" /> Save &amp; verify
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-teal-brand/30 text-[12px] text-teal-brand hover:bg-teal-soft"
                              onClick={() => startEditing(d.id, d.extractedFields)}
                            >
                              <Pencil className="mr-1 h-3 w-3" /> Correct / verify
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(editing === d.id ? draftFields : d.extractedFields).map((f, i) => (
                            <div key={i} className="rounded-lg border bg-background p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</div>
                                {editing !== d.id && <ConfidenceMeter value={d.extractedFields[i]?.confidence ?? 0.5} />}
                              </div>
                              {editing === d.id ? (
                                <Input
                                  className="mt-1 h-8 text-[12.5px]"
                                  value={draftFields[i]?.value ?? ""}
                                  onChange={(e) =>
                                    setDraftFields((arr) => arr.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                                  }
                                />
                              ) : (
                                <div className="mt-0.5 text-[13px] font-medium text-ink">{f.value}</div>
                              )}
                              {editing !== d.id && d.extractedFields[i]?.sourceExcerpt && (
                                <div className="mt-1.5 border-l-2 border-teal-brand/30 pl-2 text-[11px] italic leading-relaxed text-muted-foreground">
                                  “{d.extractedFields[i]?.sourceExcerpt}”
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!ws.documents.length && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FileScan className="h-7 w-7 text-muted-foreground/40" />
            <div className="text-[14px] font-medium text-navy">No documents yet</div>
            <p className="max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
              Upload a bank statement, policy receipt, claim letter or will draft. Extraction runs on the actual file
              text — if nothing can be read, you&apos;ll see a clear error instead of fake results.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
