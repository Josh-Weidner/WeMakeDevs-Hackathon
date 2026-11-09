import { describe, expect, it } from "vitest";
import { ASK_TARGETS, askHref, firstParam, matchPages, rankAskTargets } from "../src/lib/ask";
import { NAV_ITEMS } from "../src/lib/nav";

describe("askHref", () => {
  it("opens the target with the request encoded, trimmed and capped to that page's own limit", () => {
    expect(askHref(ASK_TARGETS.people, "  3 people on bare metal & k8s ")).toBe("/people?q=3%20people%20on%20bare%20metal%20%26%20k8s");
    expect(askHref(ASK_TARGETS.contacts, "x".repeat(500)).length).toBe("/contacts?q=".length + 200);
    expect(askHref(ASK_TARGETS.schedule, "y".repeat(500)).length).toBe("/schedule?q=".length + 300);
  });
});

describe("rankAskTargets", () => {
  const first = (text: string) => rankAskTargets(text)[0]?.id;

  it("sends 'who did I meet' style questions to contacts", () => {
    expect(first("the person I met at the eBPF talk who worked at a bank")).toBe("contacts");
    expect(first("who did I meet at the multi-tenancy talk")).toBe("contacts");
    expect(first("remember the SRE from the telco")).toBe("contacts");
  });

  it("sends 'people who…' requests to people", () => {
    expect(first("3 people who run Kubernetes in production on bare metal")).toBe("people");
    expect(first("someone working on eBPF networking")).toBe("people");
    expect(first("security engineers who care about policy")).toBe("people");
  });

  it("defaults to the schedule, and always offers all three", () => {
    expect(first("beginner talks on multi-tenancy, nothing vendor-pitchy")).toBe("schedule");
    expect(first("anything")).toBe("schedule");
    expect(rankAskTargets("people who run k8s").map((t) => t.id).sort()).toEqual(["contacts", "people", "schedule"]);
  });
});

describe("matchPages", () => {
  it("lists every ready page for no text, and filters by name or description", () => {
    expect(matchPages(NAV_ITEMS, "")).toHaveLength(NAV_ITEMS.filter((i) => i.ready).length);
    expect(matchPages(NAV_ITEMS, "  ")).toHaveLength(NAV_ITEMS.length);
    expect(matchPages(NAV_ITEMS, "room").map((i) => i.href)).toContain("/rooms");
    expect(matchPages(NAV_ITEMS, "RECALL").map((i) => i.href)).toEqual(["/contacts"]);
    expect(matchPages(NAV_ITEMS, "zzz")).toEqual([]);
  });

  it("never offers a page that isn't built yet", () => {
    const items = [...NAV_ITEMS, { ...NAV_ITEMS[0]!, href: "/soon", label: "Soon page", ready: false }];
    expect(matchPages(items, "soon page")).toEqual([]);
  });
});

describe("firstParam", () => {
  it("takes the first value, trims it and caps the length", () => {
    expect(firstParam("  hello ", 10)).toBe("hello");
    expect(firstParam(["first", "second"], 10)).toBe("first");
    expect(firstParam("abcdefghij", 4)).toBe("abcd");
  });

  it("treats missing or blank values as no request", () => {
    for (const none of [undefined, "", "   ", [], [""]]) expect(firstParam(none as never, 10)).toBeUndefined();
  });
});
