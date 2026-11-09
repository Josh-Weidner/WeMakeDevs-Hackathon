import { describe, expect, it, vi } from "vitest";
import type { EsClient } from "@confy/shared";
import { generateSeed } from "../src/generate.js";
import type { JobsRepository } from "@confy/shared";
import { loadSeed } from "../src/load.js";

const data = generateSeed();

describe("loadSeed", () => {
  it("bulk-upserts each collection into its alias with deterministic ids, merging so vectors survive", async () => {
    const bulk = vi.fn().mockResolvedValue({ errors: false, items: [] });
    const results = await loadSeed({ bulk } as unknown as EsClient, data);

    expect(results.map((r) => r.index)).toEqual(["talks", "speakers", "rooms", "attendees", "contacts", "resources"]);
    expect(results.find((r) => r.index === "talks")?.indexed).toBe(data.talks.length);
    const first = bulk.mock.calls[0]?.[0] as { operations: unknown[]; refresh: string };
    expect(first.operations[0]).toEqual({ update: { _index: "talks", _id: data.talks[0]?._id } });
    expect(first.operations[1]).toEqual({ doc: data.talks[0]?._source, doc_as_upsert: true });
    expect(first.operations).toHaveLength(data.talks.length * 2);
    expect(first.refresh).toBe("wait_for");
  });

  it("enqueues one deterministic embed job per embeddable document", async () => {
    const bulk = vi.fn().mockResolvedValue({ errors: false, items: [] });
    const enqueue = vi.fn().mockImplementation(async (jobs: unknown[]) => jobs.length);
    const results = await loadSeed({ bulk } as unknown as EsClient, data, { enqueue } as unknown as JobsRepository);

    expect(enqueue).toHaveBeenCalledTimes(5); // rooms are not embedded
    expect(enqueue.mock.calls[0]?.[0][0]).toEqual({
      id: `embed-talk:${data.talks[0]?._id}`,
      type: "embed-talk",
      payload: { id: data.talks[0]?._id },
    });
    expect(results.find((r) => r.index === "rooms")?.queued).toBe(0);
    expect(results.find((r) => r.index === "talks")?.queued).toBe(data.talks.length);
  });

  it("fails loudly with the first bulk errors", async () => {
    const bulk = vi.fn().mockResolvedValue({
      errors: true,
      items: [{ update: { error: { type: "strict_dynamic_mapping_exception", reason: "bad field" } } }],
    });
    await expect(loadSeed({ bulk } as unknown as EsClient, data)).rejects.toThrow(/talks.*strict_dynamic_mapping_exception: bad field/);
  });
});
