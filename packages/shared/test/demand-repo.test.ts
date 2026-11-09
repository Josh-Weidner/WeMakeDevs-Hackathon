import { describe, expect, it, vi } from "vitest";
import type { EsClient } from "../src/es/client.js";
import { createDemandRepository } from "../src/es/repositories/demand.js";
import { createJobsRepository } from "../src/es/repositories/jobs.js";
import { createTalksRepository } from "../src/es/repositories/talks.js";

const event = { "@timestamp": "2026-11-10T12:00:00.000Z", talk_id: "talk-1", room_id: "room-4", event_type: "bookmark" as const, user_id: "demo-alex" };

describe("demand repository", () => {
  it("appends events to the data stream with `create`", async () => {
    const bulk = vi.fn().mockResolvedValue({ errors: false, items: [] });
    await createDemandRepository({ bulk } as unknown as EsClient).record([event]);
    expect(bulk.mock.calls[0]?.[0].operations).toEqual([{ create: { _index: "demand-events" } }, event]);
  });

  it("skips empty batches and throws on bulk errors", async () => {
    const bulk = vi.fn().mockResolvedValue({ errors: true, items: [{ create: { error: { type: "mapper_parsing_exception", reason: "bad" } } }] });
    const repo = createDemandRepository({ bulk } as unknown as EsClient);
    await repo.record([]);
    expect(bulk).not.toHaveBeenCalled();
    await expect(repo.record([event])).rejects.toThrow(/mapper_parsing_exception: bad/);
  });

  it("aggregates bookmarks and search hits per talk inside the window", async () => {
    const search = vi.fn().mockResolvedValue({
      aggregations: {
        talks: {
          buckets: [
            { key: "talk-1", room: { buckets: [{ key: "room-4" }] }, bookmarks: { doc_count: 30 }, searches: { doc_count: 60 } },
            { key: "talk-2", room: { buckets: [] }, bookmarks: { doc_count: 0 }, searches: { doc_count: 2 } },
          ],
        },
      },
    });
    const out = await createDemandRepository({ search } as unknown as EsClient).aggregate("2026-11-10T11:00:00.000Z");

    expect(out).toEqual([
      { talkId: "talk-1", roomId: "room-4", bookmarks: 30, searchHits: 60 },
      { talkId: "talk-2", roomId: "", bookmarks: 0, searchHits: 2 },
    ]);
    expect(search.mock.calls[0]?.[0].query).toEqual({ range: { "@timestamp": { gte: "2026-11-10T11:00:00.000Z" } } });
  });

  it("returns nothing when the stream has no data", async () => {
    const search = vi.fn().mockResolvedValue({});
    await expect(createDemandRepository({ search } as unknown as EsClient).aggregate("x")).resolves.toEqual([]);
  });
});

describe("talks.getMany and jobs.backlog", () => {
  const talk = { title: "T", abstract: "A", level: "beginner", tags: ["x"], track: "P", format: "talk", is_vendor_pitch: false, speaker_ids: ["s"], speaker_names: ["Ann"], room_id: "room-1", start: "2026-11-10T10:30:00-07:00", end: "2026-11-10T11:15:00-07:00" };

  it("fetches many talks at once, skipping missing ids", async () => {
    const mget = vi.fn().mockResolvedValue({ docs: [{ _id: "a", found: true, _source: talk }, { _id: "b", found: false }, { _id: "c", error: {} }] });
    const repo = createTalksRepository({ mget } as unknown as EsClient);
    expect((await repo.getMany(["a", "b", "c"])).map((t) => t.id)).toEqual(["a"]);
    await expect(repo.getMany([])).resolves.toEqual([]);
    expect(mget).toHaveBeenCalledTimes(1);
  });

  it("counts pending and in-progress jobs", async () => {
    const count = vi.fn().mockResolvedValue({ count: 12 });
    await expect(createJobsRepository({ count } as unknown as EsClient).backlog()).resolves.toBe(12);
    expect(JSON.stringify(count.mock.calls[0]?.[0].query)).toContain("processing");
  });

  it("stamps enqueued jobs with the caller's trace context", async () => {
    const { propagation } = await import("@opentelemetry/api");
    vi.spyOn(propagation, "inject").mockImplementation((_c, carrier) => {
      (carrier as Record<string, string>).traceparent = "00-abc-def-01";
    });
    const bulk = vi.fn().mockResolvedValue({ errors: false, items: [] });
    await createJobsRepository({ bulk } as unknown as EsClient).enqueue([{ id: "a", type: "t", payload: {} }, { id: "b", type: "t", payload: {}, traceparent: "explicit" }]);
    const ops = bulk.mock.calls[0]?.[0].operations;
    expect(ops[1].traceparent).toBe("00-abc-def-01");
    expect(ops[3].traceparent).toBe("explicit");
    vi.restoreAllMocks();
  });
});
