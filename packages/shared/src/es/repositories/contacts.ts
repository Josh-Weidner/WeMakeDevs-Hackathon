import { ContactDoc } from "../../contracts/documents.js";
import type { ContactResult } from "../../contracts/search.js";
import type { EsClient } from "../client.js";
import { INDEX } from "../indices.js";
import { buildHybridQuery, NO_VECTORS, termFilters } from "../query-builders.js";

export interface ContactSearchParams {
  /** REQUIRED: contacts are private per user. There is deliberately no method that omits it. */
  ownerId: string;
  text: string;
  vector?: number[] | undefined;
  limit: number;
}

export interface ContactsRepository {
  search(params: ContactSearchParams): Promise<ContactResult[]>;
}

const FIELDS = ["notes", "met_at_talk_title^2", "contact_name", "role", "company", "company_type^2"];

export function createContactsRepository(es: EsClient): ContactsRepository {
  return {
    async search(p) {
      const body = buildHybridQuery({
        text: p.text,
        vector: p.vector,
        fields: FIELDS,
        // Recall queries mention several facets at once ("eBPF talk" + "bank"); reward docs matching more of them.
        matchType: "most_fields",
        filter: termFilters({ owner_id: p.ownerId }),
        limit: p.limit,
      });
      const res = await es.search<unknown>({ index: INDEX.contacts, ...body, _source: NO_VECTORS });
      return res.hits.hits.map((h) => {
        const { owner_id: _owner, ...contact } = ContactDoc.parse(h._source);
        return { ...contact, id: h._id as string, score: h._score ?? null };
      });
    },
  };
}
