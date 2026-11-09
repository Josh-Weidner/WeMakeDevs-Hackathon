import { z } from "zod";
import { Level, TalkDoc } from "./documents.js";
import { RoomDoc } from "./documents.js";

export const ScheduleRequest = z.object({
  /** Natural language, e.g. "beginner talks on multi-tenancy, nothing vendor-pitchy". */
  request: z.string().trim().min(1).max(300),
  /** Low-stimulation mode: enforced breaks, emptier rooms preferred, quiet room surfaced. */
  lowStimulation: z.boolean().default(false),
});
export type ScheduleRequest = z.infer<typeof ScheduleRequest>;

/** What the request was understood as. Shown back to the user so the result is explainable. */
export const ParsedScheduleRequest = z.object({
  /** Topic text for the search, or null for "anything". */
  query: z.string().nullable(),
  level: Level.nullable(),
  excludeVendorPitch: z.boolean(),
  /** ISO date (yyyy-mm-dd) when the user named a day. */
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  maxTalks: z.number().int().min(1).max(12),
});
export type ParsedScheduleRequest = z.infer<typeof ParsedScheduleRequest>;

export const ScheduleItem = TalkDoc.pick({
  title: true,
  level: true,
  tags: true,
  track: true,
  format: true,
  speaker_names: true,
  start: true,
  end: true,
  stream_url: true,
  captions_url: true,
}).extend({
  talk_id: z.string(),
  room: RoomDoc.pick({ name: true, capacity: true, floor: true, step_free_route: true, accessibility_notes: true }).extend({
    id: z.string(),
  }),
  /** Demand forecast ÷ capacity. > 1 means "likely full". */
  occupancy_ratio: z.number(),
  likely_full: z.boolean(),
});
export type ScheduleItem = z.infer<typeof ScheduleItem>;

export const ScheduleBreak = z.object({
  start: z.string(),
  end: z.string(),
  minutes: z.number().int(),
  quiet_room: z.object({ id: z.string(), name: z.string(), floor: z.string(), step_free_route: z.string() }).nullable(),
});
export type ScheduleBreak = z.infer<typeof ScheduleBreak>;

export const ScheduleResponse = z.object({
  parsed: ParsedScheduleRequest,
  /** "ai" when the model parsed the request; "fallback" when keyword rules were used instead. */
  interpreted_by: z.enum(["ai", "fallback"]),
  low_stimulation: z.boolean(),
  items: z.array(ScheduleItem),
  breaks: z.array(ScheduleBreak),
  warnings: z.array(z.string()),
});
export type ScheduleResponse = z.infer<typeof ScheduleResponse>;
