"use client";

import DocumentsTab from "@/components/fl/documents-tab";
import { useCase } from "@/components/fl/case-context";

export default function RecordsDocumentsPage() {
  const { ws, reload } = useCase();
  return <DocumentsTab ws={ws} reload={reload} />;
}
