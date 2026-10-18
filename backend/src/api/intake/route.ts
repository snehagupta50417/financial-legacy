import { hasAiConsent } from "@server/core/ai-consent";
import { db } from "@server/db";
import { redactIdentifiers } from "@server/core/masking";
import { requireSession, unauthorized } from "@server/core/session";
import { completeJson, completeWithHistory } from "@server/ai";
import { aiRateLimit } from "@server/core/rate-limit";
import { buildJourney, recalcProgress } from "@server/domain/journey-engine";
import { logEvent, officialLinkFor, parseJsonArray } from "@server/domain/case-service";
import { gateSummary } from "@server/domain/gates";
import { fallbackClassification } from "@server/domain/intake-fallback";
import { canDiscover, nextGate } from "@server/core/gate-engine";
import {
  ASSET_CATEGORIES,
  CASE_TYPES,
  SCENARIO_LABELS,
  type AssetCategory,
  type CaseType,
  type ClassifiedSituation,
} from "@shared/types";

const SYSTEM = `You are the Situation Understanding Agent of Financial Legacy, an AI-native financial-legacy platform for India.
You interview people about forgotten family assets, deceased-family-member claims, inheritance documents, wills and estate planning.
Classify the user's message into EXACTLY ONE caseType from: ${CASE_TYPES.join(", ")}.
Rules:
- "living_individual": holder alive, wants to find/organise their own forgotten assets.
- "family_death": a family member died; family doesn't know the full financial footprint.
- "nominee_heir": user is nominee/legal heir/executor claiming specific assets.
- "estate_planning": user wants to create a will or organise an estate.
- "rejected_claim": a claim was rejected or institution is not responding.
- "caregiver": user is helping an elderly relative organise finances.
- "nri_cross_border": family lives abroad or assets span multiple countries.
Distinguish CONFIRMED facts (stated) from ASSUMPTIONS (inferred). Ask one focused follow-up question ONLY when essential facts are missing (e.g., is the holder alive? which documents exist?). Never invent institutions, account numbers, balances or eligibility.
assetCategories must be from: ${ASSET_CATEGORIES.join(", ")}.
If the user asks a follow-up question instead of giving facts, keep caseType stable when a previous classification exists (it will be provided) and set followUpQuestions to [].

Respond with JSON:
{
  "caseType": one of the list,
  "scenarioLabel": short human label,
  "confidence": 0..1,
  "holderLiving": true|false|null,
  "relationship": string|null,
  "assetHolderName": string|null,
  "assetCategories": string[],
  "institutions": string[],
  "jurisdiction": "India" or other,
  "urgency": "low"|"medium"|"high",
  "confirmedFacts": string[],
  "assumptions": string[],
  "followUpQuestions": string[] (max 1),
  "summary": one-sentence case summary
}`;

function inferInstitutionCategory(name: string, fallback: string): string {
  const n = name.toLowerCase();
  if (/(lic|life insurance|bima|insur|pension|nippon life)/.test(n)) return "insurance";
  if (/(bank|pnb|sbi|hdfc|icici|axis|kotak|union|canara|baroda|boi|idfc|yes bank|indusind|central bank)/.test(n))
    return "bank_deposit";
  if (/(mutual fund|amc|hdfc mf|sbi mf|icici pru|axis mf|kotak mf|nipp|mirae|quant|uti)/.test(n)) return "mutual_fund";
  if (/(demat|shares|nsdl|cdsl|depository)/.test(n)) return "shares";
  return fallback;
}

