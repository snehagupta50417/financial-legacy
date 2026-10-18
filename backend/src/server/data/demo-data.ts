import type { ExtractedDocumentData } from "@shared/types";
import { buildDemoCases } from "./synthetic/demo-cases";

/**
 * Synthetic demo data — clearly labelled everywhere in the UI as DEMO.
 * People, identifiers and documents are synthetic; institutions, branches,
 * schemes and NAVs are real public reference data. No real customer data.
 */

export interface DemoDocumentSeed {
  category: string;
  fileName: string;
  fileType: string;
  sizeLabel: string;
  rawText: string;
  extracted: ExtractedDocumentData;
}

export interface DemoCaseSeed {
  demoKey: "demo-a" | "demo-b" | "demo-c";
  caseType: string;
  scenarioLabel: string;
  holderName: string;
  relationship: string;
  holderLiving: boolean;
  summary: string;
  confirmedFacts: string[];
  assumptions: string[];
  confidence: number;
  documents: DemoDocumentSeed[];
  assets: {
    category: string;
    institution: string;
    maskedRef: string | null;
    holderName: string | null;
    evidence: string;
    confidence: number;
  }[];
  completedTaskTitles: string[];
}

// The three demo cases are generated from real public reference data (banks,
// branches, fund schemes, NAVs, RBI rates) plus synthetic people and masked
// identifiers — see ./synthetic/ and scripts/fetch-reference-data.mjs.
export const DEMO_CASES: DemoCaseSeed[] = buildDemoCases();
