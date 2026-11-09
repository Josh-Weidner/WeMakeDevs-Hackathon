import type { DemandResponse, RoomResult, TalkResult } from "@confy/shared/contracts";
import { describe, expect, it } from "vitest";
import { BUSY_RATIO, crowdLevel, sessionsByDay } from "../src/lib/rooms/crowd";
import { filterRooms, roomCountLabel } from "../src/lib/rooms/filter";

const talk = (id: string, start: string): TalkResult => ({
  id, score: null, title: `Talk ${id}`, abstract: "A", level: "beginner", tags: ["x"], track: "P", format: "talk", is_vendor_pitch: false,
  speaker_ids: ["s"], speaker_names: ["Ann"], room_id: "room-4", start, end: start,
});
const forecast = (talk_id: string, ratio: number, likely_full = false) => ({
  talk_id, title: "t", room_id: "room-4", room_name: "Room 4", start: "s", bookmarks: 0, search_hits: 0, forecast: 0, capacity: 40, ratio, likely_full,
});

describe("crowdLevel", () => {
  it("is full when the api says likely_full, busy from 70% of capacity, otherwise quiet", () => {
    expect(crowdLevel({ ratio: 1.125, likely_full: true })).toBe("full");
    expect(crowdLevel({ ratio: BUSY_RATIO, likely_full: false })).toBe("busy");
    expect(crowdLevel({ ratio: 0.99, likely_full: false })).toBe("busy");
    expect(crowdLevel({ ratio: 0.69, likely_full: false })).toBe("quiet");
  });

  it("treats a talk with no demand data as quiet", () => {
    expect(crowdLevel(undefined)).toBe("quiet");
  });
});

describe("sessionsByDay", () => {
  const demand: DemandResponse = { window_minutes: 60, talks: [forecast("a", 1.2, true), forecast("b", 0.8)] };

  it("groups by day in time order and attaches the live crowd level", () => {
    const out = sessionsByDay(
      [talk("c", "2026-11-11T10:30:00-07:00"), talk("b", "2026-11-10T14:30:00-07:00"), talk("a", "2026-11-10T13:30:00-07:00"), talk("quiet", "2026-11-10T16:30:00-07:00")],
      demand,
    );
    expect(out.map((d) => d.label)).toEqual(["Tuesday, November 10", "Wednesday, November 11"]);
    expect(out[0]?.sessions.map((s) => [s.talk.id, s.crowd])).toEqual([["a", "full"], ["b", "busy"], ["quiet", "quiet"]]);
    expect(out[1]?.sessions[0]?.crowd).toBe("quiet");
  });

  it("still works when the forecast is unavailable, and for no talks", () => {
    expect(sessionsByDay([talk("a", "2026-11-10T13:30:00-07:00")], null)[0]?.sessions[0]?.crowd).toBe("quiet");
    expect(sessionsByDay([], demand)).toEqual([]);
  });
});

describe("filterRooms", () => {
  const room = (id: string, name: string, quiet = false, notes = "n"): RoomResult => ({
    id, name, capacity: 50, floor: "1", is_quiet_room: quiet, step_free_route: "r", accessibility_notes: notes,
  });
  const rooms = [room("1", "Hall A", false, "Hearing loop installed"), room("2", "Quiet Room", true, "Low light"), room("3", "Room 4")];

  it("filters to quiet rooms", () => {
    expect(filterRooms(rooms, { quietOnly: true, query: "" }).map((r) => r.id)).toEqual(["2"]);
  });

  it("matches name, floor and accessibility notes, ignoring case and spaces", () => {
    expect(filterRooms(rooms, { quietOnly: false, query: "  hall " }).map((r) => r.id)).toEqual(["1"]);
    expect(filterRooms(rooms, { quietOnly: false, query: "HEARING" }).map((r) => r.id)).toEqual(["1"]);
    expect(filterRooms(rooms, { quietOnly: false, query: "floor 1" })).toHaveLength(3);
    expect(filterRooms(rooms, { quietOnly: true, query: "hall" })).toEqual([]);
  });

  it("describes how many rooms are showing", () => {
    expect(roomCountLabel(3, 3)).toBe("Showing all 3 rooms.");
    expect(roomCountLabel(1, 3)).toBe("Showing 1 of 3 rooms.");
  });
});
