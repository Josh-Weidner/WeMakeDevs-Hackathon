import { z } from "zod";

/**
 * Elasticsearch document shapes (the `_source` of each index). They mirror the strict mappings in
 * `es/mappings`. Embeddings are added by the worker at index time, so they're not part of these.
 * Strict objects: an unknown field fails validation just like `dynamic: "strict"` fails the write.
 */
export const Level = z.enum(["beginner", "intermediate", "advanced"]);
export const TalkFormat = z.enum(["keynote", "talk", "panel", "workshop", "lightning"]);

export const TalkDoc = z.strictObject({
  title: z.string(),
  abstract: z.string(),
  level: Level,
  tags: z.array(z.string()).min(1),
  track: z.string(),
  format: TalkFormat,
  is_vendor_pitch: z.boolean(),
  speaker_ids: z.array(z.string()).min(1),
  speaker_names: z.array(z.string()).min(1),
  room_id: z.string(),
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
  captions_url: z.url().optional(),
  transcript_url: z.url().optional(),
  stream_url: z.url().optional(),
});
export type TalkDoc = z.infer<typeof TalkDoc>;

export const SpeakerDoc = z.strictObject({
  name: z.string(),
  bio: z.string(),
  company: z.string(),
  talk_ids: z.array(z.string()),
});
export type SpeakerDoc = z.infer<typeof SpeakerDoc>;

export const RoomDoc = z.strictObject({
  name: z.string(),
  capacity: z.number().int().positive(),
  floor: z.string(),
  is_quiet_room: z.boolean(),
  step_free_route: z.string(),
  accessibility_notes: z.string(),
  location: z.strictObject({ lat: z.number(), lon: z.number() }).optional(),
});
export type RoomDoc = z.infer<typeof RoomDoc>;

export const AttendeeDoc = z.strictObject({
  display_name: z.string(),
  role: z.string(),
  company_type: z.string(),
  bio: z.string(),
  stack: z.string(),
  interests: z.array(z.string()),
  open_to_intros: z.boolean(),
  intro_prefs: z.enum(["quiet", "1:1"]),
  visibility: z.enum(["public", "attendees"]),
});
export type AttendeeDoc = z.infer<typeof AttendeeDoc>;

export const ContactDoc = z.strictObject({
  owner_id: z.string(),
  attendee_id: z.string(),
  contact_name: z.string(),
  role: z.string(),
  company: z.string(),
  company_type: z.string(),
  met_at_talk_id: z.string().optional(),
  met_at_talk_title: z.string().optional(),
  met_at_time: z.iso.datetime({ offset: true }),
  notes: z.string(),
});
export type ContactDoc = z.infer<typeof ContactDoc>;

export const ResourceDoc = z.strictObject({
  title: z.string(),
  url: z.url(),
  type: z.enum(["doc", "repo", "talk"]),
  tags: z.array(z.string()).min(1),
});
export type ResourceDoc = z.infer<typeof ResourceDoc>;
