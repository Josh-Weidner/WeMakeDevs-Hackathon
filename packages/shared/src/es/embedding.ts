import { AttendeeDoc, ContactDoc, ResourceDoc, SpeakerDoc, TalkDoc } from "../contracts/documents.js";
import { INDEX, type IndexAlias } from "./indices.js";

/**
 * What gets embedded, per entity. ONE function per entity so indexing and querying stay consistent
 * (CLAUDE.md §3): change the text here and re-embed everything.
 */
export const EMBED_KINDS = ["talk", "speaker", "attendee", "contact", "resource"] as const;
export type EmbedKind = (typeof EMBED_KINDS)[number];

export const embedJobType = (kind: EmbedKind) => `embed-${kind}` as const;

/** Drop the stored vector so a re-embed validates against the same strict schema as the seed. */
const withoutEmbedding = (source: Record<string, unknown>) => {
  const { embedding: _embedding, ...rest } = source;
  return rest;
};

export const EMBEDDABLE: Record<EmbedKind, { index: IndexAlias; text(source: Record<string, unknown>): string }> = {
  talk: {
    index: INDEX.talks,
    text: (s) => {
      const d = TalkDoc.parse(withoutEmbedding(s));
      return [d.title, d.abstract, `Tags: ${d.tags.join(", ")}`, `Speakers: ${d.speaker_names.join(", ")}`].join("\n");
    },
  },
  speaker: {
    index: INDEX.speakers,
    text: (s) => {
      const d = SpeakerDoc.parse(withoutEmbedding(s));
      return [d.name, d.bio, `Company: ${d.company}`].join("\n");
    },
  },
  attendee: {
    index: INDEX.attendees,
    text: (s) => {
      const d = AttendeeDoc.parse(withoutEmbedding(s));
      return [d.role, d.bio, `Stack: ${d.stack}`, `Interests: ${d.interests.join(", ")}`].join("\n");
    },
  },
  contact: {
    index: INDEX.contacts,
    text: (s) => {
      const d = ContactDoc.parse(withoutEmbedding(s));
      return [
        `${d.contact_name}, ${d.role} at ${d.company} (${d.company_type})`,
        d.met_at_talk_title ? `Met at: ${d.met_at_talk_title}` : "",
        d.notes,
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
  resource: {
    index: INDEX.resources,
    text: (s) => {
      const d = ResourceDoc.parse(withoutEmbedding(s));
      return [d.title, `Tags: ${d.tags.join(", ")}`].join("\n");
    },
  },
};
