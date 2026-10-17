"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LegacyPlan from "@/components/fl/legacy-plan";
import { useCase } from "@/components/fl/case-context";
import { caseHref, goalArea } from "@/components/fl/case-nav";

/** Plan — for a living person's case. A deceased holder's case goes to Claims instead (DESIGN §2.2). */
export default function PlanPage() {
  const router = useRouter();
  const { ws } = useCase();
  const area = goalArea(ws.case.holderLiving);

  useEffect(() => {
    if (area !== "plan") router.replace(caseHref(ws.case.id, area));
  }, [area, router, ws.case.id]);

  if (area !== "plan") return null;
  return <LegacyPlan ws={ws} />;
}
