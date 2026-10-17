import { db } from "@/server/db";

/** Opt-in is checked before any case text, question, image or document goes to the model. */
export async function hasAiConsent(sessionId: string): Promise<boolean> {
  const consent = await db.consentRecord.findFirst({ where: { sessionId, purpose: "ai_processing" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  return !!consent && consent.status === "granted" && !consent.revokedAt && (!consent.expiresAt || consent.expiresAt > new Date());
}
