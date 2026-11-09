import { z } from "zod";
import { ClipKind, ClipPerson, ClipResult } from "./clips.js";

/**
 * Elasticsearch document shapes (the `_source` of each index). They mirror the strict mappings in
 * `es/mappings`. Embeddings are added by the worker at index time, so they're not part of these.
 * Strict objects: an unknown field fails validation just like `dynamic: "strict"` fails the write.
 */
export const Level = z.enum(["beginner", "intermediate", "advanced"]);
export const TalkFormat = z.enum(["keynote", "talk", "panel", "workshop", "lightning"]);

/**
 * A LinkedIn link we're willing to render and open. Only https on linkedin.com, so a stored value can never
 * point somewhere else. Opt-in: an attendee has this only if they chose to share it. Confy never contacts
 * anyone on LinkedIn; the user opens the link and sends any request themselves.
 */
export const LinkedInUrl = z
  .url({ protocol: /^https$/ })
  .refine((value) => {
    // Zod still runs this after .url() fails on malformed input, so it must never throw.
    try {
      const host = new URL(value).hostname;
      return host === "linkedin.com" || host.endsWith(".linkedin.com");
    } catch {
      return false;
    }
  }, "must be a linkedin.com URL");

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
  /** Optional and opt-in (see LinkedInUrl). */
  linkedin_url: LinkedInUrl.optional(),
});
export type AttendeeDoc = z.infer<typeof AttendeeDoc>;

export const ContactDoc = z.strictObject({
  owner_id: z.string(),
  /** Set for contacts made with a known attendee; absent for people captured from a Clip. */
  attendee_id: z.string().optional(),
  contact_name: z.string(),
  role: z.string(),
  company: z.string(),
  company_type: z.string(),
  met_at_talk_id: z.string().optional(),
  met_at_talk_title: z.string().optional(),
  met_at_time: z.iso.datetime({ offset: true }),
  notes: z.string(),
  /** Copied from the attendee when they shared it. */
  linkedin_url: LinkedInUrl.optional(),
});
export type ContactDoc = z.infer<typeof ContactDoc>;

export const ResourceDoc = z.strictObject({
  title: z.string(),
  url: z.url(),
  type: z.enum(["doc", "repo", "talk"]),
  tags: z.array(z.string()).min(1),
});
export type ResourceDoc = z.infer<typeof ResourceDoc>;

/** PRIVATE per user. Only created when the user taps Save. There is no audio field: audio is never stored. */
export const ClipDoc = z.strictObject({
  owner_id: z.string(),
  kind: ClipKind,
  duration_s: z.number().int().min(1),
  transcript: z.string(),
  summary: z.string(),
  talk_id: z.string().optional(),
  entities: ClipPerson.optional(),
  contact_id: z.string().optional(),
  highlight_id: z.string().optional(),
  result: ClipResult,
  "@timestamp": z.iso.datetime({ offset: true }),
});
export type ClipDoc = z.infer<typeof ClipDoc>;

/** PRIVATE per user. From Clip (or, later, Talk) mode. */
export const HighlightDoc = z.strictObject({
  owner_id: z.string(),
  talk_id: z.string().optional(),
  text: z.string(),
  topic_tags: z.array(z.string()),
  experiment: z.string().optional(),
  resource_ids: z.array(z.string()),
  "@timestamp": z.iso.datetime({ offset: true }),
});
export type HighlightDoc = z.infer<typeof HighlightDoc>;
