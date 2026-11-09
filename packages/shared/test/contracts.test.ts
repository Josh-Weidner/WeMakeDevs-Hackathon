import { describe, expect, it } from "vitest";
import { ApiError, HealthResponse, LinkedInUrl, MeResponse, ReadinessResponse, UserId } from "../src/contracts/index.js";
import { INDEX, PRIVATE_INDICES, versionedIndexName } from "../src/es/indices.js";

describe("contracts", () => {
  it("accepts valid user ids and rejects invalid ones", () => {
    expect(UserId.safeParse("demo-alex").success).toBe(true);
    expect(UserId.safeParse("Demo Alex").success).toBe(false);
    expect(UserId.safeParse("").success).toBe(false);
    expect(UserId.safeParse("a".repeat(65)).success).toBe(false);
  });

  it("validates the error envelope", () => {
    expect(ApiError.safeParse({ error: { code: "x", message: "y" } }).success).toBe(true);
    expect(ApiError.safeParse({ error: { code: "x" } }).success).toBe(false);
  });

  it("validates health, readiness and me responses", () => {
    expect(HealthResponse.safeParse({ status: "ok", service: "api" }).success).toBe(true);
    expect(HealthResponse.safeParse({ status: "down", service: "api" }).success).toBe(false);
    expect(
      ReadinessResponse.safeParse({ status: "ready", dependencies: { elasticsearch: "ok" } }).success,
    ).toBe(true);
    expect(
      ReadinessResponse.safeParse({ status: "ready", dependencies: { elasticsearch: "maybe" } }).success,
    ).toBe(false);
    expect(MeResponse.safeParse({ userId: "demo-alex" }).success).toBe(true);
  });
});

describe("indices", () => {
  it("builds versioned index names", () => {
    expect(versionedIndexName(INDEX.talks, 2)).toBe("talks_v2");
  });

  it("marks per-user indices as private", () => {
    expect(PRIVATE_INDICES).toEqual(expect.arrayContaining([INDEX.contacts, INDEX.clips, INDEX.highlights]));
    expect(PRIVATE_INDICES).not.toContain(INDEX.talks);
  });
});

describe("LinkedInUrl", () => {
  it("accepts https links on linkedin.com and its subdomains", () => {
    expect(LinkedInUrl.safeParse("https://www.linkedin.com/in/someone").success).toBe(true);
    expect(LinkedInUrl.safeParse("https://linkedin.com/search/results/people/?keywords=a%20b").success).toBe(true);
    expect(LinkedInUrl.safeParse("https://uk.linkedin.com/in/someone").success).toBe(true);
  });

  it("rejects other hosts, lookalikes, other schemes and junk, so a stored value can never redirect elsewhere", () => {
    for (const bad of [
      "http://www.linkedin.com/in/x",
      "https://linkedin.com.evil.example/in/x",
      "https://evil-linkedin.com/in/x",
      "https://notlinkedin.com/in/x",
      "https://example.com/?u=https://www.linkedin.com",
      "javascript:alert(1)",
      "https://user@evil.example@www.linkedin.com.evil.example/",
      "www.linkedin.com/in/x",
      "",
    ]) {
      expect(LinkedInUrl.safeParse(bad).success, bad).toBe(false);
    }
  });
});
