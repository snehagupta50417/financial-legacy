import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireSession, unauthorized } from "@/server/core/session";
import { complete } from "@/server/ai";
import { canDiscover } from "@/server/core/gate-engine";
import { maskAsset } from "@/server/core/masking";
import { aiRateLimit } from "@/server/core/rate-limit";
import { logEvent } from "@/server/domain/case-service";

export const dynamic = "force-dynamic";

/**
 * Draft generator: follow-up letters, notes for a lawyer, expert enquiries.
 * Everything produced here is a DRAFT for user review — clearly labelled,
 * never auto-submitted anywhere.
 */
export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const limited = aiRateLimit(session.id);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  const caseId = String(body?.caseId ?? "");
  const kind = String(body?.kind ?? ""); // followup | lawyer_notes | expert (no will drafting — PRD)
  const extraContext: string = typeof body?.context === "string" ? body.context.slice(0, 2000) : "";
  const expertType: string = typeof body?.expertType === "string" ? body.expertType : "";

  const legacyCase = await db.legacyCase.findFirst({
    where: { id: caseId, sessionId: session.id },
    include: {
      assets: { where: { discoveryStatus: { not: "dismissed" } } },
      documents: true,
      tasks: { orderBy: { priority: "asc" } },
    },
  });
  if (!legacyCase) return Response.json({ error: "Case not found" }, { status: 404 });

  // Prompts only ever see what the user may see: nothing below the discovery
  // gate, and masked assets below G4.
  const unlocked = canDiscover(legacyCase);
  const visibleDocs = unlocked ? legacyCase.documents : [];
  const visibleAssets = unlocked ? legacyCase.assets.map((a) => maskAsset(legacyCase, a)) : [];

  const assetLines = visibleAssets
    .map((a) => `- ${a.category} at ${a.institution}${a.maskedRef ? `, ref ${a.maskedRef}` : ""} [${a.evidenceStatus.replace(/_/g, " ")}]`)
    .join("\n");
  const docLines = visibleDocs
    .map((d) => `- ${d.fileName} (${d.category}, extraction: ${d.extractionStatus})`)
    .join("\n");
  const taskLines = legacyCase.tasks
    .slice(0, 10)
    .map((t) => `- [${t.status}] ${t.title}`)
    .join("\n");

  let system = "";
  let user = "";

  if (kind === "followup") {
    system = `You are the Follow-up & Resolution Agent of Financial Legacy. Draft a firm, courteous, factual follow-up letter the user can review, sign and send to a financial institution in India. Rules: reference only facts provided; use masked references exactly as given; state a clear ask and a response deadline (15 days); mention regulatory escalation rights only if appropriate (insurers: IRDAI Bima Bharosa after insurer non-resolution; banks: RBI Integrated Ombudsman); never fabricate acknowledgement numbers, dates, names or legal citations; add a [USER TO FILL] placeholder for anything missing. Plain professional letter format.`;
    user = `Situation: ${legacyCase.summary}
Holder: ${legacyCase.assetHolderName ?? "[HOLDER NAME]"} (${legacyCase.holderLiving === false ? "deceased" : "status as stated"})
Assets: ${assetLines || "(none recorded)"}
Documents on file: ${docLines || "(none)"}
Extra context (e.g., rejection reason, claim ref): ${extraContext || "(none provided)"}`;
  } else if (kind === "lawyer_notes") {
    // DESIGN §7.1: replaces will drafting in the UI — the PRD rules out drafting legally binding wills.
    system = `You are the legacy planning assistant of Financial Legacy. Write "Notes for your lawyer": a structured, plain-language summary a lawyer or chartered accountant can use when advising the person. It is NOT a will and must say so at the top in one sentence. Sections: About me (placeholders where unknown), What I hold (from the inventory only, masked references exactly as given, with its evidence status in words), Nominations and gaps (what is unknown or missing), My wishes (only what the person wrote, otherwise [TO DISCUSS]), Questions for my lawyer. Rules: facts only from the input; never invent amounts, names, nominees or legal conclusions; no clauses, no attestation block. Output: markdown with headings.`;
    user = `Person: ${legacyCase.assetHolderName ?? "[YOUR FULL NAME]"}
Jurisdiction: ${legacyCase.jurisdiction}
Inventory:
${assetLines || "(inventory empty)"}
Documents on file: ${docLines || "(none)"}
Their notes and wishes: ${extraContext || "(none provided)"}`;
  } else if (kind === "expert") {
    system = `You are the Expert Escalation Agent of Financial Legacy. Produce: (1) a concise, structured case summary a qualified professional can act on, and (2) a short enquiry message (max 200 words) the user can send. Facts only from the case; masked references; no legal conclusions; state what the user wants help with.`;
    user = `Expert type requested: ${expertType || "estate/inheritance lawyer"}
Case: ${legacyCase.summary}
Holder: ${legacyCase.assetHolderName ?? "unspecified"}; living: ${legacyCase.holderLiving ?? "unknown"}; jurisdiction: ${legacyCase.jurisdiction}
Assets: ${assetLines || "(none)"}
Documents: ${docLines || "(none)"}
Tasks so far: ${taskLines}
User's question/context: ${extraContext || "(none)"}`;
  } else {
    return Response.json({ error: "Unknown draft kind" }, { status: 400 });
  }

  const res = await complete(system, user);
  if (!res.ok) {
    return Response.json(
      { error: "Draft generation is temporarily unavailable — your case data is safe. Please retry shortly." },
      { status: 503 }
    );
  }

  const label =
    kind === "followup"
      ? "Follow-up letter draft"
      : kind === "lawyer_notes"
        ? "Notes for your lawyer (not a will)"
        : "Expert enquiry pack";

  await logEvent(legacyCase.id, "ai", `${label} generated for user review`, "ai");

  return Response.json({ draft: res.data, label });
}
