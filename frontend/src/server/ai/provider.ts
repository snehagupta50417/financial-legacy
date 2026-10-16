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

export interface AiProvider {
  readonly name: string;
  generate(req: GenerateRequest, signal: AbortSignal): Promise<string>;
}
