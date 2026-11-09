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

/**
 * Every method takes `ownerId` and filters on it, including `get`: knowing another persona's contact id
 * must never be enough to read their contact.
 */
export interface ContactsRepository {
  search(params: ContactSearchParams): Promise<ContactResult[]>;
  /** The owner's contacts, most recently met first. */
  list(ownerId: string, limit: number): Promise<ContactResult[]>;
  /** One contact, or null when it doesn't exist OR belongs to someone else. */
  get(ownerId: string, id: string): Promise<ContactResult | null>;
  /** Create or overwrite one contact (deterministic id). `owner_id` is required by the document schema. */
  save(id: string, doc: ContactDoc, embedding?: number[]): Promise<void>;
}

const FIELDS = ["notes", "met_at_talk_title^2", "contact_name", "role", "company", "company_type^2"];

interface Hit {
  _id?: string | undefined;
  _score?: number | null | undefined;
  _source?: unknown;
}

/** Strips `owner_id` (callers already know whose contacts these are) and attaches the id and score. */
function toResult(hit: Hit): ContactResult {
  const { owner_id: _owner, ...contact } = ContactDoc.parse(hit._source);
  return { ...contact, id: hit._id as string, score: hit._score ?? null };
}

export function createContactsRepository(es: EsClient): ContactsRepository {
  return {
    async save(id, doc, embedding) {
      await es.index({ index: INDEX.contacts, id, document: { ...ContactDoc.parse(doc), ...(embedding ? { embedding } : {}) } });
    },

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
      return res.hits.hits.map(toResult);
    },

    async list(ownerId, limit) {
      const body = buildHybridQuery({ fields: FIELDS, filter: termFilters({ owner_id: ownerId }), limit });
      const res = await es.search<unknown>({
        index: INDEX.contacts,
        ...body,
        sort: [{ met_at_time: "desc" as const }],
        _source: NO_VECTORS,
      });
      return res.hits.hits.map(toResult);
    },

    async get(ownerId, id) {
      const res = await es.search<unknown>({
        index: INDEX.contacts,
        size: 1,
        query: { bool: { filter: [{ ids: { values: [id] } }, ...termFilters({ owner_id: ownerId })] } },
        _source: NO_VECTORS,
      });
      const hit = res.hits.hits[0];
      return hit ? toResult(hit) : null;
    },
  };
}
