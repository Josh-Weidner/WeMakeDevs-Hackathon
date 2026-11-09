import { describe, expect, it } from "vitest";
import { initials, introPreferenceLabel, subtitle } from "../src/lib/people/format";

describe("people formatting", () => {
  it("builds avatar initials from first and last name", () => {
    expect(initials("Rafael Costa")).toBe("RC");
    expect(initials("Marisol Ana Okafor")).toBe("MO");
    expect(initials("  keiko   tanaka ")).toBe("KT");
    expect(initials("Madonna")).toBe("M");
    expect(initials("Zoë Åberg")).toBe("ZÅ");
  });

  it("falls back to a placeholder when there is no usable name", () => {
    expect(initials("")).toBe("?");
    expect(initials(" - . ")).toBe("?");
  });

  it("describes how someone prefers to meet, in words", () => {
    expect(introPreferenceLabel("quiet")).toBe("Prefers a quiet setting");
    expect(introPreferenceLabel("1:1")).toBe("Happy to chat 1:1");
  });

  it("joins role and organization type", () => {
    expect(subtitle("Staff Engineer", "bank")).toBe("Staff Engineer · bank");
  });
});
