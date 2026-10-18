import { afterEach, expect, it } from "vitest";
import { POST } from "@api/ai/demo/route";
import { FixtureProvider, setProvider } from "@server/ai";
import { db } from "@server/db";
afterEach(() => setProvider(undefined));
const request = (sid: string) => new Request("http://localhost/api/ai/demo", { method: "POST", headers: { "content-type": "application/json", "x-session-id": sid }, body: JSON.stringify({ utterance: "Can we talk in Hindi?", history: [] }) });
it("requires consent, then permits conversation without a case or executable actions", async () => {
  const sid = "demo-chat-" + crypto.randomUUID();
  await db.session.create({ data: { id: sid } });
  const provider = new FixtureProvider(() => "हाँ, हम हिंदी में बात कर सकते हैं।"); setProvider(provider);
  expect((await POST(request(sid))).status).toBe(403);
  expect(provider.calls).toHaveLength(0);
  await db.consentRecord.create({ data: { sessionId: sid, purpose: "ai_processing", status: "granted" } });
  const response = await POST(request(sid));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ say: "हाँ, हम हिंदी में बात कर सकते हैं।", actions: [], listen: true });
  expect(provider.calls).toHaveLength(1);
});
it("returns a retryable error when the provider fails", async () => {
  const sid = "demo-chat-" + crypto.randomUUID();
  await db.session.create({ data: { id: sid } });
  await db.consentRecord.create({ data: { sessionId: sid, purpose: "ai_processing", status: "granted" } });
  setProvider(new FixtureProvider(() => { throw new Error("private provider detail"); }));
  const response = await POST(request(sid));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private provider detail");
});
