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
  /** Models that said their daily/minute quota is used up, and until when: skipped so a turn does not wait on them. */
  private cooling = new Map<string, number>();
  /** Models that rejected a thinking setting, so we stop sending it. */
  private noThinking = new Set<string>();
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

    // A call turn must answer in a second or two, so it skips extended thinking and may use a lighter model
    // (GEMINI_AGENT_MODEL, default gemini-flash-lite-latest), falling back to the usual chain.
    const agentModel = process.env.GEMINI_AGENT_MODEL || "gemini-flash-lite-latest";
    const chain = req.fast ? [agentModel, ...this.models.filter((m) => m !== agentModel)] : this.models;
    let lastError: unknown = new Error("No Gemini model configured");
    const now = Date.now();
    const ready = chain.filter((m) => (this.cooling.get(m) ?? 0) <= now);
    for (const model of ready.length ? ready : chain) {
      let thinkingOff = !!req.fast && !this.noThinking.has(model);
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
              ...(req.fast ? { maxOutputTokens: 700 } : {}),
              ...(thinkingOff ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
              abortSignal: signal,
            },
          });
          return res.text ?? "";
        } catch (e) {
          lastError = e;
          const msg = e instanceof Error ? e.message : String(e);
          // Some models reject a thinking setting (sometimes only as a bare 400): remember it and retry plain.
          if (thinkingOff && /thinking|INVALID_ARGUMENT|"code":\s*400/i.test(msg)) { this.noThinking.add(model); thinkingOff = false; attempt = -1; continue; }
          // Quota used up: don't retry this model, and don't try it again for a few minutes.
          if (/"code":\s*429|RESOURCE_EXHAUSTED/.test(msg)) { this.cooling.set(model, Date.now() + 5 * 60_000); break; }
          const kind = classify(e);
          if (kind === "fatal") throw e;
          if (kind === "next_model") break;
          if (attempt === 0) await sleep(800, signal);
          else if (kind === "retry") this.cooling.set(model, Date.now() + 30_000); // failed twice: rest it briefly
        }
      }
    }
    throw lastError;
  }

  /** Gemini text to speech. Returns raw 24 kHz mono PCM wrapped as WAV so any browser can play it. */
  async speak(text: string, signal: AbortSignal): Promise<Buffer> {
    const res = await this.client.models.generateContent({
      model: process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts",
      contents: [{ role: "user", parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: process.env.GEMINI_TTS_VOICE || "Kore" } } },
        abortSignal: signal,
      },
    });
    const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) throw new Error("No audio returned");
    return pcmToWav(Buffer.from(part.inlineData.data, "base64"), 24000);
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

/** 16-bit little-endian mono PCM to a playable WAV. */
export function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
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
