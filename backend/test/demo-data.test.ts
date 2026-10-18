// Demo cases can be added and removed by their owner; real cases can never be deleted through the API.
// PRD FL-01, FL-18 (own data only); synthetic data only (AGENTS.md rule 3).
import { describe, expect, it } from "vitest";
import { POST as seed } from "@api/demo/route";
import { DELETE as remove, GET as workspace } from "@api/cases/[id]/route";
import { db } from "@server/db";
import { DEMO_CASES } from "@server/data/demo-data";

const owner = "demo-data-owner-session";
const post = (sid: string, body: unknown) => new Request("http://localhost/api/demo", { method: "POST", headers: { "x-session-id": sid, "content-type": "application/json" }, body: JSON.stringify(body) });
const call = (sid: string, method = "GET") => new Request("http://localhost/api/cases/x", { method, headers: { "x-session-id": sid } });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("demo data", () => {
  it("offers three scenarios and loads each one with holdings, documents and steps", async () => {
    expect(DEMO_CASES.map((d) => d.demoKey)).toEqual(["demo-a", "demo-b", "demo-c"]);
    for (const d of DEMO_CASES) {
      const res = await seed(post(owner, { scenario: d.demoKey }));
      expect(res.status).toBe(200);
      const { caseId } = (await res.json()) as { caseId: string };
      const ws = (await (await workspace(call(owner), params(caseId))).json()) as { case: { isDemo: boolean }; assets: unknown[]; documents: unknown[]; tasks: unknown[] };
      expect(ws.case.isDemo).toBe(true);
      expect(ws.assets.length).toBeGreaterThan(0);
      expect(ws.documents.length).toBeGreaterThan(0);
      expect(ws.tasks.length).toBeGreaterThan(0);
    }
  });

  it("is clearly synthetic: people are made up and nothing real is identified", () => {
    for (const d of DEMO_CASES) {
      const text = JSON.stringify(d);
      // Masked references (XXXX...) are fine; an unmasked 12-digit number, a real-looking PAN or an email is not.
      expect(/\b\d{12}\b|\b(?!X{5})[A-Z]{5}\d{4}[A-Z]\b|@[a-z]+\.[a-z]+/.test(text)).toBe(false);
    }
  });

  it("lets the owner remove a demo case, with everything under it", async () => {
    const { caseId } = (await (await seed(post(owner, { scenario: "demo-a" }))).json()) as { caseId: string };
    expect((await remove(call(owner, "DELETE"), params(caseId))).status).toBe(200);
    expect(await db.legacyCase.findUnique({ where: { id: caseId } })).toBeNull();
    expect(await db.assetRecord.count({ where: { caseId } })).toBe(0);
  });

  it("refuses to delete a real case, or someone else's", async () => {
    await db.session.upsert({ where: { id: owner }, create: { id: owner }, update: {} });
    const real = await db.legacyCase.create({ data: { sessionId: owner, caseType: "living_individual", summary: "Synthetic real-looking case" } });
    expect((await remove(call(owner, "DELETE"), params(real.id))).status).toBe(403);
    expect(await db.legacyCase.findUnique({ where: { id: real.id } })).not.toBeNull();
    const { caseId } = (await (await seed(post(owner, { scenario: "demo-b" }))).json()) as { caseId: string };
    expect((await remove(call("someone-else-session"), params(caseId))).status).toBe(404);
    expect((await remove(call(""), params(caseId))).status).toBe(401);
  });

  it("re-adding a scenario replaces the earlier copy instead of piling up", async () => {
    await seed(post(owner, { scenario: "demo-c" }));
    await seed(post(owner, { scenario: "demo-c" }));
    expect(await db.legacyCase.count({ where: { sessionId: owner, demoKey: "demo-c" } })).toBe(1);
  });
});
