import type { EmbeddingStore } from "@confy/shared";
import { describe, expect, it, vi } from "vitest";
import { createEmbedHandlers } from "../src/handlers/embed.js";
import type { Job } from "../src/jobs.js";

const speaker = { name: "Ann Lee", bio: "Bio", company: "Co", talk_ids: [] };
const job = (payload: unknown): Job => ({ id: "j", type: "embed-speaker", payload, attempts: 1 });

function setup(source: Record<string, unknown> | null, embed = vi.fn().mockResolvedValue([[0.1, 0.2]])) {
  const store = { get: vi.fn().mockResolvedValue(source), setEmbedding: vi.fn().mockResolvedValue(undefined) } satisfies EmbeddingStore;
  return { store, embed, handlers: createEmbedHandlers({ store, ai: { embed } }) };
}

describe("embed handlers", () => {
  it("embeds the document text and writes the vector back", async () => {
    const { store, embed, handlers } = setup(speaker);
    await handlers["embed-speaker"]!(job({ id: "spk-01" }));

    expect(store.get).toHaveBeenCalledWith("speaker", "spk-01");
    expect(embed).toHaveBeenCalledWith([expect.stringContaining("Ann Lee")]);
    expect(store.setEmbedding).toHaveBeenCalledWith("speaker", "spk-01", [0.1, 0.2]);
  });

  it("registers one handler per embeddable kind", () => {
    expect(Object.keys(setup(null).handlers)).toHaveLength(5);
  });

  it("fails (so the job is retried, then failed) when the document is missing", async () => {
    const { store, handlers } = setup(null);
    await expect(handlers["embed-speaker"]!(job({ id: "gone" }))).rejects.toThrow('speaker "gone" not found');
    expect(store.setEmbedding).not.toHaveBeenCalled();
  });

  it("rejects an invalid payload", async () => {
    const { handlers } = setup(speaker);
    await expect(handlers["embed-speaker"]!(job({}))).rejects.toThrow();
  });

  it("fails when the embedding service returns nothing", async () => {
    const { store, handlers } = setup(speaker, vi.fn().mockResolvedValue([]));
    await expect(handlers["embed-speaker"]!(job({ id: "spk-01" }))).rejects.toThrow("no vector");
    expect(store.setEmbedding).not.toHaveBeenCalled();
  });
});
