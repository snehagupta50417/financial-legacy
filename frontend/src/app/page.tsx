"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Landing from "@/components/fl/landing";
import { DemoDialog } from "@/components/fl/dialogs";
import { caseHref } from "@/components/fl/case-nav";

export default function Page() {
  const router = useRouter();
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <main id="main" className="flex min-h-screen flex-col bg-background">
      <Landing
        onStart={() => router.push("/start")}
        onDemo={() => setDemoOpen(true)}
        onResources={() => router.push("/resources")}
        onCases={() => router.push("/cases")}
      />
      <DemoDialog open={demoOpen} onOpenChange={setDemoOpen} onLoaded={(id) => router.push(caseHref(id))} />
    </main>
  );
}
