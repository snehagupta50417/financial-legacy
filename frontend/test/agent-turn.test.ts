// The voice agent's turn is recorded in the thread without changing anything else in the case.
import { describe, expect, it } from "vitest";
import { freshState, reduce } from "@/keeper/engine";

describe("agent.turn in the Keeper engine", () => {
  it("records what was said and the reply in the thread, and changes nothing else", () => {
    const s0 = freshState("Asha", "signin");
    const c0 = s0.cases[s0.activeCase];
    const s1 = reduce(s0, { t: "agent.turn", user: "I think dad had an HDFC account", reply: "I've noted HDFC Bank as something you said.", voice: true, card: { type: "know" } });
    const c1 = s1.cases[s1.activeCase];
    const th = c1.threads.find((t) => t.id === c1.activeThread)!;
    const [u, k] = th.messages.slice(-2);
    expect(u).toMatchObject({ role: "user", voice: true, text: "I think dad had an HDFC account" });
    expect(k).toMatchObject({ role: "keeper", card: { type: "know" } });
    expect(c1.focus).toEqual({ type: "know" });
    expect(c1.assets).toEqual(c0.assets);
    expect(c1.facts).toEqual(c0.facts);
    expect(c1.tasks).toEqual(c0.tasks);
  });
});


it("FL-02 retries saving a turn without duplicating a previously saved exchange", () => {
  const initial = freshState("Synthetic tester", "sample");
  const action = { t: "agent.turn" as const, turnId: "synthetic-retry-id", user: "Synthetic question", reply: "Synthetic answer" };
  const once = reduce(initial, action), twice = reduce(once, action);
  const c = twice.cases[twice.activeCase];
  const messages = c.threads.find(t => t.id === c.activeThread)!.messages;
  expect(messages.filter(m => m.id.startsWith("synthetic-retry-id:"))).toHaveLength(2);
});
