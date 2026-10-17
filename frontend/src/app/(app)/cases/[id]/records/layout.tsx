"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCase } from "@/components/fl/case-context";
import { caseHref } from "@/components/fl/case-nav";
import { LockedNotice } from "@/components/fl/gate-panel";
import { cn } from "@/lib/utils";

/** Records: assets and documents as labelled sub-views (DESIGN §2.2). Nothing is shown before the discovery gate. */
export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ws } = useCase();
  const base = caseHref(ws.case.id, "records");
  const onDocuments = pathname.startsWith(`${base}/documents`);

  if (!ws.gate.discoveryUnlocked) return <LockedNotice ws={ws} what="Records" />;

  const views = [
    { href: base, label: "Assets", count: ws.assets.filter((a) => a.discoveryStatus !== "dismissed").length, active: !onDocuments },
    { href: `${base}/documents`, label: "Documents", count: ws.documents.length, active: onDocuments },
  ];

  return (
    <div className="min-w-0">
      <nav aria-label="Records" className="mb-4 inline-flex rounded-full border bg-card p-1">
        {views.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            aria-current={v.active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors",
              v.active ? "bg-navy text-white" : "text-ink/75 hover:bg-teal-soft"
            )}
          >
            {v.label}
            <span className={cn("rounded-full px-1.5 text-[10.5px] tabular-nums", v.active ? "bg-white/20" : "bg-secondary")}>{v.count}</span>
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
