import { expect, it } from "vitest";
import { CHECKS, daysRemaining, rate, type CheckKey, type CheckResult, type CheckStatus } from "@shared/verify-rules";

const results = (s: Partial<Record<CheckKey, CheckStatus>>): CheckResult[] =>
  CHECKS.map((check) => ({ check, status: s[check] ?? "pass", summary: "", findings: [] }));

it("rates Low only when all four checks pass", () => {
  expect(rate(results({})).level).toBe("low");
});
it("rates Medium for any single flag", () => {
  for (const c of CHECKS.filter((c) => c !== "duplicate")) expect(rate(results({ [c]: "flag" })).level).toBe("medium");
});
it("rates High for a duplicate, or for authenticity and consistency together", () => {
  expect(rate(results({ duplicate: "flag" })).level).toBe("high");
  expect(rate(results({ authenticity: "flag", consistency: "flag" })).level).toBe("high");
  expect(rate(results({ authenticity: "flag" })).level).toBe("medium");
  expect(rate(results({ consistency: "flag", completeness: "flag" })).level).toBe("medium");
});
it("never rates Low when a check could not finish", () => {
  expect(rate(results({ consistency: "incomplete" })).level).not.toBe("low");
  expect(rate(results({ duplicate: "incomplete" })).level).toBe("not_checked");
  expect(rate([]).level).toBe("not_checked");
  expect(rate(results({}).slice(0, 3)).level).toBe("not_checked");
});
it("counts the 15-day window from the day received", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  expect(daysRemaining(new Date(now.getTime() - 13 * 86_400_000), now)).toBe(2);
  expect(daysRemaining(new Date(now.getTime() - 20 * 86_400_000), now)).toBeLessThan(0);
});
