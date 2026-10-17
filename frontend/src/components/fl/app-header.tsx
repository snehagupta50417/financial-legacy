"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { LeafLogo } from "./ui-bits";
import { ArrowRight, FolderOpen, Landmark } from "lucide-react";

/** Slim header for every page except the landing page. */
export default function AppHeader() {
  const pathname = usePathname();
  const [hasCases, setHasCases] = useState(false);

  useEffect(() => {
    api
      .get<{ cases: unknown[] }>("/api/cases")
      .then((d) => setHasCases(d.cases.length > 0))
      .catch(() => setHasCases(false));
  }, [pathname]);

  const link = "relative inline-flex h-9 items-center rounded-md px-2 text-[14px] font-medium text-white/80 hover:bg-white/10 hover:text-white sm:px-3";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-deep/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between gap-2 px-4 md:px-6">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2 text-white">
          <LeafLogo className="h-6 w-6 shrink-0 text-[#7cc5c4]" />
          <span className="font-display truncate text-[15px] font-semibold sm:text-[16px]">Financial Legacy</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1.5" aria-label="Main">
          <Link href="/cases" aria-current={pathname === "/cases" ? "page" : undefined} className={cn(link, pathname.startsWith("/cases") && "text-white")}>
            <FolderOpen className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="sr-only sm:not-sr-only">My cases</span>
            {hasCases && <span className="absolute right-1 top-1.5 h-1.5 w-1.5 rounded-full bg-[#7cc5c4] sm:right-1.5" aria-hidden />}
          </Link>
          <Link href="/resources" aria-current={pathname === "/resources" ? "page" : undefined} className={cn(link, "hidden sm:inline-flex")}>
            <Landmark className="mr-1.5 h-3.5 w-3.5" /> Official portals
          </Link>
          <Button asChild size="sm" className="h-9 bg-[#0e7c7b] px-2.5 text-[14px] font-semibold text-white hover:bg-[#0c6a69] sm:px-3.5">
            <Link href="/start">
              New case <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
