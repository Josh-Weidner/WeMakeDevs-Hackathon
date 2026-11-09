import type { RoomResult } from "../../contracts/search.js";
import { RoomDoc } from "../../contracts/documents.js";
import type { EsClient } from "../client.js";
import { INDEX } from "../indices.js";

export interface RoomsRepository {
  list(): Promise<RoomResult[]>;
  get(id: string): Promise<RoomResult | null>;
}

const MAX_ROOMS = 100;

export function createRoomsRepository(es: EsClient): RoomsRepository {
  return {
    async list() {
      const res = await es.search<unknown>({ index: INDEX.rooms, size: MAX_ROOMS, sort: [{ "name.keyword": "asc" }] });
      return res.hits.hits.map((h) => ({ ...RoomDoc.parse(h._source), id: h._id as string }));
    },

    async get(id) {
      try {
        const res = await es.get<unknown>({ index: INDEX.rooms, id });
        return { ...RoomDoc.parse(res._source), id };
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode === 404) return null;
        throw err;
      }
    },
  };
}
