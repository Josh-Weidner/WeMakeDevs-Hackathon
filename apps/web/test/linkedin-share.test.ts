import { describe, expect, it } from "vitest";
import { DEMO_SHARE_LINKEDIN_URL, configuredShareUrl, parseLinkedInUrl, resolveShareUrl } from "../src/lib/linkedin/share";

describe("LinkedIn share QR", () => {
  it("accepts only https linkedin.com URLs", () => {
    expect(parseLinkedInUrl(" https://www.linkedin.com/in/someone/ ")).toBe("https://www.linkedin.com/in/someone/");
    expect(parseLinkedInUrl("http://www.linkedin.com/in/someone")).toBeNull();
    expect(parseLinkedInUrl("https://linkedin.com.evil.example/in/x")).toBeNull();
    expect(parseLinkedInUrl("not a url")).toBeNull();
    expect(parseLinkedInUrl("")).toBeNull();
  });

  it("defaults to the demo profile, and the env var can change or disable it", () => {
    expect(configuredShareUrl(undefined)).toBe(DEMO_SHARE_LINKEDIN_URL);
    expect(configuredShareUrl("https://www.linkedin.com/in/other/")).toBe("https://www.linkedin.com/in/other/");
    expect(configuredShareUrl("")).toBeUndefined();
  });

  it("prefers the URL pasted on this device, then the configured one, then the profile", () => {
    const profile = "https://www.linkedin.com/in/profile/";
    const configured = "https://www.linkedin.com/in/demo/";
    const stored = "https://www.linkedin.com/in/pasted/";
    expect(resolveShareUrl({ stored, configured, profile })).toEqual({ url: stored, source: "device" });
    expect(resolveShareUrl({ stored: "junk", configured, profile })).toEqual({ url: configured, source: "configured" });
    expect(resolveShareUrl({ profile })).toEqual({ url: profile, source: "profile" });
    expect(resolveShareUrl({})).toBeNull();
  });
});
