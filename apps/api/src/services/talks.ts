import {
  withSpan,
  type AiClient,
  type Logger,
  type TalkResult,
  type TalkSearchQuery,
  type TalkSearchResponse,
  type TalkSuggestQuery,
  type TalkSuggestResponse,
  type TalksRepository,
} from "@confy/shared";
import { NotFoundError } from "../errors.js";
import { embedQuery } from "./embed-query.js";

export interface TalksService {
  search(query: TalkSearchQuery): Promise<TalkSearchResponse>;
  suggest(query: TalkSuggestQuery): Promise<TalkSuggestResponse>;
  get(id: string): Promise<TalkResult>;
}

export function createTalksService(deps: {
  talks: TalksRepository;
  ai: Pick<AiClient, "embed">;
  logger: Logger;
}): TalksService {
  return {
    async search(query) {
      return withSpan("confy.talks.search", { "confy.has_query": Boolean(query.q) }, async () => {
        const vector = await embedQuery(deps.ai, deps.logger, query.q);
        const results = await deps.talks.search({
          text: query.q,
          vector,
          level: query.level,
          track: query.track,
          roomId: query.roomId,
          excludeVendorPitch: query.excludeVendorPitch,
          limit: query.limit,
        });
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
