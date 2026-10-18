"use client";

import { useState } from "react";
import { Btn } from "@/components/keeper/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConsoleApiError, vapi } from "@/lib/console-client";
import { DOC_LABEL, RISK_LABEL, type DocKind, type RiskLevel } from "@shared/verify-rules";
import { ESCALATION_LABEL, type ClaimDetail, type DecisionAction, type EscalationReason } from "@shared/verify-view";
import { Notice } from "./bits";

type Mode = DecisionAction | null;

function draftMessage(d: ClaimDetail, kinds: DocKind[]): string {
  const list = kinds.length ? kinds.map((k) => `- ${DOC_LABEL[k]}`).join("\n") : "- (choose the documents above)";
  return `Dear ${d.claim.claimantName},\n\nThank you for your claim ${d.claim.code} for ${d.claim.deceasedName}. To continue, we need:\n${list}\n\nPlease send these within 7 days so we stay inside the 15-day window.\n\nClaims desk, ${d.claim.institution}\n\n(Simulated message: it is recorded in the audit trail and is not sent to anyone.)`;
}

const WARN = "rounded-xl border border-[#a03a2a]/40 bg-[#fbeceb] p-4 text-[0.92rem] text-[#8a2f21]";
const FIELD = "w-full rounded-xl border border-line bg-paper px-3 py-2";

