import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, unauthorized } from "@/lib/session";
import { DEMO_CASES, type DemoCaseSeed } from "@/lib/demo-data";
import { buildJourney } from "@/lib/journey-engine";
import { logEvent, officialLinkFor } from "@/lib/case-service";
import type { ClassifiedSituation, CaseType } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Seeds a fully synthetic, clearly-labelled demo case so the hackathon demo
 * can run end-to-end without external credentials or real personal data.
 */
export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const body = await req.json().catch(() => null);
  const scenario: string = String(body?.scenario ?? "");
  const seed: DemoCaseSeed | undefined = DEMO_CASES.find((d) => d.demoKey === scenario);
  if (!seed) return Response.json({ error: "Unknown demo scenario" }, { status: 400 });

  // Re-seeding the same demo replaces the previous copy for this session
  const existing = await db.legacyCase.findFirst({
    where: { sessionId: session.id, demoKey: seed.demoKey },
  });
  if (existing) {
    await db.legacyCase.delete({ where: { id: existing.id } });
  }

  const cls: ClassifiedSituation = {
    caseType: seed.caseType as CaseType,
    scenarioLabel: seed.scenarioLabel,
    confidence: seed.confidence,
    holderLiving: seed.holderLiving,
    relationship: seed.relationship,
    assetHolderName: seed.holderName,
    assetCategories: [...new Set(seed.assets.map((a) => a.category))] as ClassifiedSituation["assetCategories"],
    institutions: [...new Set(seed.assets.map((a) => a.institution))],
    jurisdiction: "India",
    urgency: "high",
    confirmedFacts: seed.confirmedFacts,
    assumptions: seed.assumptions,
    followUpQuestions: [],
    summary: seed.summary,
  };

  const { tasks: seeds } = buildJourney(cls);

  const legacyCase = await db.legacyCase.create({
    data: {
      sessionId: session.id,
      caseType: cls.caseType,
      scenarioLabel: cls.scenarioLabel,
      holderLiving: cls.holderLiving,
      relationship: cls.relationship,
      assetHolderName: cls.assetHolderName,
      summary: cls.summary,
      confidence: cls.confidence,
      confirmedFacts: JSON.stringify(cls.confirmedFacts),
      assumptions: JSON.stringify(cls.assumptions),
      stage: "documentation",
      isDemo: true,
      demoKey: seed.demoKey,
    },
  });

  await logEvent(
    legacyCase.id,
    "created",
    `DEMO case loaded (synthetic data — ${seed.demoKey}). No real customer or recovery is represented.`,
    "system"
  );

  for (const d of seed.documents) {
    const doc = await db.documentRecord.create({
      data: {
        caseId: legacyCase.id,
        category: d.category,
        fileName: d.fileName,
        fileType: d.fileType,
        sizeLabel: d.sizeLabel,
        extractionStatus: "extracted",
        extractionNote: d.extracted.summary,
        rawText: d.rawText,
        extractedFields: JSON.stringify(d.extracted.fields),
        isSynthetic: true,
      },
    });
    await logEvent(legacyCase.id, "document", `DEMO document "${d.fileName}" analysed — ${d.extracted.fields.length} fields extracted`, "ai", doc.id);
  }

  for (const a of seed.assets) {
    await db.assetRecord.create({
      data: {
        caseId: legacyCase.id,
        category: a.category,
        institution: a.institution,
        maskedRef: a.maskedRef,
        holderName: a.holderName,
        evidence: a.evidence,
        confidence: a.confidence,
        discoveryStatus: "possible",
        verificationStatus: a.verificationStatus,
      },
    });
  }
  await logEvent(legacyCase.id, "asset", `${seed.assets.length} evidence-linked potential assets queued for your confirmation`, "ai");

  let sort = 0;
  for (const s of seeds) {
    const link = officialLinkFor(s.assetCategory ?? null);
    const deps: string[] = [];
    for (const depTitle of s.dependencies ?? []) {
      const dep = await db.journeyTask.findFirst({ where: { caseId: legacyCase.id, title: depTitle } });
      if (dep) deps.push(dep.id);
    }
    const isCompleted = seed.completedTaskTitles.includes(s.title);
    await db.journeyTask.create({
      data: {
        caseId: legacyCase.id,
        title: s.title,
        instructions: s.instructions,
        rationale: s.rationale,
        institution: s.institution ?? null,
        assetCategory: s.assetCategory ?? null,
        officialUrl: link?.officialUrl ?? null,
        officialName: link?.officialName ?? null,
        integrationType: link?.integrationType ?? "guided_workflow",
        requiredDocs: JSON.stringify(s.requiredDocs ?? []),
        missingInfo: JSON.stringify(s.missingInfo ?? []),
        dependencies: JSON.stringify(deps),
        status: isCompleted ? "completed" : s.status ?? "ready",
        priority: s.priority,
        sortOrder: sort++,
        completedAt: isCompleted ? new Date() : null,
        completionEvidence: isCompleted ? "Completed during demo setup" : null,
      },
    });
  }

  const all = await db.journeyTask.findMany({
    where: { caseId: legacyCase.id },
    select: { id: true, title: true, status: true, dependencies: true, priority: true },
  });
  const completed = all.filter((t) => t.status === "completed").length;
  const progress = all.length ? Math.round((completed / all.length) * 100) : 0;
  const next = all
    .filter((t) => t.status !== "completed")
    .sort((a, b) => a.priority - b.priority)[0];
  await db.journeyTask.update({ where: { id: next.id }, data: { isNextBest: true } });
  await db.legacyCase.update({
    where: { id: legacyCase.id },
    data: { progress, nextBestAction: next.title },
  });
  await logEvent(legacyCase.id, "ai", `Journey generated: ${seeds.length} personalised tasks. Next best action: ${next.title}`, "ai");

  return Response.json({ caseId: legacyCase.id });
}
