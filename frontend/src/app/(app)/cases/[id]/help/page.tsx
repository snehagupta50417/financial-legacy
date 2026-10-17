"use client";

import ExpertTab from "@/components/fl/expert-tab";
import { useCase } from "@/components/fl/case-context";

export default function HelpPage() {
  const { ws } = useCase();
  return <ExpertTab ws={ws} />;
}
