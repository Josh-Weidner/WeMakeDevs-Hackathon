import { z } from "zod";
import { AttendeeDoc, ContactDoc, Level, LinkedInUrl, RoomDoc, TalkDoc } from "./documents.js";

/** Query-string booleans arrive as "true"/"false" strings. */
const queryBool = z
  .enum(["true", "false"])
  .transform((v) => v === "true")
  .optional();

const limit = (def: number, max: number) => z.coerce.number().int().min(1).max(max).default(def);

// --- Talks -----------------------------------------------------------------

export const TalkSearchQuery = z.object({
  /** Natural-language or keyword text. Omit to browse by start time. */
  q: z.string().trim().min(1).max(200).optional(),
  level: Level.optional(),
  track: z.string().trim().min(1).max(60).optional(),
  roomId: z.string().trim().min(1).max(64).optional(),
  excludeVendorPitch: queryBool,
  limit: limit(10, 50),
});
export type TalkSearchQuery = z.infer<typeof TalkSearchQuery>;

export const TalkResult = TalkDoc.extend({ id: z.string(), score: z.number().nullable() });
export type TalkResult = z.infer<typeof TalkResult>;

export const TalkSearchResponse = z.object({ results: z.array(TalkResult) });
export type TalkSearchResponse = z.infer<typeof TalkSearchResponse>;

export const TalkSuggestQuery = z.object({ q: z.string().trim().min(1).max(100), limit: limit(5, 10) });
export type TalkSuggestQuery = z.infer<typeof TalkSuggestQuery>;

export const TalkSuggestResponse = z.object({
  suggestions: z.array(z.object({ id: z.string(), title: z.string() })),
});
export type TalkSuggestResponse = z.infer<typeof TalkSuggestResponse>;

// --- Rooms -----------------------------------------------------------------

export const RoomResult = RoomDoc.extend({ id: z.string() });
export type RoomResult = z.infer<typeof RoomResult>;

export const RoomsResponse = z.object({ rooms: z.array(RoomResult) });
export type RoomsResponse = z.infer<typeof RoomsResponse>;

// --- People matching -------------------------------------------------------

export const PeopleMatchQuery = z.object({
  q: z.string().trim().min(1).max(200),
  limit: limit(3, 10),
});
export type PeopleMatchQuery = z.infer<typeof PeopleMatchQuery>;

/** Attendee fields safe to show to other attendees (opted in via `open_to_intros`). */
export const PersonMatch = AttendeeDoc.pick({
  display_name: true,
  role: true,
  company_type: true,
  bio: true,
  stack: true,
  interests: true,
  intro_prefs: true,
}).extend({
  id: z.string(),
  score: z.number().nullable(),
  /** A suggested conversation starter written for this pairing, or null if one couldn't be generated. */
  opener: z.string().nullable(),
  /** Present only if this attendee opted in to sharing a LinkedIn link. */
  linkedin_url: LinkedInUrl.nullable(),
});
export type PersonMatch = z.infer<typeof PersonMatch>;

export const PeopleMatchResponse = z.object({ matches: z.array(PersonMatch) });
export type PeopleMatchResponse = z.infer<typeof PeopleMatchResponse>;

// --- Contacts recall -------------------------------------------------------

export const ContactSearchQuery = z.object({
  q: z.string().trim().min(1).max(200),
  limit: limit(5, 20),
});
export type ContactSearchQuery = z.infer<typeof ContactSearchQuery>;

export const ContactResult = ContactDoc.omit({ owner_id: true }).extend({ id: z.string(), score: z.number().nullable() });
export type ContactResult = z.infer<typeof ContactResult>;

export const ContactSearchResponse = z.object({ results: z.array(ContactResult) });
export type ContactSearchResponse = z.infer<typeof ContactSearchResponse>;
