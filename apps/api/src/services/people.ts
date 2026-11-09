import {
  withSpan,
  type AiClient,
  type Logger,
  type ProductMetrics,
  type PeopleMatchQuery,
  type PeopleMatchResponse,
  type PeopleRepository,
} from "@confy/shared";
import { embedQuery } from "./embed-query.js";

export interface PeopleService {
  match(userId: string, query: PeopleMatchQuery): Promise<PeopleMatchResponse>;
}

export function createPeopleService(deps: {
  people: PeopleRepository;
  ai: Pick<AiClient, "embed">;
  logger: Logger;
  metrics?: Pick<ProductMetrics, "recordAiError">;
}): PeopleService {
  return {
    async match(userId, query) {
      return withSpan("confy.people.match", {}, async () => {
        const vector = await embedQuery(deps.ai, deps.logger, query.q, deps.metrics);
        const matches = await deps.people.match({ excludeId: userId, text: query.q, vector, limit: query.limit });
        return { matches };
      });
    },
  };
}
