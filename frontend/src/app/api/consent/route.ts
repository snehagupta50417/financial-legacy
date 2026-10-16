import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession, unauthorized } from "@/lib/session";
import { logEvent } from "@/lib/case-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const body = await req.json().catch(() => null);
  const purpose = String(body?.purpose ?? "").slice(0, 120);
  const status = body?.status === "revoked" ? "revoked" : "granted";
  if (!purpose) return Response.json({ error: "Purpose required" }, { status: 400 });

  const record = await db.consentRecord.create({
    data: { sessionId: session.id, purpose, status },
  });

  const activeCase = await db.legacyCase.findFirst({
    where: { sessionId: session.id },
    orderBy: { updatedAt: "desc" },
  });
  if (activeCase) {
    await logEvent(
      activeCase.id,
      "consent",
      `Consent ${status}: ${purpose}`,
      "user",
      record.id
    );
  }

  return Response.json({ consent: record });
}

export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  const consents = await db.consentRecord.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return Response.json({ consents });
}
