import type { EsClient } from "../client.js";
import { EMBEDDABLE, type EmbedKind } from "../embedding.js";

/** Reads embeddable documents and writes their vectors back. All access goes through the alias. */
export interface EmbeddingStore {
  get(kind: EmbedKind, id: string): Promise<Record<string, unknown> | null>;
  setEmbedding(kind: EmbedKind, id: string, vector: number[]): Promise<void>;
}

export function createEmbeddingStore(es: EsClient): EmbeddingStore {
  return {
    async get(kind, id) {
      try {
        const res = await es.get<Record<string, unknown>>({ index: EMBEDDABLE[kind].index, id });
        return res._source ?? null;
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode === 404) return null;
        throw err;
      }
    },

    async setEmbedding(kind, id, vector) {
      await es.update({ index: EMBEDDABLE[kind].index, id, doc: { embedding: vector } });
    },
  };
}
