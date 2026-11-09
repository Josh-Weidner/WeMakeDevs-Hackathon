import type { ScheduleBreak, ScheduleItem } from "@confy/shared/contracts";
import { describe, expect, it } from "vitest";
import { clock, dayKey, dayLabel, durationLabel, groupByDay, levelLabel } from "../src/lib/schedule/format";

const item = (id: string, start: string, end: string): ScheduleItem => ({
  talk_id: id, title: id, level: "beginner", tags: ["x"], track: "Platform", format: "talk", speaker_names: ["Ann"], start, end,
  room: { id: "room-1", name: "Hall A", capacity: 150, floor: "1", step_free_route: "r", accessibility_notes: "n" },
  occupancy_ratio: 0, likely_full: false,
});
const rest = (start: string, end: string, minutes: number): ScheduleBreak => ({ start, end, minutes, quiet_room: null });

describe("time formatting", () => {
  it("reads venue time straight from the ISO string, in 12-hour form", () => {
    expect(clock("2026-11-10T13:30:00-07:00")).toBe("1:30 PM");
    expect(clock("2026-11-10T09:05:00-07:00")).toBe("9:05 AM");
    expect(clock("2026-11-10T00:00:00-07:00")).toBe("12:00 AM");
    expect(clock("2026-11-10T12:15:00-07:00")).toBe("12:15 PM");
  });

  it("labels days with the weekday, and durations in hours and minutes", () => {
    expect(dayKey("2026-11-10T13:30:00-07:00")).toBe("2026-11-10");
    expect(dayLabel("2026-11-10T13:30:00-07:00")).toBe("Tuesday, November 10");
    expect(dayLabel("2026-11-11")).toBe("Wednesday, November 11");
    expect(durationLabel(15)).toBe("15 min");
    expect(durationLabel(120)).toBe("2 h");
    expect(durationLabel(135)).toBe("2 h 15 min");
    expect(levelLabel("beginner")).toBe("Beginner");
  });
});

describe("groupByDay", () => {
  it("builds one time-ordered timeline per day with talks and breaks interleaved", () => {
    const groups = groupByDay(
      [
        item("late", "2026-11-10T13:30:00-07:00", "2026-11-10T14:15:00-07:00"),
        item("next-day", "2026-11-11T10:30:00-07:00", "2026-11-11T11:15:00-07:00"),
        item("early", "2026-11-10T10:30:00-07:00", "2026-11-10T11:15:00-07:00"),
      ],
      [rest("2026-11-10T11:15:00-07:00", "2026-11-10T13:30:00-07:00", 135)],
    );

    expect(groups.map((g) => g.label)).toEqual(["Tuesday, November 10", "Wednesday, November 11"]);
    expect(groups[0]?.entries.map((e) => (e.kind === "talk" ? e.item.talk_id : "break"))).toEqual(["early", "break", "late"]);
    expect(groups[1]?.entries).toHaveLength(1);
  });

  it("returns no groups for an empty schedule", () => {
    expect(groupByDay([], [])).toEqual([]);
  });
});
