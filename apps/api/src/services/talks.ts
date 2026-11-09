import {
  withSpan,
  type AiClient,
  type Logger,
  type ProductMetrics,
  type TalkResult,
  type TalkSearchQuery,
  type TalkSearchResponse,
  type TalkSuggestQuery,
  type TalkSuggestResponse,
  type TalksRepository,
} from "@confy/shared";
import { NotFoundError } from "../errors.js";
import type { DemandService } from "./demand.js";
import { embedQuery } from "./embed-query.js";

export interface TalksService {
  search(userId: string, query: TalkSearchQuery): Promise<TalkSearchResponse>;
  suggest(query: TalkSuggestQuery): Promise<TalkSuggestResponse>;
  get(id: string): Promise<TalkResult>;
}

export function createTalksService(deps: {
  talks: TalksRepository;
  ai: Pick<AiClient, "embed">;
  logger: Logger;
  demand: Pick<DemandService, "recordSearchHits">;
  metrics?: Pick<ProductMetrics, "recordAiError">;
}): TalksService {
  /** Only the top results count as "interest" in a talk. */
  const DEMAND_TOP_N = 5;

  return {
    async search(userId, query) {
      return withSpan("confy.talks.search", { "confy.has_query": Boolean(query.q) }, async () => {
        const vector = await embedQuery(deps.ai, deps.logger, query.q, deps.metrics);
        const results = await deps.talks.search({
          text: query.q,
          vector,
          level: query.level,
          track: query.track,
          roomId: query.roomId,
          excludeVendorPitch: query.excludeVendorPitch,
          limit: query.limit,
        });
        // Browsing without a query isn't a demand signal; searching is.
        if (query.q) deps.demand.recordSearchHits(userId, results.slice(0, DEMAND_TOP_N));
        return { results };
      });
    },

    async suggest(query) {
      return { suggestions: await deps.talks.suggest(query.q, query.limit) };
    },

    async get(id) {
      const talk = await deps.talks.get(id);
      if (!talk) throw new NotFoundError(`Talk "${id}" not found`);
      return talk;
    },
  };
}
