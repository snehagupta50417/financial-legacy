"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Btn, Card, Hint } from "@/components/keeper/ui";
import { getConsole, saveConsole, vapi } from "@/lib/console-client";
import { Notice } from "./bits";

const OPTIONS = [
  { key: "lic", label: "LIC · Claims desk" },
  { key: "sbi", label: "SBI · Deceased claims cell" },
];

export function ConsoleSignIn() {
  const router = useRouter();
  const [institution, setInstitution] = useState("lic");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (getConsole()) router.replace("/verify/queue"); }, [router]);

  async function signIn() {
    setBusy(true); setError(null);
    try { saveConsole(await vapi.signIn(institution)); router.push("/verify/queue"); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not sign in to the demo."); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <Card className="space-y-5">
        <div>
          <h1 className="display text-3xl text-ink">Claims console</h1>
          <Hint>A demo desk for banks and insurers. It shows how claims arrive pre-checked, with evidence for every flag. A person always makes the decision.</Hint>
        </div>
        <label className="block space-y-1.5">
          <span className="text-[0.9rem] font-medium">Institution</span>
          <select value={institution} onChange={(e) => setInstitution(e.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-paper px-3">
            {OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
        <Btn variant="primary" className="w-full" onClick={signIn} disabled={busy}>{busy ? "Signing in…" : "Sign in to demo"}</Btn>
        {error && <Notice tone="error">{error}</Notice>}
        <Hint>No password needed. Each browser gets its own private copy of the four demo claims. Nothing is sent to anyone.</Hint>
      </Card>
    </div>
  );
}
