"use client";

import { useEffect, useState } from "react";
import type { OfficialResource } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading, TrustFooter } from "./ui-bits";
import {
  ArrowLeft,
  CalendarCheck2,
  ExternalLink,
  Globe,
  Landmark,
  ShieldCheck,
  TrendingUp,
  PieChart,
  LifeBuoy,
} from "lucide-react";

const CATEGORY_ICON: Record<string, React.ElementType> = {
  bank_deposit: Landmark,
  insurance: ShieldCheck,
  grievance: LifeBuoy,
  mutual_fund: TrendingUp,
  shares: PieChart,
  multi: Globe,
};

const INTEGRATION_LABEL: Record<string, { label: string; tone: string }> = {
  official_website: {
    label: "Official website — you act, Financial Legacy prepares & tracks",
    tone: "border-teal-brand/30 bg-teal-soft text-teal-brand",
  },
  guided_workflow: { label: "Guided workflow", tone: "border-gold/30 bg-gold-soft text-gold" },
  public_api: { label: "Live public API", tone: "border-teal-brand/40 bg-teal-soft text-teal-brand" },
};

export default function ResourcesPage({ onHome }: { onHome: () => void }) {
  const [resources, setResources] = useState<OfficialResource[]>([]);

  useEffect(() => {
    fetch("/api/resources")
      .then((r) => r.json())
      .then((d) => setResources(d.resources ?? []))
      .catch(() => setResources([]));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Button variant="ghost" size="sm" onClick={onHome} className="-ml-2 mb-4 text-[12.5px] text-muted-foreground hover:text-navy">
          <ArrowLeft className="mr-1 h-4 w-4" /> Home
        </Button>
        <SectionHeading
          eyebrow="Official resources centre"
          title="Verified destinations. Nothing invented."
          sub="Every portal below is a real government or regulator website, last-checked and labelled by integration type. Where a portal requires login, CAPTCHA or OTP, Financial Legacy routes you there — it never impersonates or bypasses official controls."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {resources.map((r) => {
            const Icon = CATEGORY_ICON[r.category] ?? Globe;
            const integ = INTEGRATION_LABEL[r.integrationType] ?? INTEGRATION_LABEL.official_website;
            return (
              <Card key={r.id} className="flex flex-col transition-shadow hover:shadow-md">
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[14.5px] font-semibold leading-snug text-navy">{r.name}</div>
                        <div className="mt-0.5 text-[12px] text-muted-foreground">{r.authority}</div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 flex-1 text-[13px] leading-relaxed text-ink/75">{r.purpose}</p>

                  <div className="mt-3 rounded-lg bg-background px-3 py-2.5 text-[12px] leading-relaxed text-ink/70">
                    <span className="font-semibold text-navy">What you do there: </span>
                    {r.whatUserDoes}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`rounded-full text-[10.5px] ${integ.tone}`}>
                        {integ.label}
                      </Badge>
                      <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                        <CalendarCheck2 className="h-3 w-3" /> verified {r.lastVerified}
                      </span>
                    </div>
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="h-8 bg-navy text-[12px] text-white hover:bg-navy-deep">
                        Open official site <ExternalLink className="ml-1.5 h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <TrustFooter />
    </div>
  );
}
