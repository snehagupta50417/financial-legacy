import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as demo } from "@/app/api/demo/route";
import { POST as intake } from "@/app/api/intake/route";
import { GET as cases } from "@/app/api/cases/route";
import { GET as workspace } from "@/app/api/cases/[id]/route";
import { GET as getUi, PUT as putUi } from "@/app/api/cases/[id]/keeper/route";
import { GET as document } from "@/app/api/documents/[id]/route";
import { GET as messages } from "@/app/api/cases/[id]/messages/route";
import { PATCH as asset } from "@/app/api/assets/[id]/route";
import { backendAction, hydrateBackend } from "@/keeper/backend";
import { freshState } from "@/keeper/engine";
import { db } from "@/server/db";

const sid = "keeper-existing-ui-adapter-test";
const params = (id: string) => ({ params: Promise.resolve({ id }) });
function request(url: string, init?: RequestInit) { const headers = new Headers(init?.headers); headers.set("x-session-id", sid); return new NextRequest("http://localhost" + url, { method: init?.method, body: init?.body, headers }); }
afterEach(() => vi.unstubAllGlobals());

function installBrowser() {
  const values = new Map([["finlegacy_session", sid]]);
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value) } });
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const req = request(url, init);
    if (url === "/api/cases") return cases(req);
    if (url === "/api/intake") return intake(req);
    const id = url.split("/")[3];
    if (url.endsWith("/keeper")) return init?.method === "PUT" ? putUi(req, params(id)) : getUi(req, params(id));
    if (url.endsWith("/messages")) return messages(req, params(id));
    if (url.startsWith("/api/documents/")) return document(req, params(id));
    if (url.startsWith("/api/assets/")) return asset(req, params(id));
    if (url.startsWith("/api/cases/")) return workspace(req, params(id));
    throw new Error("Unexpected URL " + url);
  });
}

describe("FL-06 / FL-07 / FL-27 existing Keeper UI backend bridge", () => {
  it("hydrates the existing Case shape, saves family drafts, and confirms holdings on the server", async () => {
    const seeded = await demo(request("/api/demo", { method: "POST", body: JSON.stringify({ scenario: "demo-a" }) }));
    const { caseId } = await seeded.json();
    installBrowser();
    let state = await hydrateBackend(freshState("Synthetic tester", "signin"));
    let c = state.cases[caseId];
    expect(c.backendId).toBe(caseId);
    expect(c.assets.length).toBeGreaterThan(0);
    expect(c.docs[0].text.length).toBeGreaterThan(0);
    expect(c.threads[0].messages.length).toBeGreaterThan(0);
    state = await backendAction(state, { t: "family.set", instructions: "Synthetic folder in the study" });
    const resumed = await hydrateBackend(freshState("Synthetic tester", "signin"));
    expect(resumed.cases[caseId].family.instructions).toBe("Synthetic folder in the study");
    const holding = c.assets[0];
    state = await backendAction(state, { t: "asset.confirm", id: holding.id });
    c = state.cases[caseId];
    expect(c.assets.find(a => a.id === holding.id)?.confirmed).toBe(true);
    expect((await db.assetRecord.findUniqueOrThrow({ where: { id: holding.id } })).discoveryStatus).toBe("confirmed");
  });

  it("retains gate enforcement: hiding records and rejecting writes below discovery", async () => {
    const c = await db.legacyCase.findFirstOrThrow({ where: { sessionId: sid } });
    await db.legacyCase.update({ where: { id: c.id }, data: { gateReached: "G0" } });
    installBrowser();
    const state = await hydrateBackend(freshState("Synthetic tester", "signin"));
    expect(state.cases[c.id].assets).toEqual([]);
    expect(state.cases[c.id].docs).toEqual([]);
    const old = await db.assetRecord.findFirstOrThrow({ where: { caseId: c.id } });
    await expect(backendAction(state, { t: "asset.confirm", id: old.id })).rejects.toThrow();
  });

  it("UI draft metadata is owner-scoped and cannot grant gates or evidence", async () => {
    const c = await db.legacyCase.findFirstOrThrow({ where: { sessionId: sid } });
    const res = await getUi(new NextRequest("http://localhost/api/test", { headers: { "x-session-id": "unrelated-ui-owner-session" } }), params(c.id));
    expect(res.status).toBe(404);
    const invalid = await putUi(request("/api/test", { method: "PUT", body: JSON.stringify({ gateReached: "G4", assets: [] }) }), params(c.id));
    expect(invalid.status).toBe(400);
    expect((await db.legacyCase.findUniqueOrThrow({ where: { id: c.id } })).gateReached).toBe("G0");
  });
  it("persists unanswered context, resumes without repeated questions, and rejects a foreign attachment", async () => {
    installBrowser();
    let state = await backendAction(freshState("Asha", "signin"), { t: "send", text: "I want to prepare for my family. My documents are in the blue folder." });
    const id = state.activeCase;
    expect((await db.legacyCase.findUniqueOrThrow({ where: { id } })).caseType).toBe("estate_planning");
    expect(state.cases[id].facts.docs_where.value).toContain("blue folder");
    expect(state.cases[id].assets).toHaveLength(0);
    state = await backendAction(state, { t: "choose", id: "m:unknown", label: "I don’t know" });
    state = await hydrateBackend(state);
    expect(state.cases[id].facts.known.state).toBe("unknown");
    const thread = state.cases[id].threads.find(t => t.id === state.cases[id].activeThread)!;
    expect(thread.pending).not.toBe("known");
    const followUp = state.cases[id].uiTasks?.find(t => t.title.startsWith("Find out:"));
    expect(followUp).toBeDefined();
    const count = thread.messages.length;
    state = await backendAction(state, { t: "task.toggle", id: followUp!.id });
    expect(state.cases[id].threads.find(t => t.id === thread.id)!.messages).toHaveLength(count);
    await expect(backendAction(state, { t: "doc.upload", file: new File(["No personal data"], "check.txt"), threadId: "another-case-thread" })).rejects.toThrow("original conversation");
  });

});
