// ─── Shared domain types for FinLegacy AI ───────────────────────────────────

export const CASE_TYPES = [
  "living_individual",
  "family_death",
  "nominee_heir",
  "estate_planning",
  "rejected_claim",
  "caregiver",
  "nri_cross_border",
  "general",
] as const;
export type CaseType = (typeof CASE_TYPES)[number];

export const ASSET_CATEGORIES = [
  "bank_deposit",
  "bank_account",
  "insurance",
  "mutual_fund",
  "shares",
  "provident_fund",
  "other",
  "unknown",
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const TASK_STATUSES = [
  "not_started",
  "ready",
  "in_progress",
  "waiting_institution",
  "needs_expert",
  "completed",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface OfficialResource {
  id: string;
  name: string;
  authority: string;
  category: AssetCategory | "grievance" | "multi";
  purpose: string;
  url: string;
  integrationType: "official_website" | "guided_workflow" | "public_api";
  whatUserDoes: string;
  lastVerified: string;
}

export interface ClassifiedSituation {
  caseType: CaseType;
  scenarioLabel: string;
  confidence: number;
  holderLiving: boolean | null;
  relationship: string | null;
  assetHolderName: string | null;
  assetCategories: AssetCategory[];
  institutions: string[];
  jurisdiction: string;
  urgency: "low" | "medium" | "high";
  confirmedFacts: string[];
  assumptions: string[];
  followUpQuestions: string[];
  summary: string;
}

export interface ExtractedDocumentData {
  documentCategory: string;
  summary: string;
  extractionQuality: "good" | "partial" | "poor";
  fields: {
    label: string;
    value: string;
    confidence: number;
    sourceExcerpt: string;
  }[];
  institutions: string[];
  assetClues: {
    category: AssetCategory;
    institution: string;
    reference: string | null;
    holderName: string | null;
    evidence: string;
    confidence: number;
  }[];
  missingOrUnreadable: string[];
  warnings: string[];
}

export interface CaseWorkspace {
  case: {
    id: string;
    caseType: string;
    scenarioLabel: string | null;
    assetHolderName: string | null;
    relationship: string | null;
    holderLiving: boolean | null;
    jurisdiction: string;
    summary: string;
    stage: string;
    progress: number;
    nextBestAction: string | null;
    confidence: number | null;
    confirmedFacts: string[];
    assumptions: string[];
    isDemo: boolean;
    demoKey: string | null;
    createdAt: string;
    updatedAt: string;
  };
  assets: {
    id: string;
    category: string;
    institution: string;
    maskedRef: string | null;
    holderName: string | null;
    evidence: string | null;
    discoveryStatus: string;
    verificationStatus: string;
    confidence: number;
    notes: string | null;
    sourceDocumentId: string | null;
  }[];
  documents: {
    id: string;
    category: string;
    fileName: string;
    fileType: string;
    sizeLabel: string | null;
    extractionStatus: string;
    extractionNote: string | null;
    extractedFields: {
      label: string;
      value: string;
      confidence: number;
      sourceExcerpt: string;
    }[];
    userVerified: boolean;
    isSynthetic: boolean;
    createdAt: string;
  }[];
  tasks: {
    id: string;
    title: string;
    instructions: string;
    rationale: string | null;
    institution: string | null;
    assetCategory: string | null;
    officialUrl: string | null;
    officialName: string | null;
    integrationType: string;
    requiredDocs: string[];
    missingInfo: string[];
    dependencies: string[];
    status: string;
    isNextBest: boolean;
    completionEvidence: string | null;
    completedAt: string | null;
  }[];
  events: {
    id: string;
    eventType: string;
    description: string;
    actor: string;
    createdAt: string;
  }[];
}

export const SCENARIO_LABELS: Record<CaseType, string> = {
  living_individual: "Living individual — recover forgotten assets",
  family_death: "Family after the loss of a loved one",
  nominee_heir: "Nominee or legal heir claiming assets",
  estate_planning: "Will & estate planning",
  rejected_claim: "Rejected or delayed claim",
  caregiver: "Helping an elderly relative",
  nri_cross_border: "NRI / cross-border family",
  general: "General financial legacy",
};
