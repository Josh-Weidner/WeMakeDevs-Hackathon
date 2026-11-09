import { linksFromTraceparent, withSpan, type Logger } from "@confy/shared";
import type { Job, JobHandler, JobSource } from "./jobs.js";

export interface JobLoopOptions {
  source: JobSource;
  handlers: Record<string, JobHandler>;
  logger: Logger;
  minDelayMs: number;
  maxDelayMs: number;
  sleep?: (ms: number) => Promise<void>;
  /** Called whenever a job attempt fails (feeds the `confy.jobs.failed` metric). */
  onJobFailed?: (job: Job) => void;
}

export interface JobLoop {
  /** Resolves when the loop has stopped. */
  run(): Promise<void>;
  /** Finish the in-flight job, then stop. */
  stop(): void;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createJobLoop(options: JobLoopOptions): JobLoop {
  const sleep = options.sleep ?? defaultSleep;
  let stopping = false;

  async function processJob(job: Job): Promise<void> {
    const handler = options.handlers[job.type];
    // Link (not parent) back to the request that enqueued the job: the work happens later, in another process.
    const links = linksFromTraceparent(job.traceparent);
    await withSpan("confy.jobs.process", { "confy.job_type": job.type, "confy.job_attempts": job.attempts }, async () => {
      if (!handler) {
        options.onJobFailed?.(job);
        await options.source.fail(job, `no handler for job type "${job.type}"`);
        options.logger.warn({ jobId: job.id, jobType: job.type }, "no handler for job type");
        return;
      }
      try {
        await handler(job);
        await options.source.complete(job);
      } catch (err) {
        // Store only the message: never payload contents (may contain user text).
        const message = err instanceof Error ? err.message : String(err);
        options.onJobFailed?.(job);
        await options.source.fail(job, message);
        options.logger.error({ jobId: job.id, jobType: job.type, err }, "job failed");
      }
    }, { links });
  }

  return {
    stop() {
      stopping = true;
    },

    async run() {
      let delay = options.minDelayMs;
      while (!stopping) {
        let job: Job | null = null;
        try {
          job = await options.source.claimNext();
        } catch (err) {
          options.logger.error({ err }, "failed to claim job");
        }

        if (job) {
          delay = options.minDelayMs;
          await processJob(job);
          continue;
        }

        // Idle (or claim error): back off exponentially up to maxDelayMs.
        await sleep(delay);
        delay = Math.min(delay * 2, options.maxDelayMs);
      }
      options.logger.info("job loop stopped");
    },
  };
}
