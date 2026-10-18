import { createHash } from "node:crypto";

/**
 * Pure retrieval helpers for the case assistant: chunking, keyword ranking
 * (BM25), vector ranking (cosine) and reciprocal-rank fusion. Keyword search
 * always works; vectors are added when an embedding model is configured.
 */

export function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

const STOP = new Set(
  "a an and are as at be by can do does for from has have how i if in is it its me my of on or our so that the their them then there these they this to was we were what when where which who why will with would you your about after any been but could did get got into just need not now only should than too very".split(
    " "
  )
);

// Short forms people type → the words the sources use.
const EXPAND: Record<string, string> = {
  fd: "fixed deposit",
  mf: "mutual fund",
  mfs: "mutual fund",
  lic: "life insurance corporation lic",
  sbi: "state bank sbi",
  pnb: "punjab national bank pnb",
  rbi: "reserve bank rbi",
  heir: "legal heir",
  heirs: "legal heir",
  nominee: "nominee nomination",
  dead: "death deceased",
  died: "death deceased",
  passed: "death deceased",
  demat: "demat shares",
  days: "days timeline",
  long: "timeline days",
};

function stem(t: string): string {
  if (/^\d/.test(t)) return t;
  if (t.length > 5 && t.endsWith("ies")) return `${t.slice(0, -3)}y`;
  if (t.length > 5 && t.endsWith("ing")) return t.slice(0, -3);
  if (t.length > 4 && t.endsWith("ed")) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

const NEGATORS = new Set(["no", "without", "not", "never", "nil", "none"]);
const FILLER = new Set(["a", "an", "any", "the", "is", "was", "has", "had", "been"]);

export function tokenize(text: string, opts: { expand?: boolean } = {}): string[] {
  const raw = text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const words = opts.expand ? raw.flatMap((w) => (EXPAND[w] ? EXPAND[w].split(" ") : [w])) : raw;
  const out = words.filter((w) => (w.length > 1 || /\d/.test(w)) && !STOP.has(w)).map(stem);
  // "no nominee", "without a nominee", "nominee: none" → also a "no_nominee" token, so the
  // passage for the opposite situation does not win on the shared word alone.
  for (let i = 0; i < words.length; i++) {
    if (!NEGATORS.has(words[i])) continue;
    let j = i + 1;
    while (j < words.length && FILLER.has(words[j])) j++;
    if (j < words.length && !STOP.has(words[j])) out.push(`no_${stem(words[j])}`);
    if (i > 0 && (words[i] === "none" || words[i] === "nil")) out.push(`no_${stem(words[i - 1])}`);
  }
  return out;
}

/** Split long text into ~maxChars chunks on line breaks, with a little overlap for context. */
export function chunkText(text: string, maxChars = 700, overlap = 120): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];
  const lines = clean.split("\n");
  const chunks: string[] = [];
  let cur = "";
  for (const line of lines) {
    const pieces = line.length > maxChars ? line.match(new RegExp(`.{1,${maxChars}}(\\s|$)`, "g")) ?? [line] : [line];
    for (const piece of pieces) {
      if (cur && cur.length + piece.length + 1 > maxChars) {
        chunks.push(cur.trim());
        cur = cur.slice(-overlap).replace(/^\S*\s/, "");
      }
      cur += (cur ? "\n" : "") + piece;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

export interface Searchable {
  id: string;
  /** What keyword search looks at (title + keywords + text). */
  searchText: string;
  vector?: number[] | null;
}

/** BM25 scores (k1 = 1.2, b = 0.75) for each doc against the query; 0 when no term matches. */
export function bm25(query: string, docs: Searchable[]): Map<string, number> {
  const q = [...new Set(tokenize(query, { expand: true }))];
  const toks = docs.map((d) => tokenize(d.searchText));
  const avg = toks.reduce((n, t) => n + t.length, 0) / Math.max(1, toks.length);
  const df = new Map<string, number>();
  for (const t of toks) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1);
  const N = docs.length;
  const scores = new Map<string, number>();
  docs.forEach((d, i) => {
    const tf = new Map<string, number>();
    for (const w of toks[i]) tf.set(w, (tf.get(w) ?? 0) + 1);
    let s = 0;
    for (const w of q) {
      const f = tf.get(w);
      if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(w) ?? 0) + 0.5) / ((df.get(w) ?? 0) + 0.5));
      // A negation ("no nominee") decides which procedure applies, so it counts double.
      const weight = w.startsWith("no_") ? 2 : 1;
      s += weight * idf * ((f * 2.2) / (f + 1.2 * (0.25 + (0.75 * toks[i].length) / avg)));
    }
    scores.set(d.id, s);
  });
  return scores;
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are unit length
}

export interface Ranked {
  id: string;
  score: number;
  keyword: number;
  semantic: number | null;
}

/** Below this cosine a vector-only hit is treated as unrelated. */
export const MIN_SEMANTIC = 0.55;

/**
 * Hybrid ranking: BM25 and cosine lists merged by reciprocal-rank fusion
 * (k = 60). A result must match at least one query word, or be semantically
 * close, to be returned at all — so an off-topic question returns nothing.
 */
export function rank(query: string, docs: Searchable[], queryVector: number[] | null, limit = 6): Ranked[] {
  const kw = bm25(query, docs);
  const sem = new Map<string, number>();
  if (queryVector) for (const d of docs) if (d.vector?.length) sem.set(d.id, cosine(queryVector, d.vector));

  const rrf = new Map<string, number>();
  const add = (ids: string[]) => ids.forEach((id, i) => rrf.set(id, (rrf.get(id) ?? 0) + 1 / (60 + i + 1)));
  add(docs.filter((d) => (kw.get(d.id) ?? 0) > 0).sort((a, b) => kw.get(b.id)! - kw.get(a.id)!).map((d) => d.id));
  add(docs.filter((d) => (sem.get(d.id) ?? 0) >= MIN_SEMANTIC).sort((a, b) => sem.get(b.id)! - sem.get(a.id)!).map((d) => d.id));

  return [...rrf.entries()]
    .map(([id, score]) => ({ id, score, keyword: kw.get(id) ?? 0, semantic: sem.has(id) ? sem.get(id)! : null }))
    .sort((a, b) => b.score - a.score || b.keyword - a.keyword)
    .slice(0, limit);
}
