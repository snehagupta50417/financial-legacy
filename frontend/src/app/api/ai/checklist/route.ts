import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { requireSession, unauthorized } from "@/server/core/session";
import { completeJson } from "@/server/ai";
import { canDiscover } from "@/server/core/gate-engine";
import { maskAsset } from "@/server/core/masking";
import { aiRateLimit } from "@/server/core/rate-limit";
import { logEvent } from "@/server/domain/case-service";

export const dynamic = "force-dynamic";

interface Checklist {
  institution: string;
  purpose: string;
  items: {
    document: string;
    why: string;
    whereToGet: string;
    critical: boolean;
  }[];
  tips: string[];
}

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const limited = aiRateLimit(session.id);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  const caseId = String(body?.caseId ?? "");
  const institution: string = String(body?.institution ?? "");
  const purpose: string = String(body?.purpose ?? "claim processing");

  const legacyCase = await db.legacyCase.findFirst({
    where: { id: caseId, sessionId: session.id },
    include: { assets: { where: { discoveryStatus: { not: "dismissed" } } } },
  });
  if (!legacyCase) return Response.json({ error: "Case not found" }, { status: 404 });

  // Prompts only ever see what the user may see: nothing below the discovery
  // gate, and masked assets below G4.
  const unlocked = canDiscover(legacyCase);
  const visibleAssets = unlocked ? legacyCase.assets.map((a) => maskAsset(legacyCase, a)) : [];

  const context = visibleAssets
    .map((a) => `- ${a.category} at ${a.institution}${a.maskedRef ? ` (${a.maskedRef})` : ""}, verification: ${a.verificationStatus}`)
    .join("\n");

  const res = await completeJson<Checklist>(
    `You are the Checklist Agent of FinLegacy AI for Indian BFSI processes. Generate a precise, practical document checklist for a specific institution interaction. Rules: only include documents genuinely standard for this process in India; explain where each is obtained; never invent portal URLs or fees; mark truly mandatory items critical=true. Respond with JSON: {"institution": string, "purpose": string, "items": [{"document": string, "why": string, "whereToGet": string, "critical": boolean}], "tips": string[]}`,
    `Institution: ${institution}
Purpose: ${purpose}
Case context: ${legacyCase.scenarioLabel ?? legacyCase.caseType}; holder: ${legacyCase.assetHolderName ?? "unspecified"}; holder living: ${legacyCase.holderLiving ?? "unknown"}; jurisdiction: ${legacyCase.jurisdiction}.
Known assets:
${context || "(none recorded yet)"}`,
    (raw) => {
      const r = raw as Partial<Checklist>;
      if (!r || !Array.isArray(r.items) || r.items.length === 0) return null;
      return {
        institution: String(r.institution ?? institution),
        purpose: String(r.purpose ?? purpose),
        items: r.items.slice(0, 12).map((i) => ({
          document: String(i?.document ?? ""),
          why: String(i?.why ?? ""),
          whereToGet: String(i?.whereToGet ?? ""),
          critical: Boolean(i?.critical),
        })),
        tips: Array.isArray(r.tips) ? r.tips.map(String).slice(0, 5) : [],
      };
    }
  );

  if (!res.ok) {
    return Response.json(
      {
        error: "Checklist generation is temporarily unavailable. The journey tasks already contain the standard document set for this step.",
      },
      { status: 503 }
    );
  }

  await logEvent(
    legacyCase.id,
    "ai",
    `Generated a ${res.data.items.length}-item checklist for ${institution} (${purpose})`,
    "ai"
  );

  return Response.json({ checklist: res.data });
}
