import type { DemandEventDoc } from "@confy/shared/contracts";
import type { SeedData } from "./generate.js";
import { createRng } from "./rng.js";

/** The talk the demo shows as "Likely full": a popular intro session in the 40-seat room. */
export const HOT_TALK_TITLE = "Multi-Tenancy 101: Namespaces, Quotas, and Boundaries";

const HOT_BOOKMARKS = 30;
const HOT_SEARCH_HITS = 60; // forecast = 30 + 0.25 × 60 = 45 > 40 seats
const WARM_TALKS = 10;
const SPREAD_MINUTES = 45;

/**
 * Demand events relative to `now`, so the forecast window (last 60 min) always sees them.
 * One talk is pushed over its room capacity; a handful of others get light, comfortable demand.
 */
export function generateDemandEvents(data: SeedData, now: Date, seed = 7): DemandEventDoc[] {
  const rng = createRng(seed);
  const users = data.attendees.map((a) => a._id);
  const hot = data.talks.find((t) => t._source.title === HOT_TALK_TITLE);
  if (!hot) throw new Error(`Seed talk not found: ${HOT_TALK_TITLE}`);

  const events: DemandEventDoc[] = [];
  const add = (talk: SeedData["talks"][number], type: DemandEventDoc["event_type"], n: number) => {
    for (let i = 0; i < n; i++) {
      const at = new Date(now.getTime() - rng.int(1, SPREAD_MINUTES * 60) * 1000);
      events.push({ "@timestamp": at.toISOString(), talk_id: talk._id, room_id: talk._source.room_id, event_type: type, user_id: rng.pick(users) });
    }
  };

  add(hot, "bookmark", HOT_BOOKMARKS);
  add(hot, "search_hit", HOT_SEARCH_HITS);

  const others = rng.shuffle(data.talks.filter((t) => t._id !== hot._id && t._source.format !== "keynote")).slice(0, WARM_TALKS);
  for (const talk of others) {
    add(talk, "bookmark", rng.int(1, 4));
    add(talk, "search_hit", rng.int(2, 10));
  }
  return events.sort((a, b) => a["@timestamp"].localeCompare(b["@timestamp"]));
}
