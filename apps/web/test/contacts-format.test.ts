import { describe, expect, it } from "vitest";
import { contactSubtitle, metAt } from "../src/lib/contacts/format";

describe("contacts formatting", () => {
  it("joins role and company", () => {
    expect(contactSubtitle("Staff Security Engineer", "Halden Bank")).toBe("Staff Security Engineer at Halden Bank");
  });

  it("shows when you met in venue time, with the weekday", () => {
    expect(metAt("2026-11-10T12:20:00-07:00")).toBe("Tuesday, November 10, 12:20 PM");
    expect(metAt("2026-11-11T09:05:00-07:00")).toBe("Wednesday, November 11, 9:05 AM");
  });
});
