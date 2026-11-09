import { describe, expect, it } from "vitest";
import { ApiError, HealthResponse, MeResponse, ReadinessResponse, UserId } from "../src/contracts/index.js";
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
