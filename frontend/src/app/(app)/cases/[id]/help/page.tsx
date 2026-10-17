"use client";

import ExpertTab from "@/components/fl/expert-tab";
import { useCase } from "@/components/fl/case-context";

export default function HelpPage() {
  const { ws } = useCase();
  return (
    <div className="max-w-[1000px] space-y-6">
      <div className="max-w-2xl">
        <h1 className="font-display text-[26px] font-semibold text-navy">Get help</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          When things are unclear, disputed or simply too much, a person can help. Questions about who is legally entitled go
          to qualified help — never to the AI.
        </p>
      </div>
      <ExpertTab ws={ws} />
    </div>
  );
}