/** The persistent action bar and its three dialogs. A person decides; the server re-checks every rule. */
export function DecisionBar({ detail, onDone }: { detail: ClaimDetail; onDone: (message: string) => void }) {
  const [mode, setMode] = useState<Mode>(null);
  const [note, setNote] = useState("");
  const [ack, setAck] = useState(false);
  const [reason, setReason] = useState<EscalationReason | "">("");
  const missing = detail.requiredDocuments.filter((r) => !r.present).map((r) => r.kind);
  const [kinds, setKinds] = useState<DocKind[]>(missing);
  // The draft follows the chosen documents until the reviewer edits it; their text is then kept as typed.
  const [typed, setTyped] = useState<string | null>(null);
  const message = typed ?? draftMessage(detail, kinds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const level: RiskLevel = detail.latestRun?.rating.level ?? "not_checked";
  const open = detail.claim.status === "awaiting_review" || detail.claim.status === "documents_requested";
  const approveWarn = level === "high";
  const escalateWarn = level === "low";

  function openMode(m: DecisionAction) { setMode(m); setNote(""); setAck(false); setReason(""); setError(null); setTyped(null); setKinds(missing); }
  const close = () => { if (!busy) setMode(null); };

  const noteMin = mode === "approve" ? (approveWarn ? 15 : 0) : mode === "escalate" ? (escalateWarn ? 15 : 10) : 0;
  const valid =
    mode === "approve" ? (!approveWarn || (ack && note.trim().length >= 15)) :
    mode === "escalate" ? (!!reason && note.trim().length >= noteMin && (!escalateWarn || ack)) :
    mode === "request_documents" ? kinds.length > 0 && message.trim().length >= 10 : false;

  async function submit() {
    if (!mode) return;
    setBusy(true); setError(null);
    try {
      await vapi.post(`/api/console/claims/${detail.claim.id}/decision`, { action: mode, note, reason: reason || undefined, documents: kinds, message, acknowledged: ack });
      const text = mode === "approve" ? `${detail.claim.code} approved. Recorded in the audit trail.`
        : mode === "escalate" ? `${detail.claim.code} escalated: ${ESCALATION_LABEL[reason as EscalationReason]}. Recorded in the audit trail.`
        : `Document request for ${detail.claim.code} recorded. Simulated: no message was sent.`;
      setMode(null); onDone(text);
    } catch (e) { setError(e instanceof ConsoleApiError ? e.message : "Could not record the decision."); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <p className="mr-auto text-[0.9rem] text-muted-foreground">
            {open ? (level === "not_checked" ? "Run the checks before you decide." : `${RISK_LABEL[level]}. Your decision is recorded with your name.`) : `This claim is closed: ${detail.claim.status === "approved" ? "approved" : "escalated"}.`}
          </p>
          <Btn variant="primary" disabled={!open || level === "not_checked"} onClick={() => openMode("approve")}>Approve</Btn>
          <Btn variant="quiet" disabled={!open} onClick={() => openMode("request_documents")}>Request documents</Btn>
          <Btn variant="danger" disabled={!open} onClick={() => openMode("escalate")}>Escalate</Btn>
        </div>
      </div>

      <Dialog open={mode !== null} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{mode === "approve" ? `Approve ${detail.claim.code}?` : mode === "escalate" ? `Escalate ${detail.claim.code}` : `Request documents for ${detail.claim.code}`}</DialogTitle>
            <DialogDescription>
              {mode === "approve" && `This records your approval for ${detail.claim.claimantName}. Nothing is paid or sent in this demo.`}
              {mode === "escalate" && "Hand this claim to a senior reviewer. Choose why and say what you saw."}
              {mode === "request_documents" && "Choose what is needed and edit the message. It is simulated: nothing is sent."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {mode === "approve" && approveWarn && <p className={WARN}><strong>This claim is rated High risk.</strong> {detail.latestRun?.rating.explanation} Approving it needs a written reason.</p>}
            {mode === "escalate" && escalateWarn && <p className={WARN}><strong>This claim is rated Low risk.</strong> All four checks passed. Escalating it needs a written reason.</p>}

            {mode === "escalate" && (
              <label className="block space-y-1.5">
                <span className="text-[0.9rem] font-medium">Reason</span>
                <select value={reason} onChange={(e) => setReason(e.target.value as EscalationReason)} className={FIELD}>
                  <option value="">Choose a reason</option>
                  {(Object.keys(ESCALATION_LABEL) as EscalationReason[]).map((k) => <option key={k} value={k}>{ESCALATION_LABEL[k]}</option>)}
                </select>
              </label>
            )}

            {mode === "request_documents" && (
              <>
                <fieldset className="space-y-2">
                  <legend className="mb-1 text-[0.9rem] font-medium">Documents needed</legend>
                  {(Object.keys(DOC_LABEL) as DocKind[]).map((k) => (
                    <label key={k} className="flex items-center gap-2 text-[0.92rem]">
                      <input type="checkbox" className="size-4" checked={kinds.includes(k)} onChange={(e) => setKinds(e.target.checked ? [...kinds, k] : kinds.filter((x) => x !== k))} />
                      {DOC_LABEL[k]}{missing.includes(k) && <span className="text-[0.8rem] text-[#7a3e14]">(missing from the pack)</span>}
                    </label>
                  ))}
                </fieldset>
                <label className="block space-y-1.5">
                  <span className="text-[0.9rem] font-medium">Message to the claimant (simulated)</span>
                  <textarea className={`${FIELD} min-h-48`} value={message} onChange={(e) => setTyped(e.target.value)} />
                </label>
              </>
            )}

            {mode !== "request_documents" && (
              <label className="block space-y-1.5">
                <span className="text-[0.9rem] font-medium">{noteMin ? `Note (required, at least ${noteMin} characters)` : "Note (optional)"}</span>
                <textarea className={`${FIELD} min-h-24`} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            )}

            {((mode === "approve" && approveWarn) || (mode === "escalate" && escalateWarn)) && (
              <label className="flex items-start gap-2 text-[0.92rem]">
                <input type="checkbox" className="mt-1 size-4" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                I have read the warning and I am making this decision myself.
              </label>
            )}
            {error && <Notice tone="error">{error}</Notice>}
          </div>

          <DialogFooter className="gap-2">
            <Btn variant="quiet" onClick={close} disabled={busy}>Cancel</Btn>
            <Btn variant={mode === "escalate" ? "danger" : "primary"} onClick={submit} disabled={!valid || busy}>
              {busy ? "Recording…" : mode === "approve" ? "Confirm approval" : mode === "escalate" ? "Confirm escalation" : "Record request (simulated)"}
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
