// "Meet Keeper" walk-through: scripted, fictional, and honest. It must teach the loop in order and
// must not say anything the product can't do. PRD FL-01, FL-14; AGENTS.md rule 6.
import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/keeper/personas";
import { STORIES, storyFor } from "@/keeper/tour";

const text = (s: (typeof STORIES)[number]) => JSON.stringify(s.beats);

describe("guided example", () => {
  it("tells one story per persona, and each persona has one", () => {
    expect(STORIES.map((s) => s.persona).sort()).toEqual(PERSONAS.map((p) => p.id).sort());
    expect(storyFor("sunita")?.persona).toBe("sunita");
    expect(storyFor("nope")).toBeUndefined();
  });

  it("walks the five beats of the loop, in order, one screen each", () => {
    for (const s of STORIES) expect(s.beats.map((b) => b.kind)).toEqual(["user", "understood", "act", "confirm", "close"]);
    for (const s of STORIES) expect(s.beats.map((b) => b.phase)).toEqual(["listening", "thinking", "acting", "confirming", "speaking"]);
  });

  it("is about its own persona, by name", () => {
    for (const s of STORIES) {
      const p = PERSONAS.find((x) => x.id === s.persona)!;
      const first = p.name.split(" ")[0];
      expect(s.beats[0].label).toBe(`${first} speaks`);
      expect(text(s)).toContain(first);
      for (const other of PERSONAS.filter((x) => x.id !== p.id)) expect(text(s)).not.toContain(other.name.split(" ")[0]);
    }
  });

  it("asks before anything that matters, and gives a real way to say no", () => {
    for (const s of STORIES) {
      const c = s.beats.find((b) => b.kind === "confirm")!;
      if (c.kind !== "confirm") continue;
      expect(c.ask).toMatch(/\?$/);
      expect(c.will.length).toBeGreaterThan(0);
      expect(c.yes.result).toBeTruthy();
      expect(c.no.result).toBeTruthy();
    }
  });

  it("never claims verification, sending, or finding everything", () => {
    for (const s of STORIES) {
      const t = text(s);
      expect(t).not.toMatch(/\bverified by\b|we (sent|submitted|filed)|keeper (sent|submitted|filed)|found everything|all your accounts/i);
      expect(t).not.toContain("—"); // product copy rule: no em dash
      const close = s.beats.at(-1) as Extract<(typeof s.beats)[number], { kind: "close" }>;
      expect(close.kind).toBe("close");
      expect(close.safety.length).toBeGreaterThan(10);
    }
  });

  it("uses fictional people only, with no real identifiers", () => {
    for (const s of STORIES) expect(text(s)).not.toMatch(/\d{6,}|@[a-z]+\.[a-z]+|[A-Z]{5}\d{4}[A-Z]/);
  });
});