export async function POST(req: Request) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const limited = aiRateLimit(session.id);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  const message: string = body?.message?.trim();
  const caseId: string | undefined = body?.caseId;
  if (!message) return Response.json({ error: "Message required" }, { status: 400 });

  // Previous classification context (journey continuity)
  const existingCase = caseId
    ? await db.legacyCase.findFirst({ where: { id: caseId, sessionId: session.id } })
    : null;
  // History is scoped to THIS case only (bug 1: it used to mix every case in the session).
  const history = existingCase
    ? await db.intakeMessage.findMany({
        where: { sessionId: session.id, caseId: existingCase.id },
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    : [];

  const userMessage = await db.intakeMessage.create({
    // The model sees the original text in memory; only a redacted copy is kept ("read, extract, forget").
    data: { sessionId: session.id, role: "user", content: redactIdentifiers(message), caseId: existingCase?.id ?? null },
  });

  const priorContext = existingCase
    ? `\n\nPrevious classification for context (keep stable unless clearly changed): caseType=${existingCase.caseType}, holder=${existingCase.assetHolderName ?? "unknown"}, living=${existingCase.holderLiving}.\nConversation so far (oldest first):\n${history
        .slice()
        .reverse()
        .map((h) => `${h.role}: ${h.content.slice(0, 300)}`)
        .join("\n")}`
    : "";

  let cls: ClassifiedSituation | null = null;
  let aiDegraded = false;
  const allowed = await hasAiConsent(session.id);
  // `fast`: the voice agent opens the case from the first sentence with the quick rules and does the real
  // understanding itself, instead of waiting for a second slow model call before it can reply.
  const res = allowed && !body?.fast ? await completeJson<ClassifiedSituation>(
    SYSTEM,
    `User message: ${message}${priorContext}`,
    (raw) => {
      const r = raw as Partial<ClassifiedSituation>;
      if (!r || typeof r !== "object" || !CASE_TYPES.includes(r.caseType as CaseType)) return null;
      return {
        caseType: r.caseType as CaseType,
        scenarioLabel:
          typeof r.scenarioLabel === "string" ? r.scenarioLabel : SCENARIO_LABELS[r.caseType as CaseType],
        confidence: typeof r.confidence === "number" ? Math.min(1, Math.max(0, r.confidence)) : 0.7,
        holderLiving:
          r.holderLiving === true ? true : r.holderLiving === false ? false : null,
        relationship: typeof r.relationship === "string" ? r.relationship : null,
        assetHolderName: typeof r.assetHolderName === "string" ? r.assetHolderName : null,
        assetCategories: Array.isArray(r.assetCategories)
          ? r.assetCategories.filter((c): c is AssetCategory =>
              (ASSET_CATEGORIES as readonly string[]).includes(c as string))
          : [],
        institutions: Array.isArray(r.institutions) ? r.institutions.map(String).slice(0, 8) : [],
        jurisdiction: typeof r.jurisdiction === "string" ? r.jurisdiction : "India",
        urgency: r.urgency === "high" ? "high" : r.urgency === "low" ? "low" : "medium",
        confirmedFacts: Array.isArray(r.confirmedFacts) ? r.confirmedFacts.map(String).slice(0, 10) : [],
        assumptions: Array.isArray(r.assumptions) ? r.assumptions.map(String).slice(0, 6) : [],
        followUpQuestions: Array.isArray(r.followUpQuestions)
          ? r.followUpQuestions.map(String).slice(0, 1)
          : [],
        summary: typeof r.summary === "string" ? r.summary : "",
      };
    }
  ) : { ok: false as const, error: "Permission not granted" };

  if (res.ok) {
    cls = res.data;
  } else {
    cls = fallbackClassification(message);
    aiDegraded = true;
  }

  // Build or update the case
  const { summary, tasks: seeds } = buildJourney(cls);
  let legacyCase = existingCase;

  if (legacyCase) {
    legacyCase = await db.legacyCase.update({
      where: { id: legacyCase.id },
      data: {
        caseType: cls.caseType,
        scenarioLabel: cls.scenarioLabel,
        holderLiving: cls.holderLiving,
        relationship: cls.relationship ?? legacyCase.relationship,
        assetHolderName: cls.assetHolderName ?? legacyCase.assetHolderName,
        jurisdiction: cls.jurisdiction || "India",
        summary,
        confidence: cls.confidence,
        confirmedFacts: JSON.stringify(cls.confirmedFacts),
        assumptions: JSON.stringify(cls.assumptions),
      },
    });
  } else {
    legacyCase = await db.legacyCase.create({
      data: {
        sessionId: session.id,
        caseType: cls.caseType,
        scenarioLabel: cls.scenarioLabel,
        holderLiving: cls.holderLiving,
        relationship: cls.relationship,
        assetHolderName: cls.assetHolderName,
        jurisdiction: cls.jurisdiction || "India",
        summary,
        confidence: cls.confidence,
        confirmedFacts: JSON.stringify(cls.confirmedFacts),
        assumptions: JSON.stringify(cls.assumptions),
        stage: "discovery",
      },
    });
    await db.intakeMessage.update({ where: { id: userMessage.id }, data: { caseId: legacyCase.id } });
    await logEvent(
      legacyCase.id,
      "created",
      `Case opened — classified as "${cls.scenarioLabel}" (confidence ${(cls.confidence * 100).toFixed(0)}%)`,
      "ai"
    );
  }

  // Persist newly-mentioned institutions. Before the discovery gate nothing
  // about the asset holder's assets is created — mentions are kept as
  // unverified assumptions and checked once discovery is unlocked (plan §6.1).
  if (canDiscover(legacyCase)) {
    for (const inst of cls.institutions) {
      const exists = await db.assetRecord.findFirst({
        where: { caseId: legacyCase.id, institution: { contains: inst }, discoveryStatus: "possible" },
      });
      if (!exists && inst.trim().length > 2) {
        await db.assetRecord.create({
          data: {
            caseId: legacyCase.id,
            category: inferInstitutionCategory(inst, cls.assetCategories[0] ?? "unknown"),
            institution: inst,
            evidence: `Mentioned during AI intake conversation`,
            confidence: 0.4,
          },
        });
        await logEvent(legacyCase.id, "asset", `Potential asset clue recorded: ${inst}`, "ai");
      }
    }
  } else if (cls.institutions.length) {
    const mentions = cls.institutions
      .filter((i) => i.trim().length > 2)
      .map((i) => `You mentioned ${i} — to be checked once discovery is unlocked`);
    const assumptions = [...new Set([...parseJsonArray(legacyCase.assumptions), ...mentions])].slice(0, 12);
    legacyCase = await db.legacyCase.update({
      where: { id: legacyCase.id },
      data: { assumptions: JSON.stringify(assumptions) },
    });
  }

  // Generate journey tasks only once per case (unless empty)
  const taskCount = await db.journeyTask.count({ where: { caseId: legacyCase.id } });
  if (taskCount === 0 && seeds.length) {
    let sort = 0;
    for (const seed of seeds) {
      const link = officialLinkFor(seed.assetCategory ?? null);
      const depsResolved: string[] = [];
      for (const depTitle of seed.dependencies ?? []) {
        const dep = await db.journeyTask.findFirst({
          where: { caseId: legacyCase.id, title: depTitle },
        });
        if (dep) depsResolved.push(dep.id);
      }
      await db.journeyTask.create({
        data: {
          caseId: legacyCase.id,
          title: seed.title,
          instructions: seed.instructions,
          rationale: seed.rationale,
          institution: seed.institution ?? null,
          assetCategory: seed.assetCategory ?? null,
          officialUrl: link?.officialUrl ?? null,
          officialName: link?.officialName ?? null,
          integrationType: link?.integrationType ?? "guided_workflow",
          requiredDocs: JSON.stringify(seed.requiredDocs ?? []),
          missingInfo: JSON.stringify(seed.missingInfo ?? []),
          dependencies: JSON.stringify(depsResolved),
          status: seed.status ?? "ready",
          priority: seed.priority,
          sortOrder: sort++,
        },
      });
    }
    await logEvent(
      legacyCase.id,
      "ai",
      `Journey generated: ${seeds.length} personalised tasks across ${new Set(seeds.map((s) => s.institution ?? "general")).size} workstreams`,
      "ai"
    );

    // Set the initial next-best-action
    const all = await db.journeyTask.findMany({
      where: { caseId: legacyCase.id },
      select: { id: true, status: true, dependencies: true, priority: true },
    });
    const { progress, nextBestTaskId } = recalcProgress(all);
    if (nextBestTaskId) {
      await db.journeyTask.update({ where: { id: nextBestTaskId }, data: { isNextBest: true } });
      const nextTask = await db.journeyTask.findUnique({ where: { id: nextBestTaskId } });
      await db.legacyCase.update({
        where: { id: legacyCase.id },
        data: { progress, nextBestAction: nextTask?.title ?? null },
      });
    }
  }

  // Assistant reply: conversational acknowledgement (short, warm, specific)
  const followUps = cls.followUpQuestions.length
    ? `\n\n${cls.followUpQuestions.map((q) => `• ${q}`).join("\n")}`
    : "";
  const factsNote = cls.confirmedFacts.length
    ? `\n\nWhat I've noted: ${cls.confirmedFacts.slice(0, 4).join("; ")}.`
    : "";
  const assumptionsNote = cls.assumptions.length
    ? `\nWorking assumptions (please correct me if wrong): ${cls.assumptions.slice(0, 3).join("; ")}.`
    : "";

  // `fast` callers (the voice agent) write their own reply, so no second model call is made for one here.
  const replyRes = allowed && !body?.fast ? await completeWithHistory(
    `You are Financial Legacy's intake companion. Tone: calm, empathetic, precise, never salesy. Acknowledge the user's situation in 2-4 sentences, state the journey type you opened, and surface the most important next step. Never invent facts, balances, or eligibility. Never promise outcomes. If the situation involves a death, express brief, sincere condolence first.`,
    // history is newest-first: take the 6 most recent turns, oldest first
    history.slice(0, 6).reverse().map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    `User said: "${message}"\nClassification: ${cls.scenarioLabel}.\nWrite the acknowledgement.`
  ) : { ok: false as const, error: "Permission not granted" };

  const reply =
    replyRes.ok
      ? `${replyRes.data}${factsNote}${assumptionsNote}${followUps}`
      : `I've recorded your situation and opened a ${cls.scenarioLabel.toLowerCase()} journey.${factsNote}${assumptionsNote}${followUps}`;

  const meta = {
    classification: cls,
    caseId: legacyCase.id,
    aiDegraded,
    gate: gateSummary(legacyCase),
    nextGate: nextGate(legacyCase),
  };
  await db.intakeMessage.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: redactIdentifiers(reply),
      caseId: legacyCase.id,
      meta: JSON.stringify(meta),
    },
  });

  return Response.json({ reply, ...meta });
}
