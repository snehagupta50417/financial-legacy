// "Meet Keeper" walk-through: scripted, fictional, and honest. It must teach the loop in order and
// must not say anything the product can't do. PRD FL-01, FL-14; AGENTS.md rule 6.
import { describe, expect, it } from "vitest";
import { STORIES, storyFor } from "@/keeper/tour";

const text = (s: (typeof STORIES)[number]) => JSON.stringify(s.beats);

describe("guided example", () => {
  it("covers all three journeys the product offers", () => {
    expect(STORIES.map((s) => s.journey).sort()).toEqual(["claim", "discover", "prepare"]);
    expect(storyFor("claim")?.title).toMatch(/died/);
    expect(storyFor("nope")).toBeUndefined();
  });

  it("walks the five beats of the loop, in order, one screen each", () => {
    for (const s of STORIES) expect(s.beats.map((b) => b.kind)).toEqual(["user", "understood", "act", "confirm", "close"]);
    for (const s of STORIES) expect(s.beats.map((b) => b.phase)).toEqual(["listening", "thinking", "acting", "confirming", "speaking"]);
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
    }
    for (const s of STORIES) expect(s.beats.at(-1)).toMatchObject({ kind: "close" });
    const close = (s: (typeof STORIES)[number]) => s.beats.at(-1) as Extract<(typeof STORIES)[number]["beats"][number], { kind: "close" }>;
    expect(STORIES.every((s) => close(s).safety.length > 10)).toBe(true);
  });

  it("uses fictional people only, with no real identifiers", () => {
    for (const s of STORIES) expect(text(s)).not.toMatch(/\d{6,}|@[a-z]+\.[a-z]+|[A-Z]{5}\d{4}[A-Z]/);
  });
});
