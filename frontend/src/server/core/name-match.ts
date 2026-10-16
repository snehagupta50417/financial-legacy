/**
 * Transliteration-aware fuzzy name matching for Indian names.
 *
 *   "Rajesh Kumar Sharma" ≈ "R. K. Sharma" ≈ "Late Shri Rajesh K Sharmaa"
 *
 * Outcomes are deliberately conservative: a confident match passes; anything
 * else is "review" (a human looks at it). Nothing is ever auto-rejected on a
 * name mismatch (plan §3).
 */

export type NameMatch = { outcome: "match" | "review"; score: number; reason: string };

const HONORIFICS = new Set([
  "late", "shri", "sri", "shree", "smt", "smt.", "kumari", "km", "mr", "mrs", "ms", "miss", "dr", "prof",
  "sh", "s/o", "d/o", "w/o", "ji",
]);

/** Fold common romanisation variants onto one spelling. */
export function phonetic(token: string): string {
  let t = token.toLowerCase().replace(/[^a-z]/g, "");
  t = t
    .replace(/ph/g, "f")
    .replace(/(k|g|c|j|t|d|b|s)h/g, "$1")
    .replace(/w/g, "v")
    .replace(/z/g, "j")
    .replace(/q/g, "k")
    .replace(/ee|ii|ie/g, "i")
    .replace(/oo|uu|ou/g, "u")
    .replace(/aa/g, "a")
    .replace(/y$/g, "i")
    .replace(/(.)\1+/g, "$1");
  if (t.length > 3) t = t.replace(/a$/, ""); // Ramesha → Ramesh, Sharmaa → Sharm(a)
  return t;
}

/** Common written abbreviations of given names. */
const ABBREVIATIONS: Record<string, string> = {
  mohd: "mohammad",
  md: "mohammad",
  mohammed: "mohammad",
  muhammad: "mohammad",
  mohamed: "mohammad",
  mohamad: "mohammad",
};

export function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[.,()]/g, " ")
    .split(/[\s\-_/]+/)
    .filter((t) => t && !HONORIFICS.has(t))
    .map((t) => ABBREVIATIONS[t] ?? t);
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

function similar(a: string, b: string): number {
  const pa = phonetic(a);
  const pb = phonetic(b);
  if (!pa || !pb) return 0;
  if (pa === pb) return 1;
  return 1 - levenshtein(pa, pb) / Math.max(pa.length, pb.length);
}

const isInitial = (t: string) => t.replace(/[^a-z]/g, "").length === 1;

export function matchNames(expected: string, found: string): NameMatch {
  const a = tokens(expected);
  const b = tokens(found);
  if (!a.length || !b.length) return { outcome: "review", score: 0, reason: "Name missing on one side" };

  // Surname (last token) must agree strongly.
  const surname = similar(a[a.length - 1], b[b.length - 1]);
  if (surname < 0.8) {
    return { outcome: "review", score: round(surname / 2), reason: "Surname differs" };
  }

  // Given names: align in order; an initial matches any name with that first letter.
  const ga = a.slice(0, -1);
  const gb = b.slice(0, -1);
  if (!ga.length || !gb.length) {
    return { outcome: "review", score: round(0.6 * surname), reason: "Only a surname to compare" };
  }
  const [short, long] = ga.length <= gb.length ? [ga, gb] : [gb, ga];
  let j = 0;
  let total = 0;
  for (const t of short) {
    let best = 0;
    let bestIdx = -1;
    for (let k = j; k < long.length; k++) {
      const s =
        isInitial(t) || isInitial(long[k])
          ? t[0] === long[k][0] ? 0.95 : 0
          : similar(t, long[k]);
      if (s > best) {
        best = s;
        bestIdx = k;
      }
    }
    if (bestIdx === -1 || best < 0.75) {
      return { outcome: "review", score: round((total + best) / (short.length + 1)), reason: `Given name "${t}" not found` };
    }
    total += best;
    j = bestIdx + 1;
  }
  const score = round((total / short.length) * 0.6 + surname * 0.4);
  return score >= 0.85
    ? { outcome: "match", score, reason: "Names match" }
    : { outcome: "review", score, reason: "Names are similar but not a confident match" };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
