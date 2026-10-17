import { GoogleGenAI, type Content } from "@google/genai";
import type { AiProvider, EmbedKind, GenerateRequest } from "./provider";

/**
 * Gemini adapter. Auth, in order:
 *  - GEMINI_API_KEY (AI Studio key)
 *  - Vertex AI via GOOGLE_CLOUD_PROJECT (+ GOOGLE_CLOUD_LOCATION) and the
 *    Cloud Run service account (Application Default Credentials).
 *
 * Resilience: transient errors (503 overloaded, 429, 500) are retried once
 * with backoff, then the next model in the chain is tried. A retired model
 * (404) skips straight to the next one. The caller's AbortSignal bounds the
 * whole chain.
 */
export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  private client: GoogleGenAI;
  private models: string[];

  readonly embeddingModel: string;
  private embedDims: number;

  constructor(opts: {
    apiKey?: string;
    project?: string;
    location?: string;
    models: string[];
    embeddingModel?: string;
    embeddingDims?: number;
  }) {
    this.models = opts.models.length ? opts.models : ["gemini-flash-latest"];
    this.embedDims = opts.embeddingDims ?? 768;
    this.embeddingModel = `${opts.embeddingModel ?? "gemini-embedding-001"}@${this.embedDims}`;
    this.client = opts.apiKey
      ? new GoogleGenAI({ apiKey: opts.apiKey })
      : new GoogleGenAI({ vertexai: true, project: opts.project, location: opts.location ?? "asia-south1" });
  }

  async generate(req: GenerateRequest, signal: AbortSignal): Promise<string> {
    const contents: Content[] = req.messages.map((m, i) => {
      const isLast = i === req.messages.length - 1;
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [
          ...(isLast && req.images?.length
            ? req.images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } }))
            : []),
          { text: m.content },
        ],
      };
    });

    let lastError: unknown = new Error("No Gemini model configured");
    for (const model of this.models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (signal.aborted) throw lastError;
        try {
          const res = await this.client.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: req.system,
              ...(req.json ? { responseMimeType: "application/json" } : {}),
              ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
              abortSignal: signal,
            },
          });
          return res.text ?? "";
        } catch (e) {
          lastError = e;
          const kind = classify(e);
          if (kind === "fatal") throw e;
          if (kind === "next_model") break;
          if (attempt === 0) await sleep(800, signal);
        }
      }
    }
    throw lastError;
  }

  /** Batches of 100; vectors are normalised (needed below the model's full 3072 dimensions). */
  async embed(texts: string[], kind: EmbedKind, signal: AbortSignal): Promise<number[][]> {
    const model = this.embeddingModel.split("@")[0];
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 100) {
      const batch = texts.slice(i, i + 100);
      let res;
      for (let attempt = 0; ; attempt++) {
        try {
          res = await this.client.models.embedContent({
            model,
            contents: batch,
            config: {
              taskType: kind === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
              outputDimensionality: this.embedDims,
              abortSignal: signal,
            },
          });
          break;
        } catch (e) {
          if (attempt > 0 || classify(e) !== "retry" || signal.aborted) throw e;
          await sleep(800, signal);
        }
      }
      const vecs = res.embeddings ?? [];
      if (vecs.length !== batch.length) throw new Error("Embedding count mismatch");
      for (const v of vecs) out.push(normalise(v.values ?? []));
    }
    return out;
  }
}

function normalise(v: number[]): number[] {
  const n = Math.hypot(...v);
  return n > 0 ? v.map((x) => x / n) : v;
}

/** Decide what to do with a Gemini error: retry, try the next model, or give up. */
export function classify(e: unknown): "retry" | "next_model" | "fatal" {
  const msg = e instanceof Error ? e.message : String(e);
  if (/"code":\s*404|NOT_FOUND|no longer available/i.test(msg)) return "next_model";
  if (/"code":\s*(429|500|502|503|504)|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand|INTERNAL/i.test(msg))
    return "retry";
  return "fatal";
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });
}
