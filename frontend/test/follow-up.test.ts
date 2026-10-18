// FL-02, FL-10: synthetic follow-up preferences never change financial evidence.
import { describe, expect, it } from "vitest";
import { freshState, reduce } from "@/keeper/engine";
import { KeeperUiBody } from "@server/domain/keeper-ui";

describe("official handoff continuity", () => {
  it("saves an explicit opt-in, can pause it, and rejects an unrelated target", () => {
    let state = freshState("Synthetic tester", "sample");
    const c = state.cases[state.activeCase];
    c.plan = [{ id: "synthetic", label: "Synthetic search", type: "guided", state: "completed", note: "Synthetic", result: "No match", url: "https://example.gov.in" }];
    state = reduce(state, { t: "followup.set", target: "search:synthetic", enabled: true, nextCheckOn: "2026-11-20" });
    const saved = state.cases[state.activeCase];
    expect(saved.followUps?.["search:synthetic"].enabled).toBe(true);
    expect(saved.plan[0].result).toBe("No match");
    expect(saved.assets).toEqual(c.assets);
    state = reduce(state, { t: "followup.set", target: "claim:foreign", enabled: true, nextCheckOn: null });
    expect(state.cases[state.activeCase].followUps?.["claim:foreign"]).toBeUndefined();
    state = reduce(state, { t: "followup.set", target: "search:synthetic", enabled: false, nextCheckOn: null });
    expect(state.cases[state.activeCase].followUps?.["search:synthetic"].enabled).toBe(false);
  });
  it("validates saved preferences and rejects impossible dates", () => {
    const state = freshState("Synthetic tester", "sample");
    const c = state.cases[state.activeCase];
    const payload = { ...c, uiTasks: [], followUps: { "search:synthetic": { enabled: true, nextCheckOn: "2026-11-20", updatedAt: new Date().toISOString() } } };
    expect(KeeperUiBody.safeParse(payload).success).toBe(true);
    payload.followUps["search:synthetic"].nextCheckOn = "2026-02-31";
    expect(KeeperUiBody.safeParse(payload).success).toBe(false);
  });
});
