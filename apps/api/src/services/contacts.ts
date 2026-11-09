import {
  withSpan,
  type AiClient,
  type ContactFollowUpResponse,
  type ContactListQuery,
  type ContactSearchQuery,
  type ContactSearchResponse,
  type ContactsRepository,
  type Logger,
  type PeopleRepository,
  type ProductMetrics,
} from "@confy/shared";
import { NotFoundError } from "../errors.js";
import { embedQuery } from "./embed-query.js";
import { generateFollowUp } from "./follow-up.js";

export interface ContactsService {
  /** Always scoped to `userId`: contacts are private per persona. */
  search(userId: string, query: ContactSearchQuery): Promise<ContactSearchResponse>;
  list(userId: string, query: ContactListQuery): Promise<ContactSearchResponse>;
  followUp(userId: string, contactId: string): Promise<ContactFollowUpResponse>;
}

export function createContactsService(deps: {
  contacts: Pick<ContactsRepository, "search" | "list" | "get">;
  people: Pick<PeopleRepository, "getProfile">;
  ai: Pick<AiClient, "embed" | "chatJson">;
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

    async list(userId, query) {
      return { results: await deps.contacts.list(userId, query.limit) };
    },

    async followUp(userId, contactId) {
      return withSpan("confy.contacts.follow_up", {}, async () => {
        // Owner-scoped lookup: another persona's contact id is indistinguishable from a missing one.
        const [contact, me] = await Promise.all([deps.contacts.get(userId, contactId), deps.people.getProfile(userId)]);
        if (!contact) throw new NotFoundError(`Contact "${contactId}" not found`);
        return { draft: await generateFollowUp(deps.ai, deps.logger, { me, contact }, deps.metrics) };
      });
    },
  };
}
