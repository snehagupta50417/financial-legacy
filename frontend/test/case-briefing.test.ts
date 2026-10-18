import { expect, it } from "vitest";
import { freshState } from "@/keeper/engine";
import { caseBriefing } from "@/keeper/case-briefing";
import type { Claim } from "@/keeper/types";
const fixture = () => { const s = freshState("Synthetic tester", "signin"); return s.cases[s.activeCase]; };
const claim = (id: string, outcome: Claim["outcome"] = null): Claim => ({ id, assetId: "a", claimant: { name: "Synthetic", relation: "child", verification: "sample_reviewed" }, situation: { nominee: "recorded", jointHolder: "none", amountBand: null }, have: {}, declarations: [], approval: null, prepared: false, submitted: null, acknowledged: null, outcome, lastConfirmed: null, nextFollowUp: null });
it("briefs only the active case and counts pending source fields", () => {
  const c = fixture();
  c.docs = [{ id: "source", name: "Synthetic policy", kind: "policy", state: "ready", sample: true, text: "Synthetic", fields: [{ id: "f1", label: "Insurer", value: "LIC", excerpt: "Synthetic LIC", reviewed: false }, { id: "f2", label: "Date", value: "2026", excerpt: "Synthetic", reviewed: true }], addedAt: "2026-10-18" }];
  const b = caseBriefing(c);
  expect(b.unreviewed).toBe(1);
  expect(b.next?.card).toEqual({ type: "doc", id: "source" });
  expect(b.greeting).toContain("Synthetic policy");
  expect(caseBriefing(fixture()).unreviewed).toBe(0);
});
it("keeps partial settlements open and excludes settled or paused follow-ups", () => {
  const c = fixture(); c.claims = [claim("closed", { kind: "settled", at: "2026-10-18", note: "Simulated" }), claim("partial", { kind: "partially_settled", at: "2026-10-18", note: "Simulated" }), claim("paused")];
  c.followUps = { "claim:closed": { enabled: true, nextCheckOn: null, updatedAt: "2026-10-18T00:00:00Z" }, "claim:partial": { enabled: true, nextCheckOn: null, updatedAt: "2026-10-18T00:00:00Z" }, "claim:paused": { enabled: false, nextCheckOn: null, updatedAt: "2026-10-18T00:00:00Z" } };
  const b = caseBriefing(c);
  expect(b.openClaims).toBe(2); expect(b.followUps).toBe(1);
  expect(b.next?.card.id).toBe("partial");
  expect(b.greeting).not.toMatch(/automatically|monitoring|submitted for you/i);
});
it("does not invent activity for an empty case", () => {
  const c = fixture(); c.tasks = []; c.assets = []; c.docs = []; c.claims = [];
  expect(caseBriefing(c).summary).toBe("Your conversation and saved details are here.");
  expect(caseBriefing(c).next).toBeNull();
});
