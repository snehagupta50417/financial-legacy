import type { KnowledgeChunk } from "@prisma/client";
import { db } from "@server/db";
import { embeddingModel, embedTexts } from "@server/ai";
import { canDiscover, type GateCase } from "@server/core/gate-engine";
import { redactIdentifiers } from "@server/core/masking";
import { LIBRARY } from "./library";
import { chunkText, rank, sha, type Searchable } from "./search";

/**
 * Retrieval for the case assistant (RAG). Two sources:
 *  - the official procedure library (shared, synced into KnowledgeChunk), and
 *  - the case's own documents — only once the case's discovery gate is reached,
 *    using the same redacted text the family can already open (FL-06).
 * Vectors are filled lazily when an embedding model is configured; without one
 * the search is keyword-only and still works.
 */

export interface RetrievedSource {
  id: string;
  kind: "procedure" | "document";
  title: string;
  /** Who published it (procedures) or the file name (documents). */
  publisher: string;
  url: string | null;
  checkedOn: string | null;
  documentId: string | null;
  text: string;
  score: number;
}

const MAX_EMBED_PER_QUERY = 200;
let librarySync: Promise<void> | null = null;

/** Bump when the stored form of a passage changes, so every row is rewritten. */
const LIBRARY_FORMAT = 2;

function passageHash(p: (typeof LIBRARY)[number]) {
  return sha(JSON.stringify([LIBRARY_FORMAT, p.title, p.authority, p.url, p.checkedOn, p.verification, p.keywords ?? "", p.text]));
}

/** What is stored and shown: the passage, plus a caution when it is not confirmed on an official page. */
function passageText(p: (typeof LIBRARY)[number]) {
  return p.verification === "verified" ? p.text : `${p.text} (Not confirmed on an official page — ${p.verification} source.)`;
}

/** Make the stored library match LIBRARY: replace changed passages, drop removed ones. Once per process. */
export function syncLibrary(): Promise<void> {
  if (!librarySync) {
    librarySync = (async () => {
      const existing = await db.knowledgeChunk.findMany({
        where: { scope: "library" },
        select: { id: true, sourceId: true, contentHash: true },
      });
      const wanted = new Map(LIBRARY.map((p) => [p.id, p]));
      const keep = new Set<string>();
      const stale: string[] = [];
      for (const row of existing) {
        const p = wanted.get(row.sourceId);
        if (p && passageHash(p) === row.contentHash && !keep.has(p.id)) keep.add(p.id);
        else stale.push(row.id);
      }
      if (stale.length) await db.knowledgeChunk.deleteMany({ where: { id: { in: stale } } });
      const missing = LIBRARY.filter((p) => !keep.has(p.id));
      if (missing.length) {
        await db.knowledgeChunk.createMany({
          data: missing.map((p) => ({
            scope: "library",
            sourceId: p.id,
            title: p.title,
            url: p.url,
            checkedOn: p.checkedOn,
            text: passageText(p),
            contentHash: passageHash(p),
          })),
        });
      }
    })().catch((e) => {
      librarySync = null;
      throw e;
    });
  }
  return librarySync;
}

