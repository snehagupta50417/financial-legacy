"use client";

import AssetsTab from "@/components/fl/assets-tab";
import { useCase } from "@/components/fl/case-context";

export default function RecordsAssetsPage() {
  const { ws, reload } = useCase();
  return <AssetsTab ws={ws} reload={reload} />;
}
