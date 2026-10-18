// Knowing when the person has finished speaking, from loudness alone (the Sarvam recorder).
import { describe, expect, it } from "vitest";
import { LANGUAGE_NAMES, makeEndpointer } from "@/keeper/sarvam-speech";

/** Feed a pattern of readings every 80 ms and return the first non-"continue" verdict with its time. */
function run(readings: number[], opts = {}) {
  const e = makeEndpointer(opts);
  for (let i = 0; i < readings.length; i++) {
    const v = e.push(readings[i], i * 80);
    if (v !== "continue") return { v, at: i * 80, spoke: e.spoke };
  }
  return { v: "continue" as const, at: -1, spoke: e.spoke };
}
const loud = (n: number) => Array(n).fill(0.1);
const quiet = (n: number) => Array(n).fill(0.001);

describe("makeEndpointer", () => {
  it("ends the turn after a pause that follows real speech", () => {
    const r = run([...quiet(3), ...loud(20), ...quiet(30)]);
    expect(r.v).toBe("stop");
    expect(r.spoke).toBe(true);
    // about 1.2 s of silence after the last loud reading (index 22), not sooner
    expect(r.at - 22 * 80).toBeGreaterThanOrEqual(1200);
    expect(r.at - 22 * 80).toBeLessThan(1400);
  });

  it("does not count a short blip as speech", () => {
    const r = run([...quiet(5), ...loud(1), ...quiet(5), ...loud(1), ...quiet(200)]);
    expect(r.v).toBe("no-speech");
    expect(r.spoke).toBe(false);
  });

  it("gives up on a silent room instead of recording forever", () => {
    const r = run(quiet(500));
    expect(r.v).toBe("no-speech");
    expect(r.at).toBeGreaterThanOrEqual(9000);
  });

  it("does not stop while the person keeps talking, and cuts off before the service's limit", () => {
    expect(run(loud(200)).v).toBe("continue"); // 16 s of talking
    const long = run(loud(400)); // would be 32 s
    expect(long.v).toBe("stop");
    expect(long.at).toBeLessThan(25_000 + 80); // within one reading of 25 s
  });

  it("allows a thinking pause shorter than the cutoff", () => {
    expect(run([...loud(10), ...quiet(10), ...loud(10)]).v).toBe("continue"); // 0.8 s pause
  });

  it("can be tuned", () => {
    expect(run([...loud(5), ...quiet(8)], { silenceMs: 400 }).v).toBe("stop");
  });
});

describe("languages", () => {
  it("names every language the backend recognises, in English", () => {
    expect(LANGUAGE_NAMES["hi-IN"]).toBe("Hindi");
    expect(LANGUAGE_NAMES["ta-IN"]).toBe("Tamil");
    expect(Object.keys(LANGUAGE_NAMES)).toHaveLength(11);
  });
});
