"use client";

import JourneyTab from "@/components/fl/journey-tab";
import { useCase } from "@/components/fl/case-context";

export default function StepsPage() {
  const { ws, reload } = useCase();
  const done = ws.tasks.filter((t) => t.status === "completed").length;
  return (
    <div className="max-w-[860px] space-y-6">
      <div>
        <h1 className="font-display text-[26px] font-semibold text-navy">Steps</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          What to do, in order. {ws.tasks.length ? `${done} of ${ws.tasks.length} done.` : ""} When you finish something outside
          Financial Legacy — at a bank or on a portal — mark it here so we can keep track.
        </p>
      </div>
      <JourneyTab ws={ws} reload={reload} />
    </div>
  );
}
