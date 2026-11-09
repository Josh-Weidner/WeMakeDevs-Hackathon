import { DemandEventDoc } from "@confy/shared/contracts";
import { describe, expect, it } from "vitest";
import { generateDemandEvents, HOT_TALK_TITLE } from "../src/demand.js";
import { generateSeed } from "../src/generate.js";

const data = generateSeed();
const now = new Date("2026-11-10T12:00:00.000Z");
const events = generateDemandEvents(data, now);

describe("demand events", () => {
  it("are valid documents inside the 60-minute forecast window", () => {
    for (const e of events) {
      expect(DemandEventDoc.safeParse(e).success).toBe(true);
      const age = now.getTime() - Date.parse(e["@timestamp"]);
      expect(age).toBeGreaterThan(0);
      expect(age).toBeLessThanOrEqual(45 * 60_000);
    }
  });

  it("push the hot talk over its room capacity and keep other talks comfortable", () => {
    const hot = data.talks.find((t) => t._source.title === HOT_TALK_TITLE)!;
    const capacity = data.rooms.find((r) => r._id === hot._source.room_id)!._source.capacity;
    const forecast = (id: string) => {
      const mine = events.filter((e) => e.talk_id === id);
      return mine.filter((e) => e.event_type === "bookmark").length + 0.25 * mine.filter((e) => e.event_type === "search_hit").length;
    };

    expect(forecast(hot._id)).toBeGreaterThan(capacity);
    const others = [...new Set(events.map((e) => e.talk_id))].filter((id) => id !== hot._id);
    expect(others.length).toBeGreaterThan(5);
    for (const id of others) {
      const room = data.rooms.find((r) => r._id === data.talks.find((t) => t._id === id)!._source.room_id)!;
      expect(forecast(id)).toBeLessThan(room._source.capacity);
    }
  });

  it("is deterministic and sorted by time", () => {
    expect(generateDemandEvents(data, now)).toEqual(events);
    expect(events.map((e) => e["@timestamp"])).toEqual([...events.map((e) => e["@timestamp"])].sort());
  });

  it("fails clearly when the hot talk is missing", () => {
    expect(() => generateDemandEvents({ ...data, talks: [] }, now)).toThrow(/Seed talk not found/);
  });
});
