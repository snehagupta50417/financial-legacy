import { db } from "@/server/db";
import type { CaseWorkspace } from "@/lib/types";

export function parseJsonArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function parseFields(s: string | null | undefined) {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function logEvent(
  caseId: string,
  eventType: string,
  description: string,
  actor: "ai" | "user" | "system" = "ai",
  refId?: string
) {
  await db.caseEvent.create({
    data: { caseId, eventType, description, actor, refId: refId ?? null },
  });
}

export async function getWorkspacePayload(
  caseId: string,
  sessionId: string
): Promise<CaseWorkspace | null> {
  const c = await db.legacyCase.findFirst({
    where: { id: caseId, sessionId },
    include: {
      assets: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "asc" } },
      tasks: { orderBy: [{ priority: "asc" }, { sortOrder: "asc" }] },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!c) return null;
  return {
    case: {
      id: c.id,
      caseType: c.caseType,
      scenarioLabel: c.scenarioLabel,
      assetHolderName: c.assetHolderName,
      relationship: c.relationship,
      holderLiving: c.holderLiving,
      jurisdiction: c.jurisdiction,
      summary: c.summary,
      stage: c.stage,
      progress: c.progress,
      nextBestAction: c.nextBestAction,
      confidence: c.confidence,
      confirmedFacts: parseJsonArray(c.confirmedFacts),
      assumptions: parseJsonArray(c.assumptions),
      isDemo: c.isDemo,
      demoKey: c.demoKey,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    },
    assets: c.assets.map((a) => ({
      id: a.id,
      category: a.category,
      institution: a.institution,
      maskedRef: a.maskedRef,
      holderName: a.holderName,
      evidence: a.evidence,
      discoveryStatus: a.discoveryStatus,
      verificationStatus: a.verificationStatus,
      confidence: a.confidence,
      notes: a.notes,
      sourceDocumentId: a.sourceDocumentId,
    })),
    documents: c.documents.map((d) => ({
      id: d.id,
      category: d.category,
      fileName: d.fileName,
      fileType: d.fileType,
      sizeLabel: d.sizeLabel,
      extractionStatus: d.extractionStatus,
      extractionNote: d.extractionNote,
      extractedFields: parseFields(d.extractedFields),
      userVerified: d.userVerified,
      isSynthetic: d.isSynthetic,
      createdAt: d.createdAt.toISOString(),
    })),
    tasks: c.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      instructions: t.instructions,
      rationale: t.rationale,
      institution: t.institution,
      assetCategory: t.assetCategory,
      officialUrl: t.officialUrl,
      officialName: t.officialName,
      integrationType: t.integrationType,
      requiredDocs: parseJsonArray(t.requiredDocs),
      missingInfo: parseJsonArray(t.missingInfo),
      dependencies: parseJsonArray(t.dependencies),
      status: t.status,
      isNextBest: t.isNextBest,
      completionEvidence: t.completionEvidence,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    })),
    events: c.events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      description: e.description,
      actor: e.actor,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

/** Attach official-portal metadata to each task seed based on asset category. */
export function officialLinkFor(assetCategory: string | null): {
  officialUrl: string;
  officialName: string;
  integrationType: string;
} | null {
  const map: Record<string, { url: string; name: string; type: string }> = {
    bank_deposit: {
      url: "https://udgam.rbi.org.in/unclaimed-deposits/#/login",
      name: "RBI UDGAM — Unclaimed Deposits Portal",
      type: "official_website",
    },
    bank_account: {
      url: "https://udgam.rbi.org.in/unclaimed-deposits/#/login",
      name: "RBI UDGAM — Unclaimed Deposits Portal",
      type: "official_website",
    },
    insurance: {
      url: "https://bimabharosa.irdai.gov.in/Home/UnclaimedAmountsQuery",
      name: "IRDAI Bima Bharosa — Unclaimed Amount Query",
      type: "official_website",
    },
    grievance: {
      url: "https://bimabharosa.irdai.gov.in/",
      name: "IRDAI Bima Bharosa — Grievance Portal",
      type: "official_website",
    },
    mutual_fund: {
      url: "https://www.sebi.gov.in/",
      name: "SEBI — MITRA official information",
      type: "official_website",
    },
    shares: {
      url: "https://www.iepf.gov.in/",
      name: "IEPF Authority — MCA",
      type: "official_website",
    },
    multi: {
      url: "https://www.incometax.gov.in/",
      name: "Income Tax e-Filing — AIS/TIS",
      type: "official_website",
    },
  };
  if (!assetCategory) return null;
  const hit = map[assetCategory];
  if (!hit) return null;
  return {
    officialUrl: hit.url,
    officialName: hit.name,
    integrationType: hit.type,
  };
}
