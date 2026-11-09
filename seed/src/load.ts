import { embedJobType, INDEX, type EmbedKind, type EsClient, type JobsRepository } from "@confy/shared";
import type { SeedData } from "./generate.js";

/** Which seed collection goes to which index alias. */
export const COLLECTION_INDEX: Record<keyof SeedData, string> = {
  talks: INDEX.talks,
  speakers: INDEX.speakers,
  rooms: INDEX.rooms,
  attendees: INDEX.attendees,
  contacts: INDEX.contacts,
  resources: INDEX.resources,
};

/** Collections whose documents get a vector. Rooms are small structured data and are not embedded. */
export const COLLECTION_EMBED_KIND: Partial<Record<keyof SeedData, EmbedKind>> = {
  talks: "talk",
  speakers: "speaker",
  attendees: "attendee",
  contacts: "contact",
  resources: "resource",
};

export interface LoadResult {
  index: string;
  indexed: number;
  /** Embedding jobs enqueued for this index. */
  queued: number;
}

/**
 * Bulk-upsert the seed into the aliases. Deterministic `_id`s make this idempotent: re-running updates the
 * same documents instead of duplicating them. It MERGES fields (`doc_as_upsert`) rather than replacing the
 * document, so vectors the worker already wrote are never wiped by a re-seed. `refresh: "wait_for"` is fine here
 * (seed script), never on the request path. With a jobs repository it also enqueues one embedding
 * job per embeddable document (deterministic job ids, so re-running re-queues rather than duplicates).
 */
export async function loadSeed(client: EsClient, data: SeedData, jobs?: JobsRepository): Promise<LoadResult[]> {
  const results: LoadResult[] = [];
  for (const [collection, index] of Object.entries(COLLECTION_INDEX) as Array<[keyof SeedData, string]>) {
    const docs = data[collection] as Array<{ _id: string; _source: object }>;
    const operations = docs.flatMap((d) => [{ update: { _index: index, _id: d._id } }, { doc: d._source, doc_as_upsert: true }]);
    const res = await client.bulk({ operations, refresh: "wait_for" });
    if (res.errors) {
      const failed = res.items
        .map((item) => item.update?.error)
        .filter(Boolean)
        .slice(0, 3)
        .map((e) => `${e?.type}: ${e?.reason}`);
      throw new Error(`Bulk load into ${index} had errors: ${failed.join(" | ")}`);
    }

    const kind = COLLECTION_EMBED_KIND[collection];
    const queued =
      jobs && kind
        ? await jobs.enqueue(docs.map((d) => ({ id: `${embedJobType(kind)}:${d._id}`, type: embedJobType(kind), payload: { id: d._id } })))
        : 0;
    results.push({ index, indexed: docs.length, queued });
  }
  return results;
}
