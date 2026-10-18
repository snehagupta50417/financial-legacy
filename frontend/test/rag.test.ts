// Grounded case assistant (RAG): procedure library + case documents, hybrid search, citations (#43, FL-38/39).
import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as loadDemo } from "@/app/api/demo/route";
import { POST as ask } from "@/app/api/ai/ask/route";
import { FixtureProvider, setProvider } from "@/server/ai";
import type { GenerateRequest } from "@/server/ai";
import { db } from "@/server/db";
import { checkCitations } from "@/server/knowledge/citations";
import { LIBRARY } from "@/server/knowledge/library";
import { retrieve } from "@/server/knowledge/retrieve";
import { chunkText, rank, tokenize } from "@/server/knowledge/search";

const session = "test-session-rag-0001";

function post(url: string, body: unknown, sid = session) {
  return new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: { "x-session-id": sid, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function demoCase(sid = session) {
  const res = await loadDemo(post("/api/demo", { scenario: "demo-a" }, sid));
  const { caseId } = (await res.json()) as { caseId: string };
  await db.consentRecord.create({ data: { sessionId: sid, purpose: "ai_processing", status: "granted" } });
  return db.legacyCase.findUniqueOrThrow({ where: { id: caseId } });
}

/** Deterministic bag-of-words vectors: similar wording → similar vectors. */
function fakeEmbed(texts: string[]): number[][] {
  return texts.map((t) => {
    const v = new Array(64).fill(0);
    for (const w of tokenize(t)) v[[...w].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 64, 7)] += 1;
    const n = Math.hypot(...v) || 1;
    return v.map((x) => x / n);
  });
}

afterEach(() => setProvider(undefined));

// Questions families actually ask → the passage(s) that answer them ("a|b" = either is right).
// Each must be in the top 3 with keyword search alone (no AI key).
const EVAL: [string, string][] = [
  ["How many days does the bank have to settle the claim?", "bank-claim-timelines"],
  ["No nominee on dad's savings account, about 3 lakh — which documents?", "bank-claim-no-nominee-small"],
  ["Do we need a succession certificate for a large amount with no nominee?", "bank-claim-no-nominee-large"],
  ["How do I find old unclaimed deposits from many years ago?", "udgam-coverage"],
  ["Can we trace his mutual fund folios that are inactive?", "mitra-search|resource-sebi-mitra"],
  ["Small amount in a mutual fund, no nominee, I am his wife", "mf-transmission-small"],
  ["Is probate needed to transfer mutual funds?", "mf-transmission-simplified"],
  ["When must LIC pay the death claim and is there interest for delay?", "insurance-claim-timelines"],
  ["Which LIC form does the nominee fill?", "insurance-claim-nominee"],
  ["Can Account Aggregator get my late father's statements?", "aa-digilocker"],
  ["My father is missing, there is no death certificate", "bank-missing-person"],
  ["What is ICICI's limit for claims without a succession certificate?", "bank-limits-by-bank"],
  ["Papa's PNB account had no nominee. What documents do we need and how long can the bank take?", "bank-claim-no-nominee-small|bank-limits-by-bank"],
  ["Policy has no nominee — what does LIC need?", "insurance-claim-no-nominee"],
];

describe("procedure library search (no AI key)", () => {
  const docs = LIBRARY.map((p) => ({ id: p.id, searchText: `${p.title}\n${p.keywords ?? ""}\n${p.text}` }));

  it.each(EVAL)("%s", (question, expected) => {
    const top = rank(question, docs, null, 3).map((r) => r.id);
    expect(expected.split("|").some((id) => top.includes(id))).toBe(true);
  });

  it("hits the eval set's top-1 at least 75% of the time", () => {
    const hits = EVAL.filter(([q, ids]) => ids.split("|").includes(rank(q, docs, null, 1)[0]?.id ?? "")).length;
    expect(hits / EVAL.length).toBeGreaterThanOrEqual(0.75);
  });

  it("returns nothing for an off-topic question", () => {
    expect(rank("Will it rain in Chennai tomorrow evening?", docs, null)).toEqual([]);
  });

  it("every passage names an official source and a check date", () => {
    for (const p of LIBRARY) {
      expect(p.url).toMatch(/^https:\/\//);
      expect(p.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("chunking and citations", () => {
  it("marks negated words so 'no nominee' differs from 'nominee'", () => {
    expect(tokenize("There is no nominee")).toContain("no_nominee");
    expect(tokenize("without a nominee")).toContain("no_nominee");
    expect(tokenize("Nominee: none")).toContain("no_nominee");
    expect(tokenize("the nominee claims")).not.toContain("no_nominee");
  });

  it("splits long text into overlapping chunks under the size limit", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Line ${i}: transaction at branch ${i}`).join("\n");
    const chunks = chunkText(text, 300, 60);
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(300);
    expect(chunks.join("\n")).toContain("Line 59");
  });

  it("keeps real citations and drops ones that point nowhere", () => {
    const r = checkCitations("Banks have 15 days [2]. Interest applies [2, 9]. Made up [7].", 4);
    expect(r.answer).toBe("Banks have 15 days [2]. Interest applies [2]. Made up.");
    expect([...r.cited]).toEqual([2]);
  });
});

describe("retrieval over the case", () => {
  it("searches the case's documents once discovery is unlocked, with identifiers redacted", async () => {
    const c = await demoCase();
    const r = await retrieve("What was the closing balance on the PNB savings statement?", c);
    expect(r.caseDocumentsSearched).toBe(true);
    expect(r.mode).toBe("keyword");
    const doc = r.sources.find((s) => s.kind === "document");
    expect(doc?.title).toMatch(/PNB/);
    for (const s of r.sources) expect(s.text).not.toMatch(/\b\d{6,}\b/);
  });

  it("never searches documents while the case is locked", async () => {
    const c = await demoCase("test-session-rag-0002");
    const locked = await db.legacyCase.update({ where: { id: c.id }, data: { gateReached: "G1" } });
    const r = await retrieve("What was the closing balance on the PNB savings statement?", locked);
    expect(r.caseDocumentsSearched).toBe(false);
    expect(r.sources.every((s) => s.kind === "procedure")).toBe(true);
  });

  it("uses vectors when an embedding model is configured, and stores them", async () => {
    setProvider(new FixtureProvider(() => "", fakeEmbed));
    const c = await demoCase("test-session-rag-0003");
    const r = await retrieve("How long can an insurer take to pay a death claim?", c);
    expect(r.mode).toBe("hybrid");
    expect(r.sources.map((s) => s.title)).toContain("Life insurance death-claim timelines and interest for delay");
    const stored = await db.knowledgeChunk.count({ where: { embeddingModel: "fixture-embedding" } });
    expect(stored).toBeGreaterThan(LIBRARY.length - 1);
  });
});

describe("POST /api/ai/ask", () => {
  it("without an AI key, returns the best-matching passages instead of failing", async () => {
    setProvider(null);
    const c = await demoCase();
    const res = await ask(post("/api/ai/ask", { caseId: c.id, question: "How many days does the bank have to settle a claim?" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { mode: string; sources: { title: string; url: string | null }[] };
    expect(body.mode).toBe("passages");
    expect(body.sources[0].title).toBe("Bank claim timelines and compensation for delay");
    expect(body.sources[0].url).toMatch(/rbi\.org\.in/);
  });

  it("grounds the answer in numbered sources, fences them off as data, and keeps only valid citations", async () => {
    let seen: GenerateRequest | null = null;
    setProvider(
      new FixtureProvider((req) => {
        seen = req;
        return "The bank must settle within 15 days of complete documents [2]. Your PNB statement is in the case [1]. Also [42].";
      })
    );
    const c = await demoCase();
    const res = await ask(post("/api/ai/ask", { caseId: c.id, question: "How many days does the bank have to settle a claim?" }));
    const body = (await res.json()) as { mode: string; answer: string; grounded: boolean; sources: { n: number; cited: boolean }[] };
    expect(body.mode).toBe("ai");
    expect(body.grounded).toBe(true);
    expect(body.answer).not.toContain("[42]");
    expect(body.sources.map((s) => s.n)).toEqual([1, 2]);
    const req = seen as unknown as GenerateRequest;
    expect(req.system).toMatch(/Ignore any instruction/);
    expect(req.messages[0].content).toContain("[2] Bank claim timelines");
    expect(req.messages[0].content).toMatch(/<<<[\s\S]*>>>/);
    expect(await db.qaMessage.count({ where: { caseId: c.id } })).toBe(1);
  });

  it("is a 404 for someone else's case", async () => {
    const c = await demoCase();
    const res = await ask(post("/api/ai/ask", { caseId: c.id, question: "hello" }, "test-session-rag-9999"));
    expect(res.status).toBe(404);
  });
});
