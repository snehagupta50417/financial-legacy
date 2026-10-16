import { NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * Demo-grade identity: the client generates a stable random session key
 * (stored in localStorage) and sends it as the x-session-id header.
 * Every query in the app is scoped by sessionId, so one visitor can never
 * read or mutate another visitor's cases by guessing IDs.
 *
 * A production deployment would replace this with NextAuth credentials /
 * OAuth; the ownership checks would work identically on a real userId.
 */
export async function requireSession(req: NextRequest) {
  const sessionId = req.headers.get("x-session-id");
  if (!sessionId || sessionId.length < 8 || sessionId.length > 128) {
    return null;
  }
  const session = await db.session.upsert({
    where: { id: sessionId },
    update: {},
    create: { id: sessionId },
  });
  return session;
}

export function unauthorized() {
  return Response.json(
    { error: "Missing or invalid session. Start a new journey from the home page." },
    { status: 401 }
  );
}
