"use client";

import { useRouter } from "next/navigation";
import ResourcesPage from "@/components/fl/resources-page";

export default function Resources() {
  const router = useRouter();
  return <ResourcesPage onHome={() => router.push("/")} />;
}
