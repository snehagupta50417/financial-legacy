// The example workspaces must show the whole product through one made-up person each. PRD FL-06, FL-07, FL-14, FL-26.
import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/keeper/personas";
import { sampleState } from "@/keeper/sample";
import { claimStep } from "@/keeper/claims";

const world = (id: string) => { const s = sampleState(undefined, id); return { s, c: s.cases[s.activeCase] }; };
const arjun = world("arjun").c;
const sunita = world("sunita").c;
const rahul = world("rahul").c;

describe("example workspaces", () => {
  it("are one person's world each, and say whose", () => {
    for (const p of PERSONAS) {
      const { s, c } = world(p.id);
      expect(s.session).toMatchObject({ mode: "sample", name: p.name, persona: p.id });
      expect(s.order).toEqual([c.id]);
    }
    expect(sampleState().session?.persona).toBe("arjun"); // default
    expect(arjun.name).toBe("Estate of Rajesh Kumar Sharma");
    expect(sunita.name).toBe("Estate of Mohan Lal");
    expect(rahul.kind).toBe("self");
  });

  it("each show holdings in several categories, with honest evidence levels and dated amounts", () => {
    const all = [arjun, sunita, rahul];
    for (const c of all) expect(c.assets.length).toBeGreaterThanOrEqual(3);
    const levels = new Set(all.flatMap((c) => c.assets.map((a) => a.evidence)));
    expect(levels).toEqual(new Set(["self_declared", "potential_match", "document_backed"]));
    expect(new Set(all.flatMap((c) => c.assets.map((a) => a.category))).size).toBeGreaterThanOrEqual(4);
    expect(all.flatMap((c) => c.assets).some((a) => (a.evidence as string) === "institution_verified")).toBe(false);
    for (const c of all) expect(c.assets.filter((a) => a.amount).every((a) => /\d/.test(a.amount!.asOf))).toBe(true);
  });

  it("Arjun: three claims at three stages, one settled, one with the bank, one still missing papers", () => {
    expect(arjun.claims).toHaveLength(3);
    expect(arjun.claims.map((c) => c.outcome?.kind ?? null).filter(Boolean)).toEqual(["settled"]);
    expect(arjun.claims.some((c) => c.submitted && c.acknowledged && !c.outcome)).toBe(true);
    expect(arjun.claims.some((c) => !c.submitted && !c.prepared)).toBe(true);
    expect(new Set(arjun.claims.map((c) => claimStep(arjun, c))).size).toBe(3);
    expect(arjun.docs.map((d) => d.state)).toEqual(expect.arrayContaining(["ready", "unreadable"]));
    expect(arjun.activity.some((a) => /nothing was sent/i.test(a.text))).toBe(true);
  });

  it("Sunita: an LIC claim that has stalled, with an overdue follow-up and a way forward", () => {
    const stalled = sunita.claims.find((c) => c.submitted && c.acknowledged && !c.outcome)!;
    expect(stalled).toBeTruthy();
    expect(stalled.acknowledged!.note).toMatch(/LIC/);
    expect(+new Date(stalled.nextFollowUp!)).toBeLessThan(Date.now()); // overdue
    expect(sunita.tasks.map((t) => t.title).join(" ")).toMatch(/Grievance Officer/);
    expect(sunita.tasks.map((t) => t.title).join(" ")).toMatch(/Bima Bharosa/);
    expect(sunita.docs.map((d) => d.state)).toContain("duplicate");
    expect(sunita.claims.length).toBe(2); // the stalled one and a bank claim still being gathered
  });

  it("Rahul: a family record with who-sees-what, and the gaps he needs to close", () => {
    expect(rahul.claims).toHaveLength(0); // he is organising, not claiming
    expect(rahul.contacts.length).toBe(2);
    expect(rahul.contacts.some((k) => k.sees.documents) && rahul.contacts.some((k) => !k.sees.documents)).toBe(true);
    expect(rahul.family.instructions.length).toBeGreaterThan(40);
    expect(rahul.assets.some((a) => a.institution === "SBI Mutual Fund" && a.nomination === "none")).toBe(true);
    expect(rahul.tasks.map((t) => t.title).join(" ")).toMatch(/nominee/i);
  });

  it("have a timeline over weeks (newest first), open follow-ups, a plan and a real conversation", () => {
    for (const c of [arjun, sunita, rahul]) {
      const times = c.activity.map((a) => +new Date(a.at));
      expect([...times].sort((x, y) => y - x)).toEqual(times);
      expect(+new Date(c.activity[0].at) - +new Date(c.activity.at(-1)!.at)).toBeGreaterThan(7 * 864e5);
      expect(c.tasks.some((t) => t.state === "open")).toBe(true);
      expect(c.plan.length).toBeGreaterThan(0);
      expect(c.threads[0].messages.length).toBeGreaterThanOrEqual(5);
      expect(c.threads[0].messages.some((m) => m.role === "user")).toBe(true);
    }
  });

  it("are made up: no real identifiers and no em dash in what Keeper says", () => {
    for (const c of [arjun, sunita, rahul]) {
      expect(/\b\d{9,}\b|[A-Z]{5}\d{4}[A-Z]\b|@[a-z]+\.[a-z]+/.test(JSON.stringify(c))).toBe(false);
      for (const m of c.threads[0].messages) if (m.role !== "user") expect(m.text).not.toContain("—");
    }
  });
});
