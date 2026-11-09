import { describe, expect, it } from "vitest";
import { NAV_GROUPS, NAV_ITEMS } from "../src/lib/nav";
import { railFor } from "../src/lib/rail";

describe("rail", () => {
  it("shows the schedule's panels on the schedule page", () => {
    expect(railFor("/schedule")).toEqual(["next-up", "demand"]);
  });

  it("shows live crowd data next to rooms and talks", () => {
    expect(railFor("/rooms")).toEqual(["demand"]);
    expect(railFor("/rooms/room-4")).toEqual(["demand"]);
    expect(railFor("/talks/talk-014")).toEqual(["demand"]);
  });

  it("keeps pages where live crowd data is noise to a single column", () => {
    for (const path of ["/people", "/contacts", "/clip", "/", "/scheduled", "/roomsmate"]) expect(railFor(path)).toEqual([]);
  });
});

describe("navigation groups", () => {
  it("group the features by when you use them, with every feature in exactly one group", () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(["Plan", "During", "After"]);
    const hrefs = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toEqual(NAV_ITEMS.map((i) => i.href));
    expect(hrefs).toEqual(["/schedule", "/rooms", "/people", "/clip", "/contacts"]);
  });
});
