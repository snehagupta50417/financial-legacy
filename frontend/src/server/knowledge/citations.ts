/** A source shown under an assistant answer; `n` matches the [n] markers in the text. */
export interface AnswerSource {
  n: number;
  kind: "case" | "procedure" | "document";
  title: string;
  publisher: string;
  url: string | null;
  checkedOn: string | null;
  documentId: string | null;
  excerpt: string;
  cited: boolean;
}

/** Keep only citations that point at a real source; return the cleaned answer and the cited numbers. */
export function checkCitations(answer: string, count: number): { answer: string; cited: Set<number> } {
  const cited = new Set<number>();
  const cleaned = answer.replace(/\s?\[(\d+(?:\s*,\s*\d+)*)\]/g, (_m, list: string) => {
    const ok = list
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= count);
    ok.forEach((n) => cited.add(n));
    return ok.length ? ` [${[...new Set(ok)].join(", ")}]` : "";
  });
  return { answer: cleaned.trim(), cited };
}
