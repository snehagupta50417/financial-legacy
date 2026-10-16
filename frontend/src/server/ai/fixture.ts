import type { AiProvider, GenerateRequest } from "./provider";

export type FixtureHandler = (req: GenerateRequest) => string | Promise<string>;

/**
 * Deterministic provider for tests. Each call goes to the handler; throwing
 * from the handler simulates a provider outage.
 */
export class FixtureProvider implements AiProvider {
  readonly name = "fixture";
  readonly calls: GenerateRequest[] = [];

  constructor(private handler: FixtureHandler) {}

  async generate(req: GenerateRequest): Promise<string> {
    this.calls.push(req);
    return this.handler(req);
  }
}
