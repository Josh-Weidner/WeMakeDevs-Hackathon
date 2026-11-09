import type { TalkResult } from "../../contracts/search.js";
import { TalkDoc } from "../../contracts/documents.js";
import type { EsClient } from "../client.js";
import { INDEX } from "../indices.js";
import { buildHybridQuery, NO_VECTORS, termFilters } from "../query-builders.js";

export interface TalkSearchParams {
  text?: string | undefined;
  vector?: number[] | undefined;
  level?: string | undefined;
  track?: string | undefined;
  roomId?: string | undefined;
  excludeVendorPitch?: boolean | undefined;
  limit: number;
}

export interface TalksRepository {
  search(params: TalkSearchParams): Promise<TalkResult[]>;
  get(id: string): Promise<TalkResult | null>;
  /** Missing ids are skipped. */
  getMany(ids: string[]): Promise<TalkResult[]>;
  suggest(prefix: string, limit: number): Promise<Array<{ id: string; title: string }>>;
}

const FIELDS = ["title^3", "tags^2", "speaker_names^2", "abstract"];

export function createTalksRepository(es: EsClient): TalksRepository {
  return {
    async search(p) {
      const body = buildHybridQuery({
        text: p.text,
        vector: p.vector,
        fields: FIELDS,
        filter: termFilters({ level: p.level, track: p.track, room_id: p.roomId }),
        mustNot: p.excludeVendorPitch ? termFilters({ is_vendor_pitch: true }) : [],
        limit: p.limit,
      });
      // Browsing (no text/vector) is ordered by start time; ranked searches keep their relevance order.
      const browse = !p.text && !p.vector;
      const res = await es.search<unknown>({
        index: INDEX.talks,
        ...body,
        ...(browse ? { sort: [{ start: "asc" as const }] } : {}),
        _source: NO_VECTORS,
      });
      return res.hits.hits.map((h) => ({
        ...TalkDoc.parse(h._source),
        id: h._id as string,
        score: h._score ?? null,
      }));
    },

    async get(id) {
      try {
        const res = await es.get<unknown>({ index: INDEX.talks, id, _source_excludes: ["embedding"] });
        return { ...TalkDoc.parse(res._source), id, score: null };
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode === 404) return null;
        throw err;
      }
    },

    async getMany(ids) {
      if (ids.length === 0) return [];
      const res = await es.mget<unknown>({ index: INDEX.talks, ids, _source_excludes: ["embedding"] });
      return res.docs.flatMap((d) =>
        "found" in d && d.found ? [{ ...TalkDoc.parse(d._source), id: d._id, score: null }] : [],
      );
    },

    async suggest(prefix, limit) {
      const res = await es.search<{ title: string }>({
        index: INDEX.talks,
        size: limit,
        _source: ["title"],
        query: {
          multi_match: {
            query: prefix,
            type: "bool_prefix",
            fields: ["title.suggest", "title.suggest._2gram", "title.suggest._3gram"],
          },
        },
      });
      return res.hits.hits.map((h) => ({ id: h._id as string, title: (h._source as { title: string }).title }));
    },
  };
}
