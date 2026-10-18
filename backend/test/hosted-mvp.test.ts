// FL-02, FL-10, FL-19, FL-23, FL-45: synthetic fixtures only; provider calls are mocked.
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@server/db";
import { requireSession } from "@server/core/session";
import { checkDeployment } from "@server/core/deployment";
import { makePkce } from "@server/core/supabase-auth";
import { GET as start } from "@api/auth/start/route";
import { GET as callback } from "@api/auth/callback/route";
import { GET as account } from "@api/auth/session/route";
import { DELETE as erase } from "@api/privacy/data/route";
import { GET as searches, POST as record } from "@api/cases/[id]/searches/route";
import { GET as saved, PUT as save } from "@api/cases/[id]/keeper/route";
const userId = "11111111-1111-4111-8111-111111111111";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function req(sid: string, method = "GET", body?: unknown) {
  return new Request("http://localhost/api/test", { method, headers: { "x-session-id": sid, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function fixture(gate = "G1") {
  const sid = "synthetic-mvp-" + crypto.randomUUID();
  await db.session.create({ data: { id: sid } });
  const c = await db.legacyCase.create({ data: { sessionId: sid, caseType: "living_individual", summary: "Synthetic", gateReached: gate } });
  const task = await db.journeyTask.create({ data: { caseId: c.id, title: "Search synthetic official portal", instructions: "Use made-up data", officialName: "Synthetic portal", officialUrl: "https://example.gov.in/search" } });
  return { sid, c, task, ctx: { params: Promise.resolve({ id: c.id }) } };
}
function hosted() {
  vi.stubEnv("AUTH_MODE", "supabase"); vi.stubEnv("SUPABASE_URL", "https://synthetic.supabase.co"); vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "synthetic-public-key"); vi.stubEnv("PUBLIC_APP_URL", "http://localhost:3000");
}
describe("verified hosted identity", () => {
  it("FL-23 rejects browser-ID impersonation and binds a verified account to a stable session", async () => {
    hosted(); const fetcher = vi.fn(async () => Response.json({ id: userId })); vi.stubGlobal("fetch", fetcher);
    expect(await requireSession(req("someone-elses-browser-id"))).toBeNull();
    const request = () => new Request("http://localhost/api/cases", { headers: { authorization: "Bearer synthetic-token", "x-session-id": "ignored-browser-id" } });
    expect((await requireSession(request()))?.id).toBe("supabase:" + userId);
    expect((await requireSession(request()))?.id).toBe("supabase:" + userId);
    expect(fetcher.mock.calls.length).toBe(2);
    expect(await requireSession(new Request("http://localhost/api/cases", { headers: { authorization: "Bearer synthetic-token", "x-keeper-account": "different-account" } }))).toBeNull();
  });
  it("FL-23 rejects cross-origin cookie mutations and invalid provider tokens", async () => {
    hosted(); vi.stubGlobal("fetch", async () => Response.json({}, { status: 401 }));
    expect(await requireSession(new Request("http://localhost/api/cases", { method: "POST", headers: { cookie: "keeper_access=synthetic", origin: "https://untrusted.example" } }))).toBeNull();
    expect(await requireSession(new Request("http://localhost/api/cases", { headers: { authorization: "Bearer invalid" } }))).toBeNull();
  });
  it("FL-23 starts Google PKCE and rejects a callback without matching state", async () => {
    hosted(); const res = await start(new Request("http://localhost/api/auth/start?journey=prepare"));
    const url = new URL(res.headers.get("location")!);
    expect(url.searchParams.get("provider")).toBe("google"); expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
    const bad = await callback(new Request("http://localhost/api/auth/callback?code=synthetic&state=bad"));
    expect(bad.headers.get("location")).toContain("error=auth_failed");
    expect(makePkce().verifier.length).toBeGreaterThanOrEqual(43);
  });
  it("FL-23 exchanges a valid PKCE code and keeps tokens in HttpOnly cookies", async () => {
    hosted(); const beginning = await start(new Request("http://localhost/api/auth/start?journey=prepare"));
    const flowCookie = beginning.headers.get("set-cookie")!.split(";")[0];
    const value = JSON.parse(Buffer.from(flowCookie.split("=")[1], "base64url").toString());
    vi.stubGlobal("fetch", async (url: string) => url.includes("/token?") ? Response.json({ access_token: "synthetic-access", refresh_token: "synthetic-refresh", expires_in: 3600 }) : Response.json({ id: userId }));
    const res = await callback(new Request("http://localhost/api/auth/callback?code=test&state=" + value.state, { headers: { cookie: flowCookie } }));
    expect(res.headers.get("location")).toBe("http://localhost:3000/auth/complete?journey=prepare");
    expect(res.headers.getSetCookie().filter(c => c.includes("synthetic-")).every(c => c.includes("HttpOnly"))).toBe(true);
  });
  it("FL-23 refreshes expired cookie sessions without exposing tokens to JavaScript", async () => {
    hosted(); vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      if (url.includes("grant_type=refresh_token")) return Response.json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 });
      return (init.headers as Record<string, string>).authorization === "Bearer new-access" ? Response.json({ id: userId }) : Response.json({}, { status: 401 });
    });
    const res = await account(new Request("http://localhost/api/auth/session", { headers: { cookie: "keeper_access=expired; keeper_refresh=synthetic" } }));
    expect(res.status).toBe(200); expect(await res.json()).toMatchObject({ authenticated: true, accountId: userId });
    expect(res.headers.getSetCookie().some(c => c.includes("new-access") && c.includes("HttpOnly"))).toBe(true);
  });
  it("FL-45 keeps refresh cookies during a provider outage instead of signing the user out", async () => {
    hosted(); vi.stubGlobal("fetch", async () => Response.json({}, { status: 503 }));
    const response = await account(new Request("http://localhost/api/auth/session", { headers: { cookie: "keeper_access=existing; keeper_refresh=existing" } }));
    expect(response.status).toBe(503);
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });
  it("refuses ephemeral storage in production", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("DATABASE_URL", "file:/tmp/demo.db");
    expect(checkDeployment).toThrow(/PostgreSQL/);
  });
});
describe("dated guided search outcomes", () => {
  it("FL-10 saves scoped history without verifying holdings, with idempotent retry", async () => {
    const f = await fixture(); const body = { requestId: crypto.randomUUID(), sourceUrl: f.task.officialUrl, outcome: "no_match", scope: "Synthetic surname, bank deposits only", searchedAt: new Date().toISOString() };
    expect((await record(req(f.sid, "POST", body), f.ctx)).status).toBe(201);
    expect((await record(req(f.sid, "POST", body), f.ctx)).status).toBe(200);
    expect((await record(req(f.sid, "POST", { ...body, requestId: crypto.randomUUID(), outcome: "partly_checked" }), f.ctx)).status).toBe(201);
    const history = await (await searches(req(f.sid), f.ctx)).json();
    expect(history.results).toHaveLength(2); expect(history.results[0].selfReported).toBe(true);
    expect(await db.assetRecord.count({ where: { caseId: f.c.id } })).toBe(0);
    expect(await db.journeyTask.findUnique({ where: { id: f.task.id } })).toMatchObject({ status: "in_progress", completedAt: null });
  });
  it("FL-10 enforces owner, gates, official source, evidence ownership and request identity", async () => {
    const f = await fixture(); const body = { requestId: crypto.randomUUID(), sourceUrl: f.task.officialUrl, outcome: "possible_match", scope: "Synthetic test", searchedAt: new Date().toISOString() };
    expect((await record(req("foreign-session", "POST", body), f.ctx)).status).toBe(404);
    expect((await record(req(f.sid, "POST", { ...body, sourceUrl: "https://untrusted.example" }), f.ctx)).status).toBe(400);
    expect((await record(req(f.sid, "POST", { ...body, documentId: "foreign-document" }), f.ctx)).status).toBe(404);
    await record(req(f.sid, "POST", body), f.ctx);
    expect((await record(req(f.sid, "POST", { ...body, outcome: "no_match" }), f.ctx)).status).toBe(409);
    const locked = await fixture("G0"); expect((await record(req(locked.sid, "POST", body), locked.ctx)).status).toBe(403);
  });
});
describe("saved conversation and privacy", () => {
  it("FL-02 reloads an owned conversation after reconnecting and rejects foreign access", async () => {
    const f = await fixture(); const ui = { facts: {}, contacts: [], uiTasks: [], plan: [], family: { instructions: "", reviewedAt: null, cadence: null }, activeThread: "thread", threads: [{ id: "thread", title: "Synthetic", journey: null, pending: null, messages: [{ id: "message", role: "keeper", text: "Synthetic saved answer", ts: new Date().toISOString() }] }] };
    expect((await save(req(f.sid, "PUT", ui), f.ctx)).status).toBe(200);
    expect((await (await saved(req(f.sid), f.ctx)).json()).ui.threads[0].messages[0].text).toBe("Synthetic saved answer");
    expect((await saved(req("foreign-session"), f.ctx)).status).toBe(404);
  });
  it("FL-19 preserves shared deceased-person records until their last owning case is removed", async () => {
    const first = await fixture(); const second = await fixture();
    const person = await db.deceasedPerson.create({ data: { name: "Synthetic subject" } });
    await db.legacyCase.updateMany({ where: { id: { in: [first.c.id, second.c.id] } }, data: { deceasedPersonId: person.id } });
    await erase(req(first.sid, "DELETE", { confirmation: "DELETE" }));
    expect(await db.deceasedPerson.findUnique({ where: { id: person.id } })).not.toBeNull();
    await erase(req(second.sid, "DELETE", { confirmation: "DELETE" }));
    expect(await db.deceasedPerson.findUnique({ where: { id: person.id } })).toBeNull();
  });
  it("FL-19 requires confirmation and removes only the current account's records", async () => {
    const f = await fixture(); const other = await fixture();
    await db.intakeMessage.create({ data: { sessionId: f.sid, caseId: f.c.id, role: "user", content: "Synthetic" } });
    await db.consentRecord.create({ data: { sessionId: f.sid, purpose: "ai_processing" } });
    expect((await erase(req(f.sid, "DELETE", { confirmation: "no" }))).status).toBe(400);
    expect((await erase(req(f.sid, "DELETE", { confirmation: "DELETE" }))).status).toBe(200);
    expect(await db.legacyCase.findUnique({ where: { id: f.c.id } })).toBeNull();
    expect(await db.intakeMessage.count({ where: { sessionId: f.sid } })).toBe(0);
    expect(await db.consentRecord.count({ where: { sessionId: f.sid } })).toBe(0);
    expect(await db.legacyCase.findUnique({ where: { id: other.c.id } })).not.toBeNull();
  });
});
