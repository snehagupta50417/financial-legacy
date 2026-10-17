"use client";

import { useRouter } from "next/navigation";
import ResourcesPage from "@/components/fl/resources-page";

export default function Resources() {
  const router = useRouter();
  return (
    <>
      <h1 className="sr-only">Official portals</h1>
      <ResourcesPage onHome={() => router.push("/")} />
    </>
  );
}
