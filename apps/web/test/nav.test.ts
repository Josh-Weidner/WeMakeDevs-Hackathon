import { describe, expect, it } from "vitest";
import { NAV_ITEMS, isActive } from "../src/lib/nav";

describe("navigation", () => {
  it("matches the route itself and anything nested inside it, but not look-alike paths", () => {
    expect(isActive("/schedule", "/schedule")).toBe(true);
    expect(isActive("/schedule/day-2", "/schedule")).toBe(true);
    expect(isActive("/scheduled", "/schedule")).toBe(false);
    expect(isActive("/people", "/schedule")).toBe(false);
  });

  it("has unique routes, and the schedule builder is built", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(NAV_ITEMS.find((i) => i.href === "/schedule")?.ready).toBe(true);
  });
});
