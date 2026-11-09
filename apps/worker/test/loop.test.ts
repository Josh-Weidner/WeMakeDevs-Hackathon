import { createLogger } from "@confy/shared";
import { describe, expect, it, vi } from "vitest";
import type { Job, JobSource } from "../src/jobs.js";
import { createJobLoop } from "../src/loop.js";

const logger = createLogger("test", "silent");

function queueSource(jobs: Job[]) {
  const completed: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  const source: JobSource = {
    claimNext: async () => jobs.shift() ?? null,
    complete: async (job) => void completed.push(job.id),
    fail: async (job, error) => void failed.push({ id: job.id, error }),
  };
  return { source, completed, failed };
}

const job = (id: string, type: string): Job => ({ id, type, payload: {}, attempts: 0 });

describe("job loop", () => {
  it("dispatches jobs to handlers, completes successes, fails errors and unknown types", async () => {
    const { source, completed, failed } = queueSource([
      job("1", "ok"),
      job("2", "boom"),
      job("3", "unknown"),
    ]);
    const handled: string[] = [];

    const loop = createJobLoop({
      source,
      logger,
      handlers: {
        ok: async (j) => void handled.push(j.id),
        boom: async () => {
          throw new Error("embedding failed");
        },
      },
      minDelayMs: 1,
      maxDelayMs: 1,
      sleep: async () => loop.stop(), // stop as soon as the queue is empty
    });

    await loop.run();

    expect(handled).toEqual(["1"]);
    expect(completed).toEqual(["1"]);
    expect(failed).toEqual([
      { id: "2", error: "embedding failed" },
      { id: "3", error: 'no handler for job type "unknown"' },
    ]);
  });

  it("backs off exponentially while idle, capped at maxDelayMs", async () => {
    const { source } = queueSource([]);
    const delays: number[] = [];
    const loop = createJobLoop({
      source,
      logger,
      handlers: {},
      minDelayMs: 100,
      maxDelayMs: 500,
      sleep: async (ms) => {
        delays.push(ms);
        if (delays.length === 5) loop.stop();
      },
    });

    await loop.run();
    expect(delays).toEqual([100, 200, 400, 500, 500]);
  });

  it("survives claim errors", async () => {
    const claimNext = vi
      .fn<JobSource["claimNext"]>()
      .mockRejectedValueOnce(new Error("es down"))
      .mockResolvedValue(null);
    const loop = createJobLoop({
      source: { claimNext, complete: async () => undefined, fail: async () => undefined },
      logger,
      handlers: {},
      minDelayMs: 1,
      maxDelayMs: 1,
      sleep: async () => {
        if (claimNext.mock.calls.length >= 2) loop.stop();
      },
    });

    await loop.run();
    expect(claimNext).toHaveBeenCalledTimes(2);
  });
});
