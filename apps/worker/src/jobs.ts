/** A claimed unit of work from the ES `jobs` index. */
export interface Job {
  id: string;
  type: string;
  payload: unknown;
  attempts: number;
  /** W3C traceparent of the request that enqueued the job, linked to the processing span. */
  traceparent?: string;
}

/**
 * Where jobs come from. The real implementation (ES `jobs` index with optimistic-concurrency
 * claims and lease timeouts; see CLAUDE.md §2) lands in its own feature PR.
 */
export interface JobSource {
  claimNext(): Promise<Job | null>;
  complete(job: Job): Promise<void>;
  fail(job: Job, error: string): Promise<void>;
}

/** Handlers must be idempotent: a job can be retried after a crash or lease expiry. */
export type JobHandler = (job: Job) => Promise<void>;

/** Placeholder source until the ES jobs repository exists. */
export const emptyJobSource: JobSource = {
  claimNext: async () => null,
  complete: async () => undefined,
  fail: async () => undefined,
};
