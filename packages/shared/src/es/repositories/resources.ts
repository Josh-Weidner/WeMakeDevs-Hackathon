import { ResourceDoc } from "../../contracts/documents.js";
import type { EsClient } from "../client.js";
import { INDEX } from "../indices.js";
import { buildHybridQuery, NO_VECTORS } from "../query-builders.js";

export interface ResourceResult extends ResourceDoc {
  id: string;
  score: number | null;
}

export interface ResourcesRepository {
  /** Hybrid (BM25 + kNN, RRF) over the curated resources. */
  search(params: { text: string; vector?: number[] | undefined; limit: number }): Promise<ResourceResult[]>;
}

const FIELDS = ["title^2", "tags^2"];

export function createResourcesRepository(es: EsClient): ResourcesRepository {
  return {
    async search(p) {
      const body = buildHybridQuery({ text: p.text, vector: p.vector, fields: FIELDS, limit: p.limit });
      const res = await es.search<unknown>({ index: INDEX.resources, ...body, _source: NO_VECTORS });
      return res.hits.hits.map((h) => ({ ...ResourceDoc.parse(h._source), id: h._id as string, score: h._score ?? null }));
    },
  };
}
