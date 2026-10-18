// The people the demo data is about. They must line up with the backend's demo cases and stay fictional.
import { describe, expect, it } from "vitest";
import { PERSONAS, personaById, personaForDemo } from "@/keeper/personas";
import { DEMO_SCENARIOS } from "@/keeper/demo";

describe("personas", () => {
  it("are three distinct people, each tied to exactly one backend demo case", () => {
    expect(PERSONAS).toHaveLength(3);
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(3);
    expect(PERSONAS.map((p) => p.demoKey).sort()).toEqual(["demo-a", "demo-b", "demo-c"]);
    expect(DEMO_SCENARIOS.map((d) => d.key)).toEqual(PERSONAS.map((p) => p.demoKey));
    expect(personaForDemo("demo-b")?.name).toBe("Sunita Devi");
    expect(personaForDemo("nope")).toBeUndefined();
  });

  it("each has a situation, a goal and things to try, and covers different journeys", () => {
    for (const p of PERSONAS) {
      expect(p.situation.length).toBeGreaterThan(40);
      expect(p.goal.length).toBeGreaterThan(20);
      expect(p.tryThis.length).toBeGreaterThanOrEqual(3);
      expect(p.initials).toBe(p.name.split(" ").map((w) => w[0]).join(""));
    }
    expect(new Set(PERSONAS.map((p) => p.journey))).toEqual(new Set(["claim", "prepare"]));
  });

  it("match the names in the backend demo data, and are not real people", () => {
    expect(personaForDemo("demo-a")!.situation).toMatch(/Rajesh/); // deceased in demo-a
    expect(personaForDemo("demo-b")!.name).toBe("Sunita Devi"); // claimant in demo-b
    expect(personaForDemo("demo-b")!.situation).toMatch(/Mohan Lal/); // deceased in demo-b
    expect(personaForDemo("demo-c")!.city).toBe("Pune"); // demo-c is set in Pune
    for (const p of PERSONAS) expect(JSON.stringify(p)).not.toMatch(/\d{6,}|@[a-z]+\.[a-z]+|—/);
  });

  it("falls back to the first persona for an unknown id", () => {
    expect(personaById("nobody").id).toBe(PERSONAS[0].id);
    expect(personaById(undefined).id).toBe(PERSONAS[0].id);
  });
});
