"use client";

import JourneyTab from "@/components/fl/journey-tab";
import { useCase } from "@/components/fl/case-context";

export default function StepsPage() {
  const { ws, reload } = useCase();
  return <JourneyTab ws={ws} reload={reload} />;
}
