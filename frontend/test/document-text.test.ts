// GET /api/documents/:id — redacted text for side-by-side field review (FL-06), gated like PATCH.
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as loadDemo } from "@/app/api/demo/route";
import { GET as getDocument } from "@/app/api/documents/[id]/route";
import { db } from "@/server/db";

const session = "test-session-doc-text-0001";
const other = "test-session-doc-text-0002";

function req(url: string, sid: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: body ? "POST" : "GET",
    headers: { "x-session-id": sid, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("FL-06 document text for field review", () => {
  it("returns the stored text to the case owner, with identifiers redacted", async () => {
    const res = await loadDemo(req("/api/demo", session, { scenario: "demo-a" }));
    const { caseId } = (await res.json()) as { caseId: string };
    const doc = await db.documentRecord.findFirstOrThrow({ where: { caseId } });

    const r = await getDocument(req(`/api/documents/${doc.id}`, session), params(doc.id));
    expect(r.status).toBe(200);
    const { document } = (await r.json()) as { document: { text: string | null } };
    expect(document.text).toContain("PUNJAB NATIONAL BANK");
    expect(document.text).not.toMatch(/\b\d{6,}\b/); // no long digit runs
  });

  it("is a 404 for another session and a 403 while discovery is locked", async () => {
    const doc = await db.documentRecord.findFirstOrThrow({ where: { case: { sessionId: session } } });
    const foreign = await getDocument(req(`/api/documents/${doc.id}`, other), params(doc.id));
    expect(foreign.status).toBe(404);

    await db.legacyCase.update({ where: { id: doc.caseId }, data: { gateReached: "G1" } });
    const locked = await getDocument(req(`/api/documents/${doc.id}`, session), params(doc.id));
    expect(locked.status).toBe(403);
  });
});
