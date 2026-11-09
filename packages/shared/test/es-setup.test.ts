import { describe, expect, it, vi } from "vitest";
import type { EsClient } from "../src/es/client.js";
import { EMBEDDING_DIMS } from "../src/ai/openai.js";
import { INDEX, PRIVATE_INDICES } from "../src/es/indices.js";
import { MAPPINGS } from "../src/es/mappings/index.js";
import { setupIndices } from "../src/es/setup.js";

function fakeClient(opts: { aliasExists: boolean; streamExists: boolean }) {
  const indices = {
    existsAlias: vi.fn().mockResolvedValue(opts.aliasExists),
    create: vi.fn().mockResolvedValue({}),
    putMapping: vi.fn().mockResolvedValue({}),
    putIndexTemplate: vi.fn().mockResolvedValue({}),
    createDataStream: vi.fn().mockResolvedValue({}),
    getDataStream: opts.streamExists
      ? vi.fn().mockResolvedValue({})
      : vi.fn().mockRejectedValue(Object.assign(new Error("nf"), { statusCode: 404 })),
  };
  return { client: { indices } as unknown as EsClient, indices };
}

describe("mappings", () => {
  it("define every alias except the demand-events data stream", () => {
    const expected = Object.values(INDEX).filter((a) => a !== INDEX.demandEvents);
    expect(Object.keys(MAPPINGS).sort()).toEqual([...expected].sort());
  });

  it("are strict", () => {
    for (const m of Object.values(MAPPINGS)) expect(m.dynamic).toBe("strict");
  });

  it("require an owner_id keyword on every private index", () => {
    for (const alias of PRIVATE_INDICES) {
      expect(MAPPINGS[alias as keyof typeof MAPPINGS].properties?.owner_id).toEqual({ type: "keyword" });
    }
  });

  it("use the shared embedding dims with cosine similarity", () => {
    for (const m of Object.values(MAPPINGS)) {
      const vec = m.properties?.embedding;
      if (vec) expect(vec).toMatchObject({ type: "dense_vector", dims: EMBEDDING_DIMS, similarity: "cosine" });
    }
  });
});

describe("setupIndices", () => {
  it("creates versioned indices behind aliases and the demand-events data stream", async () => {
    const { client, indices } = fakeClient({ aliasExists: false, streamExists: false });
    const results = await setupIndices(client);
    expect(indices.create).toHaveBeenCalledTimes(Object.keys(MAPPINGS).length);
    expect(indices.create).toHaveBeenCalledWith(
      expect.objectContaining({ index: "talks_v1", aliases: { talks: {} } }),
    );
    expect(indices.putIndexTemplate).toHaveBeenCalledOnce();
    expect(indices.createDataStream).toHaveBeenCalledWith({ name: "demand-events" });
    expect(results.every((r) => r.action === "created")).toBe(true);
  });

  it("updates mappings additively when everything already exists", async () => {
    const { client, indices } = fakeClient({ aliasExists: true, streamExists: true });
    const results = await setupIndices(client);
    expect(indices.create).not.toHaveBeenCalled();
    expect(indices.createDataStream).not.toHaveBeenCalled();
    expect(indices.putMapping).toHaveBeenCalledTimes(Object.keys(MAPPINGS).length);
    expect(results.every((r) => r.action === "updated")).toBe(true);
  });

  it("writes nothing on a dry run", async () => {
    const { client, indices } = fakeClient({ aliasExists: false, streamExists: false });
    const results = await setupIndices(client, { dryRun: true });
    expect(indices.create).not.toHaveBeenCalled();
    expect(indices.putMapping).not.toHaveBeenCalled();
    expect(indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(indices.createDataStream).not.toHaveBeenCalled();
    expect(results).toHaveLength(Object.keys(MAPPINGS).length + 1);
  });

  it("rethrows unexpected data stream errors", async () => {
    const { client, indices } = fakeClient({ aliasExists: true, streamExists: true });
    indices.getDataStream.mockRejectedValue(Object.assign(new Error("boom"), { statusCode: 500 }));
    await expect(setupIndices(client)).rejects.toThrow("boom");
  });
});
