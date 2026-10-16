"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { CaseWorkspace, GateId, ProofView } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  CircleAlert,
  CircleCheckBig,
  FileHeart,
  Fingerprint,
  Loader2,
  Lock,
  ScanLine,
  ShieldAlert,
  Users,
} from "lucide-react";

const STEP_META: Record<string, { title: string; why: string; icon: React.ElementType }> = {
  G1: {
    title: "Verify your identity",
    why: "We need to know you are a real, specific person before opening anything about someone else.",
    icon: Fingerprint,
  },
  G2: {
    title: "Proof of death",
    why: "Confirms the named person has died. Discovery stays locked until the next step.",
    icon: FileHeart,
  },
  G3: {
    title: "Proof of relationship",
    why: "Shows you are a close relative. This unlocks connected sources and the masked asset map.",
    icon: Users,
  },
};

const CAREGIVER_G3 = {
  title: "Your relative's consent",
  why: "Caregiver access needs the living relative's own recorded consent — never discovery without it.",
  icon: Users,
};

function pathFor(kind: string): GateId[] {
  if (kind === "personal") return ["G1"];
  if (kind === "caregiver") return ["G1", "G3"];
  return ["G1", "G2", "G3"];
}

const GATE_ORDER = ["G0", "G1", "G2", "G3", "G4"];
const reachedAtLeast = (reached: string, g: string) => GATE_ORDER.indexOf(reached) >= GATE_ORDER.indexOf(g);

const PROOF_FOR_GATE: Record<string, ProofView["kind"]> = { G1: "identity", G2: "death", G3: "relationship" };

