import { z } from "zod";

export const DemandEventType = z.enum(["search_hit", "view", "bookmark"]);
export type DemandEventType = z.infer<typeof DemandEventType>;

/** `demand-events` data stream document. */
export const DemandEventDoc = z.strictObject({
  "@timestamp": z.iso.datetime({ offset: true }),
  talk_id: z.string(),
  room_id: z.string(),
  event_type: DemandEventType,
  user_id: z.string(),
});
export type DemandEventDoc = z.infer<typeof DemandEventDoc>;

/** Demand → "likely full": forecast = bookmarks + α·recent searches, compared with room capacity. */
export const TalkForecast = z.object({
  talk_id: z.string(),
  title: z.string(),
  room_id: z.string(),
  room_name: z.string(),
  start: z.string(),
  bookmarks: z.number().int(),
  search_hits: z.number().int(),
  forecast: z.number(),
  capacity: z.number().int(),
  ratio: z.number(),
  likely_full: z.boolean(),
});
export type TalkForecast = z.infer<typeof TalkForecast>;

export const DemandResponse = z.object({
  window_minutes: z.number().int(),
  talks: z.array(TalkForecast),
});
export type DemandResponse = z.infer<typeof DemandResponse>;

export const BookmarkResponse = z.object({ talk_id: z.string(), recorded: z.literal(true) });
export type BookmarkResponse = z.infer<typeof BookmarkResponse>;
