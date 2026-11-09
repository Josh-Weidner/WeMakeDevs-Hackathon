import { ClipDoc, HighlightDoc } from "../../contracts/documents.js";
import type { EsClient } from "../client.js";
import { INDEX } from "../indices.js";
import { NO_VECTORS, termFilters } from "../query-builders.js";

/**
 * Clips and highlights are PRIVATE per user. Every read takes `ownerId` and filters on it; there is
 * deliberately no read without it. Writes carry `owner_id` inside the (validated) document.
 * Ids are deterministic (derived from the clip id), so a retried job overwrites instead of duplicating.
 */
export interface ClipsRepository {
  save(id: string, doc: ClipDoc): Promise<void>;
  get(ownerId: string, id: string): Promise<ClipDoc | null>;
}

export interface HighlightsRepository {
  save(id: string, doc: HighlightDoc, embedding?: number[]): Promise<void>;
}

export function createClipsRepository(es: EsClient): ClipsRepository {
  return {
    async save(id, doc) {
      await es.index({ index: INDEX.clips, id, document: ClipDoc.parse(doc) });
    },

    async get(ownerId, id) {
      // A search (not a GET by id) so the owner filter is part of the query itself.
      const res = await es.search<unknown>({
        index: INDEX.clips,
        size: 1,
        query: { bool: { filter: [{ ids: { values: [id] } }, ...termFilters({ owner_id: ownerId })] } },
        _source: NO_VECTORS,
      });
      const hit = res.hits.hits[0];
      return hit ? ClipDoc.parse(hit._source) : null;
    },
  };
}

export function createHighlightsRepository(es: EsClient): HighlightsRepository {
  return {
    async save(id, doc, embedding) {
      await es.index({ index: INDEX.highlights, id, document: { ...HighlightDoc.parse(doc), ...(embedding ? { embedding } : {}) } });
    },
  };
}
