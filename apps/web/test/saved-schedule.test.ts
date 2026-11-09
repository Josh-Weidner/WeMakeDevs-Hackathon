import type { ScheduleResponse } from "@confy/shared/contracts";
import { describe, expect, it } from "vitest";
import { nextUp, parseSavedSchedule, savedScheduleKey, startsIn } from "../src/lib/saved-schedule";

const item = (id: string, start: string, end: string) => ({
  talk_id: id, title: id, level: "beginner" as const, tags: ["x"], track: "P", format: "talk" as const, speaker_names: ["Ann"], start, end,
  room: { id: "room-1", name: "Hall A", capacity: 100, floor: "1", step_free_route: "r", accessibility_notes: "n" },
  occupancy_ratio: 0, likely_full: false,
});
const schedule: ScheduleResponse = {
  parsed: { query: null, level: null, excludeVendorPitch: false, day: null, maxTalks: 5 },
  interpreted_by: "ai", low_stimulation: false, breaks: [], warnings: [],
  items: [item("b", "2026-11-10T13:30:00-07:00", "2026-11-10T14:15:00-07:00"), item("a", "2026-11-10T10:30:00-07:00", "2026-11-10T11:15:00-07:00")],
};
const at = (iso: string) => new Date(iso);

describe("saved schedule storage", () => {
  it("keeps each persona's schedule under its own key", () => {
    expect(savedScheduleKey("demo-alex")).toBe("confy:schedule:demo-alex");
    expect(savedScheduleKey("demo-sam")).not.toBe(savedScheduleKey("demo-alex"));
  });

  it("round-trips a valid saved schedule", () => {
    const raw = JSON.stringify({ request: "beginner talks", saved_at: "2026-11-09T12:00:00.000Z", schedule });
    expect(parseSavedSchedule(raw)?.schedule.items).toHaveLength(2);
    expect(parseSavedSchedule(raw)?.request).toBe("beginner talks");
  });

  it("treats missing, corrupted or outdated-shape values as nothing saved", () => {
    for (const bad of [null, undefined, "", "not json", "{}", '{"request":"x"}', JSON.stringify({ request: "x", saved_at: "yesterday", schedule })]) {
      expect(parseSavedSchedule(bad)).toBeNull();
    }
    expect(parseSavedSchedule(JSON.stringify({ request: "x", saved_at: "2026-11-09T12:00:00.000Z", schedule: { items: "nope" } }))).toBeNull();
  });
});

describe("nextUp", () => {
  it("picks the earliest talk that hasn't started, regardless of order in the list", () => {
    expect(nextUp(schedule, at("2026-11-09T08:00:00-07:00"))?.talk_id).toBe("a");
    expect(nextUp(schedule, at("2026-11-10T11:00:00-07:00"))?.talk_id).toBe("b");
  });

  it("skips talks already underway and returns null once everything is behind us", () => {
    expect(nextUp(schedule, at("2026-11-10T10:30:00-07:00"))?.talk_id).toBe("b"); // a is starting right now: not "next"
    expect(nextUp(schedule, at("2026-11-10T14:00:00-07:00"))).toBeNull();
    expect(nextUp({ items: [] }, at("2026-11-09T08:00:00-07:00"))).toBeNull();
  });
});

describe("startsIn", () => {
  const start = "2026-11-10T10:30:00-07:00";
  it("reads naturally at each scale", () => {
    expect(startsIn(start, at("2026-11-10T10:30:00-07:00"))).toBe("starting now");
    expect(startsIn(start, at("2026-11-10T10:00:00-07:00"))).toBe("starts in 30 min");
    expect(startsIn(start, at("2026-11-10T10:29:40-07:00"))).toBe("starts in 1 min");
    expect(startsIn(start, at("2026-11-10T07:20:00-07:00"))).toBe("starts in 3 h 10 min");
    expect(startsIn(start, at("2026-11-10T08:30:00-07:00"))).toBe("starts in 2 h");
    expect(startsIn(start, at("2026-11-08T10:30:00-07:00"))).toBe("starts in 2 days");
  });
});
