"use client";

import { type Persona } from "@/keeper/personas";
import { cn } from "@/lib/utils";

/** Initials in a circle. Decorative: the name is always next to it. */
export function Avatar({ p, className }: { p: Persona; className?: string }) {
  return <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold", p.tone, className ?? "h-12 w-12 text-[1rem]")}>{p.initials}</span>;
}

/** Who this example is about: a made-up person, their situation, and what they want. */
export function PersonaSummary({ p, compact = false }: { p: Persona; compact?: boolean }) {
  return (
    <div className="flex gap-3">
      <Avatar p={p} className={compact ? "h-11 w-11 text-[0.95rem]" : "h-14 w-14 text-[1.1rem]"} />
      <div className="min-w-0">
        <p className="font-semibold leading-tight">{p.name}<span className="font-normal text-muted-foreground"> · {p.age}, {p.city}</span></p>
        <p className="text-[0.9rem] text-moss">{p.role}</p>
        {!compact && <p className="mt-1.5 text-[0.93rem] text-ink/85">{p.situation}</p>}
        {!compact && <p className="mt-1 text-[0.88rem] text-muted-foreground"><b className="font-medium text-ink/80">Wants:</b> {p.goal}</p>}
      </div>
    </div>
  );
}
