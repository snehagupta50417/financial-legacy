"use client";

import { cn } from "@/lib/utils";
import type { Stage } from "@/lib/journey";
import { Check, Pause } from "lucide-react";

const STATE_WORD: Record<Stage["state"], string> = {
  done: "Done",
  current: "Now",
  ongoing: "In progress",
  upcoming: "Later",
  on_hold: "On hold",
};

/** The one-pager's six steps as a vertical stepper. States are written in words, not only colour. */
export default function JourneyRail({ stages, compact = false }: { stages: Stage[]; compact?: boolean }) {
  return (
    <ol className="relative space-y-0.5">
      {stages.map((s, i) => {
        const last = i === stages.length - 1;
        return (
          <li key={s.key} className="relative flex gap-3 pb-3" aria-current={s.state === "current" ? "step" : undefined}>
            {!last && (
              <span
                aria-hidden
                className={cn("absolute left-[13px] top-7 h-[calc(100%-1.5rem)] w-px", s.state === "done" ? "bg-teal-brand/50" : "bg-border")}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 mt-0.5 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold",
                s.state === "done" && "border-teal-brand bg-teal-brand text-white",
                s.state === "current" && "border-navy bg-navy text-white ring-4 ring-teal-brand/15",
                s.state === "ongoing" && "border-teal-brand bg-teal-soft text-[#0b6b6a]",
                s.state === "upcoming" && "border-border bg-card text-muted-foreground",
                s.state === "on_hold" && "border-destructive/50 bg-destructive/10 text-destructive"
              )}
            >
              {s.state === "done" ? <Check className="h-3.5 w-3.5" /> : s.state === "on_hold" ? <Pause className="h-3 w-3" /> : i + 1}
            </span>
            <div className="min-w-0">
              <div className={cn("text-[14px] font-semibold leading-snug", s.state === "upcoming" ? "text-ink/60" : "text-ink")}>
                {s.title}
                <span className="sr-only"> — {STATE_WORD[s.state]}</span>
              </div>
              {!compact && (
                <div className="text-[13px] leading-snug text-muted-foreground">
                  <span className={cn("font-medium", s.state === "current" && "text-[#0b6b6a]", s.state === "on_hold" && "text-destructive")} aria-hidden>
                    {STATE_WORD[s.state]}
                  </span>
                  {" · "}
                  {s.detail}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
