/**
 * Provider-neutral AI contract. Route handlers and agents depend on this,
 * never on a vendor SDK, so Gemini can be swapped for a fixture in tests.
 */

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AiImage {
  mimeType: string;
  /** base64-encoded bytes */
  data: string;
}

export interface GenerateRequest {
  /** Sent as the model's system instruction, never as a chat turn. */
  system: string;
  /** Conversation; the last turn is the current user message. */
  messages: ChatTurn[];
  /** Images attached to the last user turn (vision extraction). */
  images?: AiImage[];
  /** Ask the model for a single JSON object. */
  json?: boolean;
  temperature?: number;
}

/** "query" for the user's question, "document" for passages being indexed. */
export type EmbedKind = "query" | "document";

export interface AiProvider {
  readonly name: string;
  generate(req: GenerateRequest, signal: AbortSignal): Promise<string>;
  /** Unit-length vectors, one per text, for semantic search. Optional: search falls back to keywords. */
  embed?(texts: string[], kind: EmbedKind, signal: AbortSignal): Promise<number[][]>;
  /** Natural speech for a line of text, as a WAV file. Optional: the browser's own voice is the fallback. */
  speak?(text: string, signal: AbortSignal): Promise<Buffer>;
  /** Identifies the embedding space; stored vectors from another model are recomputed. */
  readonly embeddingModel?: string;
}
