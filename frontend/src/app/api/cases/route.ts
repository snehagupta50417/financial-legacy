import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, unauthorized } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const cases = await db.legacyCase.findMany({
    where: { sessionId: session.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      caseType: true,
      scenarioLabel: true,
      assetHolderName: true,
      summary: true,
      stage: true,
      progress: true,
      nextBestAction: true,
      isDemo: true,
      demoKey: true,
      updatedAt: true,
    },
  });
  return Response.json({ cases });
}
