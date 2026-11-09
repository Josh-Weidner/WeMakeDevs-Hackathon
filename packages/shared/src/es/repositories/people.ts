import { AttendeeDoc } from "../../contracts/documents.js";
import { PersonMatch } from "../../contracts/search.js";
import type { EsClient } from "../client.js";
import { INDEX } from "../indices.js";
import { buildHybridQuery, NO_VECTORS, termFilters } from "../query-builders.js";

export interface PeopleMatchParams {
  /** The requesting attendee: never matched with themselves. */
  excludeId: string;
  text: string;
  vector?: number[] | undefined;
  limit: number;
}

/** What the opener generator may know about the requester: the same fields other attendees can see. */
export type RequesterProfile = Pick<AttendeeDoc, "display_name" | "role" | "bio" | "company_type" | "stack" | "interests" | "linkedin_url">;

export interface PeopleRepository {
  /** The requesting attendee's own profile, or null for an unknown persona. */
  getProfile(id: string): Promise<RequesterProfile | null>;
  /** Only attendees who opted in (`open_to_intros`) are ever returned. */
  match(params: PeopleMatchParams): Promise<PersonMatch[]>;
}

const FIELDS = ["stack^3", "interests^2", "bio", "role"];

export function createPeopleRepository(es: EsClient): PeopleRepository {
  return {
    async getProfile(id) {
      try {
        const res = await es.get<unknown>({ index: INDEX.attendees, id, _source_excludes: ["embedding"] });
        const a = AttendeeDoc.parse(res._source);
        return {
          display_name: a.display_name,
          role: a.role,
          bio: a.bio,
          company_type: a.company_type,
          stack: a.stack,
          interests: a.interests,
          // Only present when the attendee opted in to sharing it.
          ...(a.linkedin_url ? { linkedin_url: a.linkedin_url } : {}),
        };
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode === 404) return null;
        throw err;
      }
    },

    async match(p) {
      const body = buildHybridQuery({
        text: p.text,
        vector: p.vector,
        fields: FIELDS,
        filter: termFilters({ open_to_intros: true }),
        mustNot: [{ ids: { values: [p.excludeId] } }],
        limit: p.limit,
      });
      const res = await es.search<unknown>({ index: INDEX.attendees, ...body, _source: NO_VECTORS });
      return res.hits.hits.map((h) => {
        const a = AttendeeDoc.parse(h._source);
        return PersonMatch.parse({
          id: h._id,
          display_name: a.display_name,
          role: a.role,
          company_type: a.company_type,
          bio: a.bio,
          stack: a.stack,
          interests: a.interests,
          intro_prefs: a.intro_prefs,
          score: h._score ?? null,
          opener: null, // filled in by the api service
          linkedin_url: a.linkedin_url ?? null,
        });
      });
    },
  };
}
