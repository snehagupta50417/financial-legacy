"use client";
import { useEffect, useState } from "react";
import type { DocumentProgress } from "@shared/document-progress";
import { api } from "@/lib/client";
import { dispatch, refreshBackend } from "@/keeper/store";
import type { Case, Doc } from "@/keeper/types";
import { Btn, Card } from "./ui";

export function DocumentVerification({ d, c }: { d: Doc; c: Case }) {
  const [progress, setProgress] = useState<DocumentProgress | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const version = JSON.stringify([d.fields, c.assets, c.claims]);
  useEffect(() => {
    let live = true;
    api.get<{ progress: DocumentProgress }>("/api/documents/" + d.id + "/progress").then(r => {
      if (live) { setProgress(r.progress); setError(""); }
    }).catch(() => { if (live) setError("Could not load document checks. Retry below."); });
    return () => { live = false; };
  }, [d.id, version]);
  return <Card className="space-y-3 border-moss/30">
    <h3 className="font-semibold">Document to claim</h3>
    {progress && <><p className="text-sm">{progress.summary}</p>
      <ol className="space-y-3">{progress.steps.map(step => <li key={step.key} className="text-sm">
        <div className="flex justify-between gap-3"><span className="font-medium">{step.label}</span><span>{step.state === "done" ? "Complete" : step.state === "action" ? "Your review" : step.state === "external" ? "With institution" : "Pending"}</span></div>
        <p className="text-muted-foreground">{step.detail}</p>
      </li>)}</ol>
      <Btn onClick={() => dispatch({ t: "focus", focus: { type: progress.next.type, id: progress.next.id } })}>{progress.next.label}</Btn>
    </>}
    <Btn variant="quiet" disabled={busy} onClick={async () => {
      setBusy(true); setError("");
      try { const r = await api.post<{ progress: DocumentProgress }>("/api/documents/" + d.id + "/progress", {}); setProgress(r.progress); refreshBackend(); }
      catch { setError("Document saved. Preparation could not finish; please retry."); }
      finally { setBusy(false); }
    }}>{busy ? "Checking…" : "Recheck and prepare"}</Btn>
    {error && <p role="alert" className="text-sm">{error}</p>}
  </Card>;
}
