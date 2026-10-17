"use client";

import { createContext, useContext } from "react";
import type { CaseWorkspace } from "@/lib/types";

export interface CaseContextValue {
  ws: CaseWorkspace;
  reload: () => Promise<void>;
}

export const CaseContext = createContext<CaseContextValue | null>(null);

/** The loaded case for pages under /cases/[id]. The case layout only renders children once it has loaded. */
export function useCase(): CaseContextValue {
  const v = useContext(CaseContext);
  if (!v) throw new Error("useCase must be used inside the case layout");
  return v;
}
