"use client";
import { useEffect, useState } from "react";
import { api, getSessionId } from "@/lib/client";
import type { Case } from "@/keeper/types";
import { Btn, Card, Hint } from "./ui";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function BackendAccess({ c, assetId }: { c: Case; assetId?: string }) {
  if (!c.backendId || !c.gate || (c.gate.discoveryUnlocked && !assetId) || (assetId && c.gate.journeyKind === "personal")) return null;
  const title = assetId ? "Authority for this holding" : c.gate.nextLabel || "Identity and authority";
  return <Card className="space-y-3 border-moss/30 bg-moss-soft/40">
    <h3 className="font-semibold">{title}</h3>
    <p className="text-[0.95rem]">This source is not connected.</p>
    <Hint>You can keep gathering case details. Protected records and claim preparation require the applicable identity and authority checks.</Hint>
    <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-moss">What will be needed</summary><p className="mt-1 text-sm text-muted-foreground">The institution may require identity evidence, evidence of death, relationship documents and holding-specific entitlement. A death certificate or trusted-contact status alone does not establish authority.</p></details>
  </Card>;
}

export function BackendPackDownload({ claimId }: { claimId: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <div><Btn variant="quiet" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/claims/" + claimId + "/pack", { headers: { "x-session-id": getSessionId() } });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || "Cannot download this pack."); }
      const url = URL.createObjectURL(await response.blob()); const a = document.createElement("a"); a.href = url; a.download = "keeper-claim-pack.pdf"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : "Download failed."); }
    finally { setBusy(false); }
  }}>Download approved package</Btn>{error && <p role="alert" className="mt-2 text-sm">{error}</p>}</div>;
}

export function AiPermission() {
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void api.get<{ consents: { purpose: string; status: string }[] }>("/api/consent").then(r => setAllowed(r.consents.find(c => c.purpose === "ai_processing")?.status === "granted")).catch(() => setError("Could not load your permission. Try again.")); }, []);
  const save = async (grant: boolean) => {
    if (busy) return; setBusy(true); setError("");
    try { await api.post("/api/consent", { purpose: "ai_processing", status: grant ? "granted" : "revoked" }); setAllowed(grant); setOpen(false); }
    catch { setError("Could not save your permission. Try again."); }
    finally { setBusy(false); }
  };
  return <div className="mt-4 border-t border-line pt-4"><p className="font-medium">AI assistance</p><Hint>External AI processing requires your permission. Source search and saved records remain available without it.</Hint><Btn variant="quiet" className="mt-3" disabled={busy} onClick={() => allowed ? void save(false) : setOpen(true)}>{allowed ? "Revoke AI permission" : "Review AI permission"}</Btn>{error && <p role="alert" className="mt-2 text-sm">{error}</p>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Allow AI processing?</DialogTitle><DialogDescription>Keeper uses Google Gemini to prepare answers and read documents when the service is available.</DialogDescription></DialogHeader><p>Your questions, case details and document content may be sent to Google. This permission applies to cases used in this browser session. You can revoke it in Settings.</p><p className="text-sm text-muted-foreground">This build is not approved for sensitive personal records. Only share information you are permitted to send to Google.</p><div className="flex flex-wrap gap-2"><Btn disabled={busy} onClick={() => void save(true)}>Allow AI processing</Btn><Btn variant="quiet" onClick={() => setOpen(false)}>Cancel</Btn></div></DialogContent></Dialog>
  </div>;
}
