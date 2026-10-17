"use client";

import { useEffect, useState } from "react";
import Landing from "@/components/fl/landing";
import Intake from "@/components/fl/intake";
import Workspace from "@/components/fl/workspace";
import ResourcesPage from "@/components/fl/resources-page";
import { DemoDialog, CasesDialog } from "@/components/fl/dialogs";
import { LeafLogo } from "@/components/fl/ui-bits";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client";
import { FolderOpen, Landmark, ArrowRight } from "lucide-react";

type View = "landing" | "intake" | "workspace" | "resources";

export default function Page() {
  const [view, setView] = useState<View>("landing");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [casesOpen, setCasesOpen] = useState(false);
  const [hasCases, setHasCases] = useState(false);

  useEffect(() => {
    api
      .get<{ cases: unknown[] }>("/api/cases")
      .then((d) => setHasCases(d.cases.length > 0))
      .catch(() => setHasCases(false));
  }, [view]);

  const openWorkspace = (id: string) => {
    setCaseId(id);
    setView("workspace");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Slim nav for non-landing views */}
      {view !== "landing" && (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-deep/95 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
            <button onClick={() => setView("landing")} className="flex min-w-0 shrink-0 items-center gap-2 text-white">
              <LeafLogo className="h-6 w-6 shrink-0 text-[#7cc5c4]" />
              <span className="font-display truncate text-[15px] font-semibold sm:text-[16px]">Financial Legacy</span>
            </button>
            <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1.5" aria-label="Main">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCasesOpen(true)}
                className="relative h-9 px-2 text-[12.5px] text-white/75 hover:bg-white/10 hover:text-white sm:px-3"
              >
                <FolderOpen className="mr-0 h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">My cases</span>
                {hasCases && <span className="absolute right-1 top-1.5 h-1.5 w-1.5 rounded-full bg-[#7cc5c4] sm:right-1.5" aria-hidden />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("resources")}
                className="hidden h-9 px-3 text-[12.5px] text-white/75 hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                <Landmark className="mr-1.5 h-3.5 w-3.5" /> Official portals
              </Button>
              <Button
                size="sm"
                onClick={() => setView("intake")}
                className="h-9 bg-[#0e7c7b] px-2.5 text-[12.5px] font-semibold text-white hover:bg-[#0c6a69] sm:px-3.5"
              >
                New journey <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </nav>
          </div>
        </header>
      )}

      <main className="flex flex-1 flex-col">
        {view === "landing" && (
          <Landing onStart={() => setView("intake")} onDemo={() => setDemoOpen(true)} onResources={() => setView("resources")} />
        )}
        {view === "intake" && (
          <Intake
            onWorkspace={openWorkspace}
            initialCaseId={caseId}
            onCaseCreated={(id) => setCaseId(id)}
          />
        )}
        {view === "workspace" && caseId && (
          <Workspace caseId={caseId} onHome={() => setView("landing")} onResources={() => setView("resources")} />
        )}
        {view === "resources" && <ResourcesPage onHome={() => setView("landing")} />}
      </main>

      <DemoDialog open={demoOpen} onOpenChange={setDemoOpen} onLoaded={openWorkspace} />
      <CasesDialog open={casesOpen} onOpenChange={setCasesOpen} onOpen={openWorkspace} />
    </div>
  );
}
