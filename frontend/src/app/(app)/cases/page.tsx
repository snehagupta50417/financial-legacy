"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CasesList, DemoDialog } from "@/components/fl/dialogs";
import { caseHref } from "@/components/fl/case-nav";
import { ArrowRight, Play } from "lucide-react";

export default function CasesPage() {
  const router = useRouter();
  const [demoOpen, setDemoOpen] = useState(false);
  const open = (id: string) => router.push(caseHref(id));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[24px] font-semibold text-navy">My cases</h1>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
            Saved privately in this browser. Pick up where you left off.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDemoOpen(true)} className="h-10 text-[13px]">
            <Play className="mr-1.5 h-3.5 w-3.5" /> See an example
          </Button>
          <Button asChild className="h-10 bg-teal-brand text-[13px] font-semibold text-white hover:bg-[#0c6a69]">
            <Link href="/start">
              New case <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-5">
          <CasesList onOpen={open} tall />
        </CardContent>
      </Card>
      <DemoDialog open={demoOpen} onOpenChange={setDemoOpen} onLoaded={open} />
    </div>
  );
}
