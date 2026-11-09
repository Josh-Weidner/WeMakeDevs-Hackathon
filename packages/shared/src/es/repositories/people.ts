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

export interface PeopleRepository {
  /** Only attendees who opted in (`open_to_intros`) are ever returned. */
  match(params: PeopleMatchParams): Promise<PersonMatch[]>;
}

const FIELDS = ["stack^3", "interests^2", "bio", "role"];

export function createPeopleRepository(es: EsClient): PeopleRepository {
  return {
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
        });
      });
    },
  };
}
