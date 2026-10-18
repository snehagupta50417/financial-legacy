"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { PERSONAS, personaById, personaForDemo, type Persona } from "@/keeper/personas";
import { dispatch, useKeeper } from "@/keeper/store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, PersonaSummary } from "./persona-card";
import { cn } from "@/lib/utils";

/** Whose records these are, when they are demo records. Real cases have no persona. */
export function usePersona(): { persona: Persona; kind: "example" | "demo" } | null {
  const { state, c } = useKeeper();
  if (state?.session?.mode === "sample") return { persona: personaById(state.session.persona), kind: "example" };
  const demo = c?.demo ? personaForDemo(c.demoKey) : undefined;
  return demo ? { persona: demo, kind: "demo" } : null;
}

/** "You are looking at Arjun's records": always visible while the data is a persona's. */
export function PersonaChip({ variant = "sidebar" }: { variant?: "sidebar" | "mobile" }) {
  const who = usePersona();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!who) return null;
  const { persona, kind } = who;
  const switchTo = (p: Persona) => { dispatch({ t: "signIn", name: p.name, mode: "sample", persona: p.id }); setOpen(false); router.push("/app"); };
  return (
    <>
      {variant === "mobile" ? (
        <button onClick={() => setOpen(true)} aria-label={`Viewing as ${persona.name}. Tap for who this is`} className="self-end rounded-full outline-none focus-visible:ring-2 focus-visible:ring-moss"><Avatar p={persona} className="h-11 w-11 text-[0.95rem]" /></button>
      ) : (
        <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-ivory px-3 py-2 text-left hover:bg-secondary">
          <Avatar p={persona} className="h-10 w-10 text-[0.9rem]" />
          <span className="min-w-0 flex-1"><span className="block text-[0.72rem] font-semibold uppercase tracking-wider text-moss">{kind === "example" ? "Example" : "Demo case"}</span><span className="block truncate font-semibold leading-tight">{persona.name}</span><span className="block truncate text-[0.8rem] text-muted-foreground">{persona.role}</span></span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="display text-[1.6rem]">Who this is</DialogTitle>
            <DialogDescription>{kind === "example" ? "Everything in this example belongs to one made-up person." : "This demo case belongs to a made-up person. Your own cases are separate."}</DialogDescription>
          </DialogHeader>
          <PersonaSummary p={persona} />
          <div>
            <p className="mb-1.5 text-[0.8rem] font-semibold uppercase tracking-wider text-muted-foreground">Things to try</p>
            <ul className="space-y-1.5">{persona.tryThis.map((t) => <li key={t} className="flex gap-2 text-[0.95rem]"><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-moss" aria-hidden />{t}</li>)}</ul>
          </div>
          {kind === "example" ? (
            <div>
              <p className="mb-1.5 text-[0.8rem] font-semibold uppercase tracking-wider text-muted-foreground">Follow someone else</p>
              <ul className="space-y-1.5">
                {PERSONAS.filter((p) => p.id !== persona.id).map((p) => (
                  <li key={p.id}><button onClick={() => switchTo(p)} className={cn("flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2 text-left hover:bg-secondary")}><Avatar p={p} className="h-10 w-10 text-[0.9rem]" /><span className="min-w-0"><span className="block font-semibold leading-tight">{p.name} <span className="font-normal text-muted-foreground">· {p.city}</span></span><span className="block truncate text-[0.85rem] text-moss">{p.role}</span></span></button></li>
                ))}
              </ul>
              <p className="mt-3 text-[0.88rem]"><Link href="/welcome" className="underline underline-offset-4">Take the guided tour</Link></p>
            </div>
          ) : <p className="text-[0.88rem] text-muted-foreground">Remove demo cases any time in <Link href="/app/settings" className="underline underline-offset-4" onClick={() => setOpen(false)}>Settings</Link>.</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
