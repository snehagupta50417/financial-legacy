// The example workspace must show the whole product, with made-up people only. PRD FL-06, FL-07, FL-14, FL-26.
import { describe, expect, it } from "vitest";
import { sampleState } from "@/keeper/sample";
import { claimStep } from "@/keeper/claims";

const s = sampleState();
const estate = s.cases[s.order.find((id) => s.cases[id].kind === "estate")!];
const mine = s.cases[s.order.find((id) => s.cases[id].kind === "self")!];
const all = [estate, mine];

describe("example workspace", () => {
  it("opens on the estate record, where claims, documents and follow-ups are all visible", () => {
    expect(s.activeCase).toBe(estate.id);
    expect(s.session?.mode).toBe("sample");
    expect(s.order).toHaveLength(2);
  });

  it("has holdings at every evidence level the product can honestly show", () => {
    const levels = new Set(all.flatMap((c) => c.assets.map((a) => a.evidence)));
    expect(levels).toEqual(new Set(["self_declared", "potential_match", "document_backed"]));
    expect(new Set(all.flatMap((c) => c.assets.map((a) => a.category))).size).toBeGreaterThanOrEqual(4);
    expect(estate.assets.filter((a) => a.amount).every((a) => /\d/.test(a.amount!.asOf))).toBe(true); // amounts are dated
    expect(all.flatMap((c) => c.assets).some((a) => (a.evidence as string) === "institution_verified")).toBe(false);
  });

  it("shows documents in different states, including one that needs a better copy", () => {
    expect(new Set(estate.docs.map((d) => d.state))).toEqual(new Set(["ready", "unreadable"]));
    expect(estate.docs.some((d) => d.fields.length && d.fields.some((f) => !f.reviewed))).toBe(true); // something left to review
    expect(estate.docs.some((d) => d.fields.length && d.fields.every((f) => f.reviewed))).toBe(true);
  });

  it("shows claims at three different stages, including a settled one and one still missing papers", () => {
    expect(estate.claims).toHaveLength(3);
    const stage = (i: number) => claimStep(estate, estate.claims[i]);
    const outcomes = estate.claims.map((c) => c.outcome?.kind ?? null);
    expect(outcomes.filter(Boolean)).toEqual(["settled"]);
    expect(estate.claims.some((c) => c.submitted && c.acknowledged && !c.outcome)).toBe(true); // with the bank
    expect(estate.claims.some((c) => !c.submitted && !c.prepared)).toBe(true); // still gathering
    expect(new Set([0, 1, 2].map(stage)).size).toBe(3);
    // Nothing was ever sent for the family.
    expect(estate.activity.some((a) => /nothing was sent/i.test(a.text))).toBe(true);
  });

  it("has a timeline spread over weeks, newest first, and a real conversation", () => {
    for (const c of all) {
      const times = c.activity.map((a) => +new Date(a.at));
      expect([...times].sort((x, y) => y - x)).toEqual(times);
      expect(c.threads[0].messages.length).toBeGreaterThanOrEqual(5);
      expect(c.threads[0].messages.some((m) => m.role === "user")).toBe(true);
    }
    expect(+new Date(estate.activity[0].at) - +new Date(estate.activity.at(-1)!.at)).toBeGreaterThan(14 * 864e5);
  });

  it("has a family record, open follow-ups and a discovery plan", () => {
    expect(mine.contacts.length).toBeGreaterThanOrEqual(2);
    expect(mine.contacts.some((k) => k.sees.assets) && mine.contacts.some((k) => !k.sees.assets)).toBe(true);
    expect(mine.family.instructions.length).toBeGreaterThan(20);
    for (const c of all) { expect(c.tasks.some((t) => t.state === "open")).toBe(true); expect(c.plan.length).toBeGreaterThan(0); }
  });

  it("is made up: no real identifiers, no em dash in what Keeper says", () => {
    const text = JSON.stringify(all);
    expect(text).not.toMatch(/\b\d{9,}\b|[A-Z]{5}\d{4}[A-Z]\b|@[a-z]+\.[a-z]+/);
    for (const c of all) for (const m of c.threads[0].messages) if (m.role !== "user") expect(m.text).not.toContain("—");
  });
});
