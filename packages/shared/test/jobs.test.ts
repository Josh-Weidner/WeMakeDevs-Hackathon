import { describe, expect, it, vi } from "vitest";
import type { EsClient } from "../src/es/client.js";
import { createJobsRepository, type Job } from "../src/es/repositories/jobs.js";

const NOW = new Date("2026-11-09T12:00:00.000Z");
const conflict = () => Object.assign(new Error("version conflict"), { statusCode: 409 });

const hit = (id: string, over: Record<string, unknown> = {}) => ({
  _id: id,
  _seq_no: 5,
  _primary_term: 1,
  _source: { type: "embed-talk", payload: { id: "talk-001" }, status: "pending", attempts: 0, "@timestamp": "t", ...over },
});

function setup(hits: unknown[], update = vi.fn().mockResolvedValue({ _seq_no: 6, _primary_term: 1 })) {
  const es = { search: vi.fn().mockResolvedValue({ hits: { hits } }), update, bulk: vi.fn() } as unknown as EsClient & {
    search: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    bulk: ReturnType<typeof vi.fn>;
  };
  return { es, repo: createJobsRepository(es, { now: () => NOW }) };
}

describe("jobs repository: claim", () => {
  it("claims the oldest job with optimistic concurrency and bumps attempts", async () => {
    const { es, repo } = setup([hit("j1"), hit("j2")]);
    const job = await repo.claimNext();

    expect(job).toMatchObject({ id: "j1", type: "embed-talk", attempts: 1, claim: { seqNo: 6, primaryTerm: 1 } });
    expect(es.update).toHaveBeenCalledWith({
      index: "jobs",
      id: "j1",
      if_seq_no: 5,
      if_primary_term: 1,
      doc: { status: "processing", claimed_at: NOW.toISOString(), attempts: 1 },
    });
    expect(es.update).toHaveBeenCalledTimes(1);
  });

  it("queries pending jobs and processing jobs whose lease expired", async () => {
    const { es, repo } = setup([]);
    await expect(repo.claimNext()).resolves.toBeNull();
    const body = JSON.stringify(es.search.mock.calls[0]?.[0].query);
    expect(body).toContain('"pending"');
    expect(body).toContain("2026-11-09T11:58:00.000Z"); // now - 2 min lease
  });

  it("skips a job another worker claimed first (version conflict)", async () => {
    const update = vi.fn().mockRejectedValueOnce(conflict()).mockResolvedValue({ _seq_no: 9, _primary_term: 1 });
    const { repo } = setup([hit("j1"), hit("j2")], update);
    expect((await repo.claimNext())?.id).toBe("j2");
  });

  it("fails jobs that already used all attempts instead of running them again", async () => {
    const { es, repo } = setup([hit("j1", { status: "processing", attempts: 3 }), hit("j2")]);
    expect((await repo.claimNext())?.id).toBe("j2");
    expect(es.update).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: "j1", doc: { status: "failed", error: "max attempts exceeded" } }));
  });

  it("returns null when every candidate is lost, and ignores malformed hits", async () => {
    const { repo } = setup([hit("j1"), { _id: "j2" }], vi.fn().mockRejectedValue(conflict()));
    await expect(repo.claimNext()).resolves.toBeNull();
  });

  it("rethrows non-conflict errors", async () => {
    const { repo } = setup([hit("j1")], vi.fn().mockRejectedValue(new Error("es down")));
    await expect(repo.claimNext()).rejects.toThrow("es down");
  });
});

describe("jobs repository: finish", () => {
  const job: Job = { id: "j1", type: "embed-talk", payload: {}, attempts: 1, claim: { seqNo: 6, primaryTerm: 1 } };

  it("completes with the claim token", async () => {
    const { es, repo } = setup([]);
    await repo.complete(job);
    expect(es.update).toHaveBeenCalledWith({ index: "jobs", id: "j1", if_seq_no: 6, if_primary_term: 1, doc: { status: "done" } });
  });

  it("returns a failed job to pending until attempts run out, truncating the error", async () => {
    const { es, repo } = setup([]);
    await repo.fail(job, "x".repeat(900));
    const retry = es.update.mock.calls[0]?.[0].doc;
    expect(retry.status).toBe("pending");
    expect(retry.error).toHaveLength(500);

    await repo.fail({ ...job, attempts: 3 }, "boom");
    expect(es.update.mock.calls[1]?.[0].doc).toEqual({ status: "failed", error: "boom" });
  });

  it("does not overwrite a job another worker took over", async () => {
    const { repo } = setup([], vi.fn().mockRejectedValue(conflict()));
    await expect(repo.complete(job)).resolves.toBeUndefined();
  });

  it("writes without a concurrency guard when the job has no claim", async () => {
    const { es, repo } = setup([]);
    await repo.complete({ ...job, claim: undefined });
    expect(es.update.mock.calls[0]?.[0]).not.toHaveProperty("if_seq_no");
  });
});

describe("jobs repository: enqueue", () => {
  it("bulk-indexes pending jobs with the given ids", async () => {
    const { es, repo } = setup([]);
    es.bulk.mockResolvedValue({ errors: false, items: [] });
    await expect(repo.enqueue([{ id: "embed-talk:t1", type: "embed-talk", payload: { id: "t1" }, traceparent: "00-abc" }])).resolves.toBe(1);

    const ops = es.bulk.mock.calls[0]?.[0].operations;
    expect(ops[0]).toEqual({ index: { _index: "jobs", _id: "embed-talk:t1" } });
    expect(ops[1]).toMatchObject({ status: "pending", attempts: 0, traceparent: "00-abc", "@timestamp": NOW.toISOString() });
  });

  it("does nothing for an empty batch and throws on bulk errors", async () => {
    const { es, repo } = setup([]);
    await expect(repo.enqueue([])).resolves.toBe(0);
    expect(es.bulk).not.toHaveBeenCalled();

    es.bulk.mockResolvedValue({ errors: true, items: [{ index: { error: { type: "mapper_parsing_exception", reason: "bad" } } }] });
    await expect(repo.enqueue([{ id: "a", type: "t", payload: {} }])).rejects.toThrow(/mapper_parsing_exception: bad/);
  });
});
