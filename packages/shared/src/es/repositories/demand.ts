import type { DemandEventDoc, DemandEventType } from "../../contracts/demand.js";
import type { EsClient } from "../client.js";
import { INDEX } from "../indices.js";

export interface DemandCounts {
  talkId: string;
  roomId: string;
  bookmarks: number;
  searchHits: number;
}

export interface DemandRepository {
  record(events: DemandEventDoc[]): Promise<void>;
  /** Event counts per talk since `sinceIso`. */
  aggregate(sinceIso: string): Promise<DemandCounts[]>;
}

const MAX_TALKS = 500;

export function createDemandRepository(es: EsClient): DemandRepository {
  return {
    async record(events) {
      if (events.length === 0) return;
      // Data streams are append-only: documents are written with `create`.
      const operations = events.flatMap((e) => [{ create: { _index: INDEX.demandEvents } }, e]);
      const res = await es.bulk({ operations });
      if (res.errors) {
        const first = res.items.map((i) => i.create?.error).find(Boolean);
        throw new Error(`Failed to record demand events: ${first?.type}: ${first?.reason}`);
      }
    },

    async aggregate(sinceIso) {
      const count = (type: DemandEventType) => ({ filter: { term: { event_type: type } } });
      const res = await es.search({
        index: INDEX.demandEvents,
        size: 0,
        query: { range: { "@timestamp": { gte: sinceIso } } },
        aggs: {
          talks: {
            terms: { field: "talk_id", size: MAX_TALKS },
            aggs: { room: { terms: { field: "room_id", size: 1 } }, bookmarks: count("bookmark"), searches: count("search_hit") },
          },
        },
      });
      interface Bucket {
        key: string;
        room: { buckets: Array<{ key: string }> };
        bookmarks: { doc_count: number };
        searches: { doc_count: number };
      }
      const buckets = ((res.aggregations?.talks as { buckets?: Bucket[] } | undefined)?.buckets ?? []);
      return buckets.map((b) => ({
        talkId: b.key,
        roomId: b.room.buckets[0]?.key ?? "",
        bookmarks: b.bookmarks.doc_count,
        searchHits: b.searches.doc_count,
      }));
    },
  };
}
