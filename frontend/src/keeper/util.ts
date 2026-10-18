import type { ActivityKind, Case, Fact, FactSource, FactState, Milestone } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);
export const iso = () => new Date().toISOString();

export function logActivity(c: Case, kind: ActivityKind, text: string) {
  c.activity.unshift({ id: uid(), at: iso(), kind, text });
}

export function addTask(c: Case, title: string, milestone: Milestone, why: string, blocker?: string) {
  if (c.tasks.some((t) => t.title === title)) return;
  c.tasks.push({ id: uid(), title, why, milestone, state: "open", blocker });
}

export function setFact(c: Case, key: string, value: string | null, state: FactState, source: FactSource = "You said", note?: string) {
  const f: Fact = { key, value, state, source, date: iso(), ...(note ? { note } : {}) };
  c.facts[key] = f;
}

/** A fact counts as answered when it has a value, or the user said unknown / skipped / not applicable. */
export function isAnswered(c: Case, key: string): boolean {
  const f = c.facts[key];
  return !!f && (f.value !== null || f.state === "unknown" || f.state === "not_provided" || f.state === "not_applicable");
}

/** Only the last four digits of any reference are ever kept. */
export function maskRef(input: string | null | undefined): string | null {
  const digits = (input ?? "").replace(/\D/g, "");
  return digits.length >= 2 ? `••••${digits.slice(-4)}` : null;
}

export const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function formatDay(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  return Number.isNaN(d.getTime()) ? isoDate : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "you" / "your father" → possessive for questions. */
export function poss(c: Case): string {
  if (c.kind === "self") return "your";
  return /^your /.test(c.subject) || /\(sample\)$/.test(c.subject) ? `${c.subject.replace(/ \(sample\)$/, "")}’s` : `${c.subject}’s`;
}
