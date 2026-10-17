"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ClaimsOverview from "@/components/fl/claims-overview";
import { useCase } from "@/components/fl/case-context";
import { caseHref, goalArea } from "@/components/fl/case-nav";

/** Claims — for a deceased holder's case. A living person's case goes to Plan instead (DESIGN §2.2). */
export default function ClaimsPage() {
  const router = useRouter();
  const { ws } = useCase();
  const area = goalArea(ws.case.holderLiving);

  useEffect(() => {
    if (area !== "claims") router.replace(caseHref(ws.case.id, area));
  }, [area, router, ws.case.id]);

  if (area !== "claims") return null;
  return <ClaimsOverview ws={ws} />;
}