function parseFields(s: string | null): { label: string; value: string }[] {
  try {
    const v = s ? JSON.parse(s) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** The searchable text of one document: summary, extracted fields and the redacted text. */
function documentText(d: { extractionNote: string | null; extractedFields: string | null; rawText: string | null }) {
  const fields = parseFields(d.extractedFields)
    .filter((f) => f?.label && f?.value)
    .map((f) => `${f.label}: ${f.value}`)
    .join("\n");
  return redactIdentifiers(
    [d.extractionNote && `Summary: ${d.extractionNote}`, fields && `Details found:\n${fields}`, d.rawText].filter(Boolean).join("\n\n")
  );
}

/** (Re)chunk any document whose text changed since it was last indexed. */
export async function indexCase(caseId: string): Promise<void> {
  const docs = await db.documentRecord.findMany({
    where: { caseId, extractionStatus: "extracted" },
    select: { id: true, fileName: true, extractionNote: true, extractedFields: true, rawText: true },
  });
  const existing = await db.knowledgeChunk.findMany({
    where: { scope: "case", caseId },
    select: { documentId: true, contentHash: true },
  });
  const indexed = new Map(existing.map((c) => [c.documentId, c.contentHash]));
  const live = new Set(docs.map((d) => d.id));
  const gone = [...indexed.keys()].filter((id): id is string => !!id && !live.has(id));
  if (gone.length) await db.knowledgeChunk.deleteMany({ where: { scope: "case", caseId, documentId: { in: gone } } });

  for (const d of docs) {
    const text = documentText(d);
    const hash = sha(text);
    if (indexed.get(d.id) === hash) continue;
    const parts = chunkText(text);
    await db.$transaction([
      db.knowledgeChunk.deleteMany({ where: { documentId: d.id } }),
      db.knowledgeChunk.createMany({
        data: parts.map((t, i) => ({
          scope: "case",
          caseId,
          documentId: d.id,
          sourceId: d.id,
          ordinal: i,
          title: parts.length > 1 ? `${d.fileName} (part ${i + 1} of ${parts.length})` : d.fileName,
          text: t,
          contentHash: hash,
        })),
      }),
    ]);
  }
}

function vectorOf(row: KnowledgeChunk, model: string | null): number[] | null {
  if (!model || row.embeddingModel !== model || !row.embedding) return null;
  try {
    return JSON.parse(row.embedding) as number[];
  } catch {
    return null;
  }
}

/** Embed rows that have no vector for the current model (bounded per query). */
async function fillEmbeddings(rows: KnowledgeChunk[], model: string): Promise<void> {
  const todo = rows.filter((r) => r.embeddingModel !== model || !r.embedding).slice(0, MAX_EMBED_PER_QUERY);
  if (!todo.length) return;
  const res = await embedTexts(
    todo.map((r) => `${r.title}\n${r.text}`),
    "document"
  );
  if (!res.ok) return; // keyword search still works
  await db.$transaction(
    todo.map((r, i) =>
      db.knowledgeChunk.update({ where: { id: r.id }, data: { embedding: JSON.stringify(res.data[i]), embeddingModel: model } })
    )
  );
  todo.forEach((r, i) => {
    r.embedding = JSON.stringify(res.data[i]);
    r.embeddingModel = model;
  });
}

export interface RetrieveResult {
  sources: RetrievedSource[];
  /** "hybrid" when vectors were used, otherwise "keyword". */
  mode: "hybrid" | "keyword";
  caseDocumentsSearched: boolean;
}

/**
 * Find the passages most relevant to a question. Case documents are searched
 * only when the case may see them (discovery gate reached, not frozen).
 */
export async function retrieve(
  question: string,
  legacyCase: GateCase & { id: string },
  opts: { limit?: number; allowSemantic?: boolean } = {}
): Promise<RetrieveResult> {
  await syncLibrary();
  const withDocs = canDiscover(legacyCase);
  if (withDocs) await indexCase(legacyCase.id);

  const rows = await db.knowledgeChunk.findMany({
    where: withDocs ? { OR: [{ scope: "library" }, { scope: "case", caseId: legacyCase.id }] } : { scope: "library" },
  });

  const model = opts.allowSemantic === false ? null : embeddingModel();
  let queryVector: number[] | null = null;
  if (model) {
    const [q] = await Promise.all([embedTexts([question], "query"), fillEmbeddings(rows, model)]);
    if (q.ok) queryVector = q.data[0] ?? null;
  }

  const passages = new Map(LIBRARY.map((p) => [p.id, p]));
  const docs: Searchable[] = rows.map((r) => ({
    id: r.id,
    searchText: `${r.title}\n${passages.get(r.sourceId)?.keywords ?? ""}\n${r.text}`,
    vector: vectorOf(r, model),
  }));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ranked = rank(question, docs, queryVector, opts.limit ?? 6);

  return {
    mode: queryVector ? "hybrid" : "keyword",
    caseDocumentsSearched: withDocs,
    sources: ranked.map((r) => {
      const row = byId.get(r.id)!;
      const lib = row.scope === "library" ? passages.get(row.sourceId) : undefined;
      return {
        id: row.id,
        kind: row.scope === "library" ? "procedure" : "document",
        title: row.title,
        publisher: lib?.authority ?? "Your uploaded document",
        url: row.url,
        checkedOn: row.checkedOn,
        documentId: row.documentId,
        // Redact again on the way out, as the document text route does.
        text: row.scope === "case" ? redactIdentifiers(row.text) : row.text,
        score: Math.round(r.score * 10000) / 10000,
      };
    }),
  };
}
