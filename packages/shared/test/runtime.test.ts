import { describe, expect, it, vi } from "vitest";
import type { Client } from "@elastic/elasticsearch";
import { createEsClient, isEsReachable } from "../src/es/client.js";
import { METRIC, getMeter } from "../src/telemetry/metrics.js";
import { createLogger } from "../src/telemetry/logger.js";
import { withSpan } from "../src/telemetry/tracing.js";
import { EMBEDDING_DIMS, EMBEDDING_MODEL, createAiClient } from "../src/ai/openai.js";

describe("withSpan", () => {
  it("returns the wrapped function's result", async () => {
    await expect(withSpan("confy.test.ok", { "confy.n": 1 }, async () => 42)).resolves.toBe(42);
  });

  it("rethrows errors from the wrapped function", async () => {
    await expect(
      withSpan("confy.test.fail", {}, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});

describe("metrics and logger", () => {
  it("namespaces metric names and returns a meter", () => {
    expect(Object.values(METRIC).every((n) => n.startsWith("confy."))).toBe(true);
    expect(getMeter("test")).toBeDefined();
  });

  it("creates a logger at the requested level", () => {
    expect(createLogger("svc", "warn").level).toBe("warn");
  });
});

describe("elasticsearch client", () => {
  it("creates a client", () => {
    expect(createEsClient({ url: "https://example.es.io:443", apiKey: "key" })).toBeDefined();
  });

  it("reports reachability and swallows ping errors", async () => {
    const ok = { ping: vi.fn().mockResolvedValue(true) } as unknown as Client;
    const bad = { ping: vi.fn().mockRejectedValue(new Error("down")) } as unknown as Client;
    await expect(isEsReachable(ok)).resolves.toBe(true);
    await expect(isEsReachable(bad)).resolves.toBe(false);
  });
});

describe("ai client", () => {
  it("returns no embeddings for empty input without calling the api", async () => {
    const ai = createAiClient({ apiKey: "sk-test" });
    await expect(ai.embed([])).resolves.toEqual([]);
  });

  it("requests the shared model/dims and orders results by index", async () => {
    const ai = createAiClient({ apiKey: "sk-test" });
    const create = vi.spyOn(ai.raw.embeddings, "create").mockResolvedValue({
      data: [
        { index: 1, embedding: [2], object: "embedding" },
        { index: 0, embedding: [1], object: "embedding" },
      ],
    } as never);
    await expect(ai.embed(["a", "b"])).resolves.toEqual([[1], [2]]);
    expect(create).toHaveBeenCalledWith({
      model: EMBEDDING_MODEL,
      input: ["a", "b"],
      dimensions: EMBEDDING_DIMS,
    });
  });
});
