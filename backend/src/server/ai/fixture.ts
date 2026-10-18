import type { AiProvider, EmbedKind, GenerateRequest } from "./provider";

export type FixtureHandler = (req: GenerateRequest) => string | Promise<string>;
export type FixtureEmbedder = (texts: string[], kind: EmbedKind) => number[][] | Promise<number[][]>;

/**
 * Deterministic provider for tests. Each call goes to the handler; throwing
 * from the handler simulates a provider outage.
 */
export class FixtureProvider implements AiProvider {
  readonly name = "fixture";
  readonly calls: GenerateRequest[] = [];

  readonly embeddingModel?: string;
  readonly embed?: (texts: string[], kind: EmbedKind) => Promise<number[][]>;

  constructor(
    private handler: FixtureHandler,
    embedder?: FixtureEmbedder
  ) {
    if (embedder) {
      this.embeddingModel = "fixture-embedding";
      this.embed = async (texts, kind) => embedder(texts, kind);
    }
  }

  async generate(req: GenerateRequest): Promise<string> {
    this.calls.push(req);
    return this.handler(req);
  }
}
