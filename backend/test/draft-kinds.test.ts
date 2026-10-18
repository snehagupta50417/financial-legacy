// The AI never drafts a will (PRD; DESIGN §7.1) — "Notes for your lawyer" replaces it.
import { describe, expect, it } from "vitest";
import { POST as loadDemo } from "@api/demo/route";
import { POST as draft } from "@api/ai/draft/route";

const sid = "test-session-draft-kinds-0001";
const post = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, { method: "POST", headers: { "x-session-id": sid, "content-type": "application/json" }, body: JSON.stringify(body) });

describe("draft kinds", () => {
  it("refuses to draft a will", async () => {
    const { caseId } = (await (await loadDemo(post("/api/demo", { scenario: "demo-c" }))).json()) as { caseId: string };
    const res = await draft(post("/api/ai/draft", { caseId, kind: "will" }));
    expect(res.status).toBe(400);
  });

  it("accepts lawyer_notes (503 without a model key, never 400)", async () => {
    const { caseId } = (await (await loadDemo(post("/api/demo", { scenario: "demo-c" }))).json()) as { caseId: string };
    const res = await draft(post("/api/ai/draft", { caseId, kind: "lawyer_notes", context: "Equal shares" }));
    expect([200, 503]).toContain(res.status);
  });
});
