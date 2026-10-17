"use client";

import { useRouter } from "next/navigation";
import OverviewTab from "@/components/fl/overview-tab";
import AskPanel from "@/components/fl/ask-panel";
import { useCase } from "@/components/fl/case-context";
import { hrefForTab } from "@/components/fl/case-nav";

/** Conversation — the default entry to a case (DESIGN §2.2): summary, next task and the case assistant. */
export default function ConversationPage() {
  const router = useRouter();
  const { ws } = useCase();
  return (
    <div className="space-y-4">
      <OverviewTab ws={ws} onGoto={(tab) => router.push(hrefForTab(ws.case.id, tab))} onResources={() => router.push("/resources")} />
      <section aria-labelledby="assistant-heading" className="max-w-[760px]">
        <h2 id="assistant-heading" className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ask about this case
        </h2>
        <AskPanel caseId={ws.case.id} />
      </section>
    </div>
  );
}
