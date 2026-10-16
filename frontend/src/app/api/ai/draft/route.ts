import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, unauthorized } from "@/lib/session";
import { complete } from "@/server/ai";
import { aiRateLimit } from "@/server/core/rate-limit";
import { logEvent } from "@/lib/case-service";

export const dynamic = "force-dynamic";

/**
 * Draft generator: follow-up letters, will drafts, expert enquiries.
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
  const kind = String(body?.kind ?? ""); // followup | will | expert
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

  const assetLines = legacyCase.assets
    .map((a) => `- ${a.category} at ${a.institution}${a.maskedRef ? `, ref ${a.maskedRef}` : ""} [${a.verificationStatus}]`)
    .join("\n");
  const docLines = legacyCase.documents
    .map((d) => `- ${d.fileName} (${d.category}, extraction: ${d.extractionStatus})`)
    .join("\n");
  const taskLines = legacyCase.tasks
    .slice(0, 10)
    .map((t) => `- [${t.status}] ${t.title}`)
    .join("\n");

  let system = "";
  let user = "";

  if (kind === "followup") {
    system = `You are the Follow-up & Resolution Agent of FinLegacy AI. Draft a firm, courteous, factual follow-up letter the user can review, sign and send to a financial institution in India. Rules: reference only facts provided; use masked references exactly as given; state a clear ask and a response deadline (15 days); mention regulatory escalation rights only if appropriate (insurers: IRDAI Bima Bharosa after insurer non-resolution; banks: RBI Integrated Ombudsman); never fabricate acknowledgement numbers, dates, names or legal citations; add a [USER TO FILL] placeholder for anything missing. Plain professional letter format.`;
    user = `Situation: ${legacyCase.summary}
Holder: ${legacyCase.assetHolderName ?? "[HOLDER NAME]"} (${legacyCase.holderLiving === false ? "deceased" : "status as stated"})
Assets: ${assetLines || "(none recorded)"}
Documents on file: ${docLines || "(none)"}
Extra context (e.g., rejection reason, claim ref): ${extraContext || "(none provided)"}`;
  } else if (kind === "will") {
    system = `You are the Estate Planning assistant of FinLegacy AI. Produce a structured DRAFT will template populated from the user's verified inventory. India-specific guidance: testamentary capacity, two witnesses, no beneficiary should be a witness, sign each page, safe storage. Rules: this is a DRAFT for review, not legal advice or a valid executed will; include placeholders like [NAME] where facts are missing; keep clauses plain-language; include revocation of prior wills, executor appointment, beneficiary schedule from the inventory, residuary clause, guardianship placeholder if minors possible, attestation block. Output format: a markdown document with headings.`;
    user = `Testator: ${legacyCase.assetHolderName ?? "[YOUR FULL NAME]"}
Jurisdiction: ${legacyCase.jurisdiction}
Verified inventory:
${assetLines || "(inventory empty — use placeholders)"}
Beneficiary notes: ${extraContext || "(none provided)"}`;
  } else if (kind === "expert") {
    system = `You are the Expert Escalation Agent of FinLegacy AI. Produce: (1) a concise, structured case summary a qualified professional can act on, and (2) a short enquiry message (max 200 words) the user can send. Facts only from the case; masked references; no legal conclusions; state what the user wants help with.`;
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
      : kind === "will"
        ? "Draft will (template, for review)"
        : "Expert enquiry pack";

  await logEvent(legacyCase.id, "ai", `${label} generated for user review`, "ai");

  return Response.json({ draft: res.data, label });
}
