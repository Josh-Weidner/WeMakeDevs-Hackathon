import {
  withSpan,
  type DemandCounts,
  type DemandRepository,
  type DemandResponse,
  type Logger,
  type OccupancySample,
  type ProductMetrics,
  type RoomsRepository,
  type TalkForecast,
  type TalkResult,
  type TalksRepository,
} from "@confy/shared";
import { NotFoundError } from "../errors.js";

/** Look-back window for "recent" demand. */
export const FORECAST_WINDOW_MINUTES = 60;
/** A search hit signals interest but is weaker than a bookmark. */
export const SEARCH_WEIGHT = 0.25;

/** forecast = bookmarks + α·recent_searches; "likely full" when it exceeds capacity (spec §7). */
export function computeForecast(counts: Pick<DemandCounts, "bookmarks" | "searchHits">, capacity: number) {
  const forecast = counts.bookmarks + SEARCH_WEIGHT * counts.searchHits;
  const ratio = capacity > 0 ? forecast / capacity : 0;
  return { forecast, ratio, likelyFull: forecast > capacity };
}

export interface DemandService {
  forecast(): Promise<DemandResponse>;
  recordBookmark(userId: string, talkId: string): Promise<void>;
  /** Fire-and-forget: a failed write must never fail the search that triggered it. */
  recordSearchHits(userId: string, talks: TalkResult[]): void;
  /** Recompute and cache the forecast that feeds the occupancy gauge. */
  refresh(): Promise<void>;
  latest(): OccupancySample[];
}

export function createDemandService(deps: {
  demand: DemandRepository;
  talks: TalksRepository;
  rooms: RoomsRepository;
  metrics: Pick<ProductMetrics, "recordSearchHits" | "recordBookmark">;
  logger: Logger;
  now?: () => Date;
}): DemandService {
  const now = deps.now ?? (() => new Date());
  let cached: OccupancySample[] = [];

  async function forecast(): Promise<DemandResponse> {
    return withSpan("confy.demand.forecast", {}, async () => {
      const since = new Date(now().getTime() - FORECAST_WINDOW_MINUTES * 60_000).toISOString();
      const counts = await deps.demand.aggregate(since);
      const [talks, rooms] = await Promise.all([deps.talks.getMany(counts.map((c) => c.talkId)), deps.rooms.list()]);
      const talkById = new Map(talks.map((t) => [t.id, t]));
      const roomById = new Map(rooms.map((r) => [r.id, r]));

      const rows = counts.flatMap((c): TalkForecast[] => {
        const talk = talkById.get(c.talkId);
        const room = talk && roomById.get(talk.room_id);
        if (!talk || !room) return [];
        const f = computeForecast(c, room.capacity);
        return [
          {
            talk_id: talk.id,
            title: talk.title,
            room_id: room.id,
            room_name: room.name,
            start: talk.start,
            bookmarks: c.bookmarks,
            search_hits: c.searchHits,
            forecast: f.forecast,
            capacity: room.capacity,
            ratio: f.ratio,
            likely_full: f.likelyFull,
          },
        ];
      });
      rows.sort((a, b) => b.ratio - a.ratio);
      cached = rows.map((r) => ({ talkId: r.talk_id, roomId: r.room_id, ratio: r.ratio }));
      return { window_minutes: FORECAST_WINDOW_MINUTES, talks: rows };
    });
  }

  return {
    forecast,

    async recordBookmark(userId, talkId) {
      const talk = await deps.talks.get(talkId);
      if (!talk) throw new NotFoundError(`Talk "${talkId}" not found`);
      await deps.demand.record([
        { "@timestamp": now().toISOString(), talk_id: talk.id, room_id: talk.room_id, event_type: "bookmark", user_id: userId },
      ]);
      deps.metrics.recordBookmark({ talkId: talk.id, roomId: talk.room_id });
    },

    recordSearchHits(userId, talks) {
      if (talks.length === 0) return;
      const timestamp = now().toISOString();
      deps.metrics.recordSearchHits(talks.map((t) => ({ talkId: t.id, roomId: t.room_id })));
      deps.demand
        .record(
          talks.map((t) => ({ "@timestamp": timestamp, talk_id: t.id, room_id: t.room_id, event_type: "search_hit" as const, user_id: userId })),
        )
        .catch((err: unknown) => deps.logger.warn({ err }, "failed to record search demand"));
    },

    async refresh() {
      try {
        await forecast();
      } catch (err) {
        deps.logger.warn({ err }, "demand forecast refresh failed");
      }
    },

    latest: () => cached,
  };
}