export function SimulatedNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 rounded-md bg-gold-soft/70 px-2.5 py-1.5 text-[11px] leading-relaxed text-gold">
      <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function ProofResult({ proof }: { proof: ProofView }) {
  const mismatches = Object.entries(proof.matchedFields ?? {}).filter(([, v]) => v && v.match !== true);
  return (
    <div
      className={cn(
        "mt-3 rounded-lg border px-3 py-2.5 text-[12px] leading-relaxed",
        proof.status === "verified" ? "border-teal-brand/25 bg-teal-soft/50" : "border-gold/30 bg-gold-soft/50"
      )}
    >
      <div className="flex items-center gap-1.5 font-semibold text-navy">
        {proof.status === "verified" ? (
          <CircleCheckBig className="h-3.5 w-3.5 text-teal-brand" />
        ) : (
          <CircleAlert className="h-3.5 w-3.5 text-gold" />
        )}
        {proof.status === "verified" ? "Verified" : proof.status === "needs_review" ? "Sent to manual review" : "Not completed"}
      </div>
      {proof.note && <div className="mt-0.5 text-ink/75">{proof.note}</div>}
      {mismatches.length > 0 && (
        <table className="mt-2 w-full text-[11.5px]">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="font-medium">Field</th>
              <th className="font-medium">You entered</th>
              <th className="font-medium">Record says</th>
            </tr>
          </thead>
          <tbody>
            {mismatches.map(([k, v]) => (
              <tr key={k}>
                <td className="py-0.5 pr-2 capitalize">{k.replace(/([A-Z])/g, " $1").toLowerCase()}</td>
                <td className="pr-2">{v.expected ?? "—"}</td>
                <td className="font-medium text-gold">{v.found ?? "not found"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10.5px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function useSubmit(ws: CaseWorkspace, reload: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  async function run(kind: string, body: unknown | FormData, okTitle: string) {
    setBusy(true);
    try {
      const url = `/api/cases/${ws.case.id}/proofs/${kind}`;
      const res =
        body instanceof FormData
          ? await api.upload<{ proof: ProofView; gate: CaseWorkspace["gate"] }>(url, body)
          : await api.post<{ proof: ProofView; gate: CaseWorkspace["gate"] }>(url, body);
      if (res.proof.status === "verified") {
        toast({ title: okTitle, description: res.gate.discoveryUnlocked ? "Discovery is now unlocked." : res.gate.nextLabel ? `Next: ${res.gate.nextLabel}` : undefined });
      } else {
        toast({ title: "Sent to manual review", description: res.proof.note ?? "Some details did not match.", variant: "destructive" });
      }
      await reload();
    } catch (e) {
      toast({ title: "Could not submit", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

function IdentityForm({ ws, reload }: { ws: CaseWorkspace; reload: () => Promise<void> }) {
  const [method, setMethod] = useState<"digilocker" | "passport_selfie">("digilocker");
  const [fullName, setFullName] = useState(ws.claimants[0]?.fullName ?? "");
  const [dob, setDob] = useState("");
  const { busy, run } = useSubmit(ws, reload);
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {([
          ["digilocker", "DigiLocker", "For residents of India"],
          ["passport_selfie", "Passport + selfie", "For NRI heirs abroad"],
        ] as const).map(([k, title, sub]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMethod(k)}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left transition-colors",
              method === k ? "border-navy bg-navy text-white" : "bg-card hover:border-teal-brand/40"
            )}
          >
            <div className="text-[13px] font-semibold">{title}</div>
            <div className={cn("text-[11px]", method === k ? "text-white/70" : "text-muted-foreground")}>{sub}</div>
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your full name (as on your ID)">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., Ananya Sharma" />
        </Field>
        <Field label="Your date of birth (optional)">
          <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </Field>
      </div>
      <SimulatedNote>Simulated in this prototype — no real DigiLocker or passport check is made.</SimulatedNote>
      <Button
        disabled={busy || fullName.trim().length < 2}
        onClick={() => run("identity", { method, fullName, dob: dob || null }, "Identity verified")}
        className="bg-navy text-white hover:bg-navy-deep"
      >
        {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        {method === "digilocker" ? "Verify with DigiLocker" : "Verify passport + selfie"}
      </Button>
    </div>
  );
}

function DeathForm({ ws, reload }: { ws: CaseWorkspace; reload: () => Promise<void> }) {
  const [mode, setMode] = useState<"digilocker" | "scan">("digilocker");
  const [name, setName] = useState(ws.deceased?.name ?? ws.case.assetHolderName ?? "");
  const [dob, setDob] = useState(ws.deceased?.dob ?? "");
  const [dod, setDod] = useState(ws.deceased?.dateOfDeath ?? "");
  const [pan, setPan] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { busy, run } = useSubmit(ws, reload);

  function submit() {
    if (mode === "scan") {
      if (!file) return;
      const form = new FormData();
      form.append("file", file);
      form.append("deceasedName", name);
      if (dob) form.append("dob", dob);
      if (dod) form.append("dateOfDeath", dod);
      if (pan) form.append("pan", pan);
      return run("death", form, "Death certificate verified");
    }
    return run("death", { method: "digilocker", deceasedName: name, dob: dob || null, dateOfDeath: dod || null, pan: pan || null }, "Death record verified");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {([
          ["digilocker", "Fetch from DigiLocker"],
          ["scan", "Scan the certificate"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium",
              mode === k ? "border-navy bg-navy text-white" : "bg-card text-ink/70 hover:bg-teal-soft"
            )}
          >
            {k === "scan" ? <ScanLine className="h-3.5 w-3.5" /> : <BadgeCheck className="h-3.5 w-3.5" />} {label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name of the person who died">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Rajesh Kumar Sharma" />
        </Field>
        <Field label="Their date of birth">
          <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </Field>
        <Field label="Date of death">
          <Input type="date" value={dod} onChange={(e) => setDod(e.target.value)} />
        </Field>
        <Field label="Their PAN (optional)" hint="Used only to make sure there is one case per person. The PAN itself is never stored.">
          <Input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
        </Field>
      </div>
      {mode === "scan" && (
        <Field label="Photo or scan of the death certificate (JPG, PNG or WebP)">
          <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
      )}
      <SimulatedNote>
        {mode === "digilocker"
          ? "Simulated DigiLocker fetch against a synthetic civil registry."
          : "Gemini reads the certificate; code compares every field with what you entered. Use synthetic images only."}
      </SimulatedNote>
      <Button
        disabled={busy || name.trim().length < 2 || (mode === "scan" && !file)}
        onClick={submit}
        className="bg-navy text-white hover:bg-navy-deep"
      >
        {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        {mode === "scan" ? "Read certificate" : "Fetch death record"}
      </Button>
    </div>
  );
}

const RELATIONSHIPS = ["daughter", "son", "spouse", "parent", "sibling", "grandchild", "other"];
const OWN_DOCS = ["Passport", "Birth certificate", "Marriage certificate", "Aadhaar (S/o, D/o, W/o)"];

function RelationshipForm({ ws, reload }: { ws: CaseWorkspace; reload: () => Promise<void> }) {
  const caregiver = ws.gate.journeyKind === "caregiver";
  const [relationship, setRelationship] = useState(ws.case.relationship && RELATIONSHIPS.includes(ws.case.relationship) ? ws.case.relationship : "daughter");
  const [method, setMethod] = useState<"own_document" | "legal_heir_certificate">("own_document");
  const [documentType, setDocumentType] = useState(OWN_DOCS[0]);
  const [nameOnDocument, setNameOnDocument] = useState("");
  const [relativeName, setRelativeName] = useState(ws.case.assetHolderName ?? "");
  const { busy, run } = useSubmit(ws, reload);

  if (caregiver) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Your relative's full name">
            <Input value={relativeName} onChange={(e) => setRelativeName(e.target.value)} />
          </Field>
          <Field label="They are your…">
            <Input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="mother" />
          </Field>
        </div>
        <SimulatedNote>Simulated: in production your relative confirms with an OTP on their own phone and can revoke at any time.</SimulatedNote>
        <Button
          disabled={busy || relativeName.trim().length < 2}
          onClick={() => run("relationship", { method: "relative_consent", relationship, relativeName }, "Consent recorded")}
          className="bg-navy text-white hover:bg-navy-deep"
        >
          {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Request their consent
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`You are ${ws.deceased?.name ?? "their"}…`}>
          <Select value={relationship} onValueChange={setRelationship}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Proof">
          <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="own_document">My own document names them</SelectItem>
              <SelectItem value="legal_heir_certificate">Legal-heir certificate</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {method === "own_document" && (
          <>
            <Field label="Which document">
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OWN_DOCS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Parent / spouse name printed on it">
              <Input value={nameOnDocument} onChange={(e) => setNameOnDocument(e.target.value)} placeholder="e.g., R. K. Sharma" />
            </Field>
          </>
        )}
      </div>
      <SimulatedNote>Simulated document read. Names are matched allowing initials and spelling variants; anything unclear goes to a person, never an automatic rejection.</SimulatedNote>
      <Button
        disabled={busy || (method === "own_document" && nameOnDocument.trim().length < 2)}
        onClick={() => run("relationship", { method, relationship, documentType, nameOnDocument: nameOnDocument || null }, "Relationship verified")}
        className="bg-navy text-white hover:bg-navy-deep"
      >
        {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Verify relationship
      </Button>
    </div>
  );
}

/** Trust-gate stepper shown until discovery is unlocked (plan §3 / M3). */
export default function GatePanel({ ws, reload }: { ws: CaseWorkspace; reload: () => Promise<void> }) {
  const g = ws.gate;

  if (g.frozenReason) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-5">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <div className="font-display text-[16px] font-semibold text-navy">Case paused for review</div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink/80">{g.frozenReason}</p>
            <p className="mt-2 text-[12px] text-muted-foreground">
              Nothing about the assets is shown while this is reviewed. Your verification steps so far are kept.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const path = pathFor(g.journeyKind);
  const latestProof = (kind: string) => [...ws.proofs].reverse().find((p) => p.kind === kind);

  return (
    <Card className="border-teal-brand/25">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-brand">
              <Lock className="h-3.5 w-3.5" /> Prove before you see
            </div>
            <div className="font-display mt-1 text-[17px] font-semibold text-navy">
              {g.journeyKind === "personal" ? "One quick check before we look for your assets" : "A few checks before any asset is shown"}
            </div>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
              Name, date of birth and PAN alone unlock nothing. Each step is checked by code and recorded in your case timeline.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full text-[11px] text-navy">
            Step {Math.min(path.findIndex((s) => !reachedAtLeast(g.reached, s)) + 1 || path.length, path.length)} of {path.length}
          </Badge>
        </div>

        <ol className="mt-4 space-y-3">
          {path.map((gate) => {
            const meta = gate === "G3" && g.journeyKind === "caregiver" ? CAREGIVER_G3 : STEP_META[gate];
            const done = reachedAtLeast(g.reached, gate);
            const current = g.next === gate;
            const proof = latestProof(PROOF_FOR_GATE[gate]);
            const Icon = meta.icon;
            return (
              <li
                key={gate}
                className={cn(
                  "rounded-xl border p-4",
                  current ? "border-navy/30 bg-card shadow-sm" : done ? "bg-teal-soft/30" : "bg-background opacity-70"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      done ? "bg-teal-brand text-white" : current ? "bg-navy text-white" : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {done ? <CircleCheckBig className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-navy">{meta.title}</span>
                      {done && <Badge className="rounded-full bg-teal-brand text-[10px] text-white">Done</Badge>}
                      {!done && !current && <Badge variant="outline" className="rounded-full text-[10px]">Locked</Badge>}
                    </div>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{meta.why}</p>
                    {proof && (done || proof.status !== "verified") && <ProofResult proof={proof} />}
                    {current && (
                      <div className="mt-3">
                        {gate === "G1" && <IdentityForm ws={ws} reload={reload} />}
                        {gate === "G2" && <DeathForm ws={ws} reload={reload} />}
                        {gate === "G3" && <RelationshipForm ws={ws} reload={reload} />}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

/** Replaces asset/document content while discovery is locked. */
export function LockedNotice({ ws, what }: { ws: CaseWorkspace; what: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        <Lock className="h-7 w-7 text-muted-foreground/50" />
        <div className="text-[14px] font-medium text-navy">{what} are locked</div>
        <p className="max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
          {ws.gate.frozenReason
            ? "This case is paused for review."
            : `Complete “${ws.gate.nextLabel ?? "verification"}” above. Nothing about the assets is fetched or shown before then.`}
        </p>
      </CardContent>
    </Card>
  );
}
