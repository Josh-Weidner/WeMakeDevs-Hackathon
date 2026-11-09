import { describe, expect, it } from "vitest";
import { baseServiceEnv, loadEnv } from "../src/config/env.js";

describe("loadEnv", () => {
  it("parses a valid environment and applies defaults", () => {
    const env = loadEnv(baseServiceEnv, {
      ELASTICSEARCH_URL: "https://example.es.io:443",
      ELASTICSEARCH_API_KEY: "key",
      OPENAI_API_KEY: "sk-test",
    });
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.NODE_ENV).toBe("development");
  });

  it("lists missing variables without echoing values", () => {
    expect(() =>
      loadEnv(baseServiceEnv, { ELASTICSEARCH_URL: "not-a-url", OPENAI_API_KEY: "sk-secret-value" }),
    ).toThrowError(/ELASTICSEARCH_URL[\s\S]*ELASTICSEARCH_API_KEY/);

    try {
      loadEnv(baseServiceEnv, { OPENAI_API_KEY: "sk-secret-value" });
    } catch (err) {
      expect((err as Error).message).not.toContain("sk-secret-value");
    }
  });
});
