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
import { generateOpeners } from "./opener.js";

export interface PeopleService {
  match(userId: string, query: PeopleMatchQuery): Promise<PeopleMatchResponse>;
}

export function createPeopleService(deps: {
  people: PeopleRepository;
  ai: Pick<AiClient, "embed" | "chatJson">;
  logger: Logger;
  metrics?: Pick<ProductMetrics, "recordAiError">;
}): PeopleService {
  return {
    async match(userId, query) {
      return withSpan("confy.people.match", {}, async () => {
        const vector = await embedQuery(deps.ai, deps.logger, query.q, deps.metrics);
        const [found, me] = await Promise.all([
          deps.people.match({ excludeId: userId, text: query.q, vector, limit: query.limit }),
          deps.people.getProfile(userId).catch((err: unknown) => {
            deps.logger.warn({ err }, "requester profile lookup failed; generating openers without it");
            return null;
          }),
        ]);
        const openers = await generateOpeners(deps.ai, deps.logger, { me, request: query.q, matches: found }, deps.metrics);
        return { matches: found.map((m) => ({ ...m, opener: openers.get(m.id) ?? null })) };
      });
    },
  };
}
