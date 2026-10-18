"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { DEMO_SCENARIOS } from "@/keeper/demo";
import { addDemoCase, removeDemoCases, useBackendStatus, useKeeper } from "@/keeper/store";
import { PersonaSummary } from "./persona-card";
import { Btn } from "./ui";

/** Every demo case is labelled "(demo)" and can be removed; real cases are never touched. */
export function DemoScenarios() {
  const { state } = useKeeper();
  const { busy, error } = useBackendStatus();
  const [adding, setAdding] = useState<string | null>(null);
  if (state?.session?.mode !== "signin") return null;
  const hasDemo = Object.values(state.cases).some((c) => c.demo);
  const add = async (key: string) => { setAdding(key); await addDemoCase(key); setAdding(null); };
  return (
    <div className="mt-3 space-y-2">
      <ul className="space-y-2">
        {DEMO_SCENARIOS.map(({ key, persona }) => (
          <li key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-3">
            <span className="min-w-0 flex-1"><PersonaSummary p={persona} compact /></span>
            <Btn variant="quiet" className="min-h-10 shrink-0" disabled={busy} onClick={() => void add(key)}>{adding === key ? "Adding…" : "Add " + persona.name.split(" ")[0] + "’s demo"}</Btn>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-[0.88rem] text-[#a03a2a]">{error}</p>}
      {hasDemo && <Btn variant="danger" className="min-h-10" disabled={busy} onClick={() => void removeDemoCases()}><Trash2 className="h-4 w-4" aria-hidden />Remove demo cases</Btn>}
      <p className="text-[0.85rem] text-muted-foreground">Demo people and identifiers are made up. Banks, schemes and NAVs are real public data. Your own cases are never changed.</p>
    </div>
  );
}
