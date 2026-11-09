import type { EsClient } from "@confy/shared";
import { INDEX } from "@confy/shared";
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

export interface LoadResult {
  index: string;
  indexed: number;
}

/**
 * Bulk-index the seed into the aliases. Deterministic `_id`s make this idempotent: re-running
 * overwrites the same documents instead of duplicating them. `refresh: "wait_for"` is fine here
 * (seed script), never on the request path.
 */
export async function loadSeed(client: EsClient, data: SeedData): Promise<LoadResult[]> {
  const results: LoadResult[] = [];
  for (const [collection, index] of Object.entries(COLLECTION_INDEX) as Array<[keyof SeedData, string]>) {
    const docs = data[collection] as Array<{ _id: string; _source: object }>;
    const operations = docs.flatMap((d) => [{ index: { _index: index, _id: d._id } }, d._source]);
    const res = await client.bulk({ operations, refresh: "wait_for" });
    if (res.errors) {
      const failed = res.items
        .map((item) => item.index?.error)
        .filter(Boolean)
        .slice(0, 3)
        .map((e) => `${e?.type}: ${e?.reason}`);
      throw new Error(`Bulk load into ${index} had errors: ${failed.join(" | ")}`);
    }
    results.push({ index, indexed: docs.length });
  }
  return results;
}
