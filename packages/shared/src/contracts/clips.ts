import { z } from "zod";

/**
 * Clip mode (SPEC §10b). The browser keeps a rolling audio buffer on the device; only when the user taps
 * Save is that slice uploaded. The api transcribes it in memory (the audio is never stored), then the
 * worker classifies the transcript as a `connection` or a `highlight` and builds the result.
 */
export const CLIP_MAX_SECONDS = 300;
/** 5 min of 16 kHz 16-bit mono WAV is ~9.6 MB; leave headroom for other encodings. */
export const CLIP_MAX_BYTES = 12 * 1024 * 1024;
/** LinkedIn's limit for a note on a connection request. */
export const LINKEDIN_NOTE_MAX = 300;

export const CLIP_AUDIO_TYPES = ["audio/wav", "audio/x-wav", "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/x-m4a"] as const;

export const ClipKind = z.enum(["connection", "highlight"]);
export type ClipKind = z.infer<typeof ClipKind>;

export const ClipStatus = z.enum(["processing", "done", "failed"]);
export type ClipStatus = z.infer<typeof ClipStatus>;

/** Query string of `POST /v1/clips` (the body is the raw audio). */
export const ClipUploadQuery = z.object({
  /** Seconds of audio in the upload, as measured on the device. */
  durationS: z.coerce.number().int().min(1).max(CLIP_MAX_SECONDS),
  /** Set when the clip was saved inside a talk. */
  talkId: z.string().trim().min(1).max(64).optional(),
});
export type ClipUploadQuery = z.infer<typeof ClipUploadQuery>;

export const ClipAccepted = z.object({ id: z.uuid(), status: z.literal("processing") });
export type ClipAccepted = z.infer<typeof ClipAccepted>;

export const ClipPerson = z.object({
  name: z.string().min(1).max(120),
  role: z.string().max(120),
  company: z.string().max(120),
});
export type ClipPerson = z.infer<typeof ClipPerson>;

export const ClipResource = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["doc", "repo", "talk"]),
  url: z.url().optional(),
});
export type ClipResource = z.infer<typeof ClipResource>;

/** What the worker produced, shown on the clip card. */
export const ClipResult = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("connection"),
    person: ClipPerson,
    /** A DRAFT. The user reviews and sends it themselves: Confy never contacts anyone on LinkedIn. */
    linkedin_note: z.string().max(LINKEDIN_NOTE_MAX),
    linkedin_search_url: z.url(),
    contact_id: z.string(),
  }),
  z.object({
    kind: z.literal("highlight"),
    topic_tags: z.array(z.string()).max(8),
    /** A small hands-on exercise to try, or null if the model had none. */
    experiment: z.string().nullable(),
    resources: z.array(ClipResource).max(8),
    highlight_id: z.string(),
  }),
]);
export type ClipResult = z.infer<typeof ClipResult>;

export const ClipView = z.object({
  id: z.string(),
  kind: ClipKind,
  summary: z.string(),
  transcript: z.string(),
  duration_s: z.number().int(),
  talk_id: z.string().optional(),
  created_at: z.iso.datetime({ offset: true }),
  result: ClipResult,
});
export type ClipView = z.infer<typeof ClipView>;

export const ClipStatusResponse = z.object({
  id: z.string(),
  status: ClipStatus,
  clip: ClipView.optional(),
});
export type ClipStatusResponse = z.infer<typeof ClipStatusResponse>;

/**
 * LinkedIn people search for a name + company. A plain link the user opens themselves: no API calls,
 * no automation (LinkedIn's terms prohibit bots; SPEC §8).
 */
export function linkedInSearchUrl(person: Pick<ClipPerson, "name" | "company">): string {
  const keywords = [person.name, person.company].map((s) => s.trim()).filter(Boolean).join(" ");
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}
