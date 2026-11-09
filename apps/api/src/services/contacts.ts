import {
  withSpan,
  type AiClient,
  type ContactSearchQuery,
  type ContactSearchResponse,
  type ContactsRepository,
  type Logger,
  type ProductMetrics,
} from "@confy/shared";
import { embedQuery } from "./embed-query.js";

export interface ContactsService {
  /** Always scoped to `userId`: contacts are private per persona. */
  search(userId: string, query: ContactSearchQuery): Promise<ContactSearchResponse>;
}

export function createContactsService(deps: {
  contacts: Pick<ContactsRepository, "search">;
  ai: Pick<AiClient, "embed">;
  logger: Logger;
  metrics?: Pick<ProductMetrics, "recordAiError">;
}): ContactsService {
  return {
    async search(userId, query) {
      return withSpan("confy.contacts.search", {}, async () => {
        const vector = await embedQuery(deps.ai, deps.logger, query.q, deps.metrics);
        const results = await deps.contacts.search({ ownerId: userId, text: query.q, vector, limit: query.limit });
        return { results };
      });
    },
  };
}
