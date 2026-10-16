import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, unauthorized } from "@/lib/session";
import { complete } from "@/server/ai";
import { aiRateLimit } from "@/server/core/rate-limit";

export const dynamic = "force-dynamic";

/** Grounded Q&A over the case file — the user can ask follow-ups without losing the journey. */
export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const limited = aiRateLimit(session.id);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  const caseId = String(body?.caseId ?? "");
  const question = String(body?.question ?? "").trim();
  if (!question) return Response.json({ error: "Question required" }, { status: 400 });

  const legacyCase = await db.legacyCase.findFirst({
    where: { id: caseId, sessionId: session.id },
    include: {
      assets: { where: { discoveryStatus: { not: "dismissed" } } },
      documents: true,
      tasks: { orderBy: { priority: "asc" }, take: 12 },
    },
  });
  if (!legacyCase) return Response.json({ error: "Case not found" }, { status: 404 });

  const context = `
CASE FILE
Summary: ${legacyCase.summary}
Holder: ${legacyCase.assetHolderName ?? "unspecified"} | living: ${legacyCase.holderLiving ?? "unknown"} | jurisdiction: ${legacyCase.jurisdiction}
Progress: ${legacyCase.progress}% | stage: ${legacyCase.stage}
Confirmed facts: ${legacyCase.confirmedFacts ?? "[]"}
Assumptions: ${legacyCase.assumptions ?? "[]"}
Assets:
${legacyCase.assets.map((a) => `- ${a.category} @ ${a.institution}${a.maskedRef ? ` (${a.maskedRef})` : ""} — ${a.verificationStatus}, confidence ${a.confidence}`).join("\n") || "(none)"}
Documents:
${legacyCase.documents.map((d) => `- ${d.fileName} (${d.category}, ${d.extractionStatus})`).join("\n") || "(none)"}
Tasks:
${legacyCase.tasks.map((t) => `- [${t.status}] ${t.title}`).join("\n") || "(none)"}`;

  const res = await complete(
    `You are FinLegacy AI's case assistant answering questions about an ongoing financial-legacy case in India. Answer ONLY from the case file below and general regulatory knowledge (RBI/IRDAI/SEBI/IEPF processes). Rules: never invent balances, account numbers, claim eligibility, timelines not in the file, or legal conclusions; if something is unknown say what would be needed to know it; keep answers under 180 words; use plain language; if the question needs a licensed professional, say so plainly.
${context}`,
    question
  );

  if (!res.ok) {
    return Response.json(
      { error: "The assistant is temporarily unavailable — your case data is unaffected." },
      { status: 503 }
    );
  }
  return Response.json({ answer: res.data });
}
