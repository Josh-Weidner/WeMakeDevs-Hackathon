import type { estypes } from "@elastic/elasticsearch";
import { INDEX, type IndexAlias } from "../indices.js";
import { bool, date, embedding, integer, keyword, storedOnlyKeyword, text, textWithKeyword, titleField } from "./fields.js";

type Mappings = estypes.MappingTypeMapping;

/**
 * Every index uses `dynamic: "strict"`: an undeclared field fails the write loudly
 * instead of silently creating a new (wrongly typed) field.
 * Docs: spec §5 and CLAUDE.md §3. Change a field TYPE only via a new `_vN` index + reindex.
 */
const strict = (properties: Record<string, estypes.MappingProperty>): Mappings => ({
  dynamic: "strict",
  properties,
});

export const MAPPINGS: Record<Exclude<IndexAlias, typeof INDEX.demandEvents>, Mappings> = {
  [INDEX.talks]: strict({
    title: titleField(),
    abstract: text(),
    level: keyword(), // beginner | intermediate | advanced
    tags: keyword(),
    track: keyword(),
    format: keyword(),
    is_vendor_pitch: bool(),
    speaker_ids: keyword(),
    speaker_names: text(),
    room_id: keyword(),
    start: date(),
    end: date(),
    captions_url: storedOnlyKeyword(),
    transcript_url: storedOnlyKeyword(),
    stream_url: storedOnlyKeyword(),
    embedding: embedding(),
  }),

  [INDEX.speakers]: strict({
    name: textWithKeyword(),
    bio: text(),
    company: textWithKeyword(),
    talk_ids: keyword(),
    embedding: embedding(),
  }),

  [INDEX.rooms]: strict({
    name: textWithKeyword(),
    capacity: integer(),
    floor: keyword(),
    is_quiet_room: bool(),
    step_free_route: text(),
    accessibility_notes: text(),
    location: { type: "geo_point" },
  }),

  /** Opt-in only. Synthetic seed data for the demo. */
  [INDEX.attendees]: strict({
    display_name: textWithKeyword(),
    role: textWithKeyword(),
    company_type: keyword(), // e.g. "bank"
    bio: text(),
    stack: text(),
    interests: keyword(),
    open_to_intros: bool(),
    intro_prefs: keyword(), // quiet | 1:1
    visibility: keyword(),
    linkedin_url: storedOnlyKeyword(),
    embedding: embedding(),
  }),

  /**
   * PRIVATE per user: every query MUST filter on `owner_id`.
   * `contact_name`/`role`/`company`/`company_type` are denormalized from the attendee (or extracted
   * from a Clip) so contacts recall is one scoped hybrid query with no join.
   */
  [INDEX.contacts]: strict({
    owner_id: keyword(),
    attendee_id: keyword(),
    contact_name: textWithKeyword(),
    role: textWithKeyword(),
    company: textWithKeyword(),
    company_type: keyword(),
    met_at_talk_id: keyword(),
    met_at_talk_title: textWithKeyword(),
    met_at_time: date(),
    notes: text(),
    linkedin_url: storedOnlyKeyword(),
    embedding: embedding(),
  }),

  [INDEX.intros]: strict({
    requester_id: keyword(),
    target_id: keyword(),
    slot: date(),
    location: keyword(), // quiet room id
    status: keyword(),
  }),

  /** PRIVATE per user. No raw audio is ever stored: only the transcript the user chose to save. */
  [INDEX.clips]: strict({
    owner_id: keyword(),
    kind: keyword(), // connection | highlight
    duration_s: integer(),
    transcript: text(),
    summary: text(),
    talk_id: keyword(),
    entities: {
      type: "object",
      dynamic: "strict",
      properties: { name: textWithKeyword(), role: text(), company: textWithKeyword() },
    },
    "@timestamp": date(),
    embedding: embedding(),
  }),

  /** PRIVATE per user. */
  [INDEX.highlights]: strict({
    owner_id: keyword(),
    talk_id: keyword(),
    text: text(),
    topic_tags: keyword(),
    experiment: text(),
    resource_ids: keyword(),
    "@timestamp": date(),
    embedding: embedding(),
  }),

  [INDEX.resources]: strict({
    title: textWithKeyword(),
    url: storedOnlyKeyword(),
    type: keyword(), // doc | repo | talk
    tags: keyword(),
    embedding: embedding(),
  }),

  /** Work queue polled by the worker (see CLAUDE.md §2). */
  [INDEX.jobs]: strict({
    type: keyword(),
    payload: { type: "object", enabled: false }, // opaque to ES: kept in _source, not indexed
    status: keyword(), // pending | processing | done | failed
    attempts: integer(),
    claimed_at: date(),
    error: { type: "text", index: false },
    traceparent: storedOnlyKeyword(),
    "@timestamp": date(),
  }),
};

/** `demand-events` is a time-series data stream (spec §5/§7), created from an index template. */
export const DEMAND_EVENTS_MAPPINGS: Mappings = strict({
  "@timestamp": date(),
  talk_id: keyword(),
  room_id: keyword(),
  event_type: keyword(), // search_hit | view | bookmark
  user_id: keyword(),
});
