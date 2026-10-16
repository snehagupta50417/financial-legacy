import { GoogleGenAI, type Content } from "@google/genai";
import type { AiProvider, GenerateRequest } from "./provider";

/**
 * Gemini adapter. Auth, in order:
 *  - GEMINI_API_KEY (AI Studio key)
 *  - Vertex AI via GOOGLE_CLOUD_PROJECT (+ GOOGLE_CLOUD_LOCATION) and the
 *    Cloud Run service account (Application Default Credentials).
 */
export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  private client: GoogleGenAI;
  private model: string;

  constructor(opts: { apiKey?: string; project?: string; location?: string; model: string }) {
    this.model = opts.model;
    this.client = opts.apiKey
      ? new GoogleGenAI({ apiKey: opts.apiKey })
      : new GoogleGenAI({ vertexai: true, project: opts.project, location: opts.location ?? "us-central1" });
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

    const res = await this.client.models.generateContent({
      model: this.model,
      contents,
      config: {
        systemInstruction: req.system,
        ...(req.json ? { responseMimeType: "application/json" } : {}),
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        abortSignal: signal,
      },
    });
    return res.text ?? "";
  }
}
