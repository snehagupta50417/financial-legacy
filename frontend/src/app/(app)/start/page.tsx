"use client";

import { useRouter } from "next/navigation";
import Intake from "@/components/fl/intake";
import { caseHref } from "@/components/fl/case-nav";

export default function StartPage() {
  const router = useRouter();
  return (
    <>
      <h1 className="sr-only">Tell us what happened</h1>
      <Intake onWorkspace={(id) => router.push(caseHref(id))} onCaseCreated={() => {}} />
    </>
  );
}
