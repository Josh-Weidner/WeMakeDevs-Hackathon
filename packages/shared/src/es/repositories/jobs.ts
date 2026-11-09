import type { EsClient } from "../client.js";
import { INDEX } from "../indices.js";
import { currentTraceparent } from "../../telemetry/tracing.js";

/** A claimed unit of work from the ES `jobs` index. */
export interface Job {
  id: string;
  type: string;
  payload: unknown;
  attempts: number;
  /** W3C traceparent of the request that enqueued the job, linked to the processing span. */
  traceparent?: string;
  /** Optimistic-concurrency token from the claim. Writes fail with a conflict if someone else took over. */
  claim?: { seqNo: number; primaryTerm: number };
}

/** Where the worker loop gets its work. */
export interface JobSource {
  claimNext(): Promise<Job | null>;
  complete(job: Job): Promise<void>;
  fail(job: Job, error: string): Promise<void>;
}

/** Handlers must be idempotent: a job can be retried after a crash or lease expiry. */
export type JobHandler = (job: Job) => Promise<void>;

export interface NewJob {
  /** Deterministic ids make enqueue idempotent: re-enqueueing resets the same job to pending. */
  id: string;
  type: string;
  payload: unknown;
  traceparent?: string;
}

export interface JobsRepository extends JobSource {
  enqueue(jobs: NewJob[]): Promise<number>;
  /** Jobs waiting or in progress: feeds the `confy.jobs.backlog` metric. */
  backlog(): Promise<number>;
}

export interface JobsRepositoryOptions {
  /** A `processing` job older than this is considered abandoned and becomes claimable again. */
  leaseMs?: number;
  maxAttempts?: number;
  now?: () => Date;
}

export const JOB_LEASE_MS = 120_000;
export const MAX_JOB_ATTEMPTS = 3;
const CLAIM_BATCH = 10;
const MAX_ERROR_LENGTH = 500;

type JobStatus = "pending" | "processing" | "done" | "failed";
interface JobDoc {
  type: string;
  payload: unknown;
  status: JobStatus;
  attempts: number;
  claimed_at?: string;
  error?: string;
  traceparent?: string;
  "@timestamp": string;
}

const isConflict = (err: unknown) => (err as { statusCode?: number }).statusCode === 409;

/**
 * Job queue on the ES `jobs` index (CLAUDE.md §2):
 * pending → processing → done | failed, claimed atomically with `if_seq_no`/`if_primary_term`,
 * abandoned leases reclaimed, at most `maxAttempts` tries.
 */
export function createJobsRepository(es: EsClient, options: JobsRepositoryOptions = {}): JobsRepository {
  const leaseMs = options.leaseMs ?? JOB_LEASE_MS;
  const maxAttempts = options.maxAttempts ?? MAX_JOB_ATTEMPTS;
  const now = options.now ?? (() => new Date());

  /** Guarded write: returns the new claim token, or null if another worker changed the job first. */
  async function guardedUpdate(id: string, claim: Job["claim"], doc: Partial<JobDoc>) {
    try {
      const res = await es.update({
        index: INDEX.jobs,
        id,
        ...(claim ? { if_seq_no: claim.seqNo, if_primary_term: claim.primaryTerm } : {}),
        doc,
      });
      return { seqNo: res._seq_no as number, primaryTerm: res._primary_term as number };
    } catch (err) {
      if (isConflict(err)) return null;
      throw err;
    }
  }

  return {
    async enqueue(jobs) {
      if (jobs.length === 0) return 0;
      const timestamp = now().toISOString();
      // Jobs enqueued from a request carry its trace context so the worker span can link back.
      const traceparent = currentTraceparent();
      const operations = jobs.flatMap((j) => [
        { index: { _index: INDEX.jobs, _id: j.id } },
        {
          type: j.type,
          payload: j.payload,
          status: "pending",
          attempts: 0,
          ...((j.traceparent ?? traceparent) ? { traceparent: j.traceparent ?? traceparent } : {}),
          "@timestamp": timestamp,
        } satisfies JobDoc,
      ]);
      const res = await es.bulk({ operations });
      if (res.errors) {
        const first = res.items.map((i) => i.index?.error).find(Boolean);
        throw new Error(`Failed to enqueue jobs: ${first?.type}: ${first?.reason}`);
      }
      return jobs.length;
    },

    async backlog() {
      const res = await es.count({ index: INDEX.jobs, query: { terms: { status: ["pending", "processing"] } } });
      return res.count;
    },

    async claimNext() {
      const expiry = new Date(now().getTime() - leaseMs).toISOString();
      const res = await es.search<JobDoc>({
        index: INDEX.jobs,
        size: CLAIM_BATCH,
        seq_no_primary_term: true,
        sort: [{ "@timestamp": "asc" }],
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              { term: { status: "pending" } },
              { bool: { filter: [{ term: { status: "processing" } }, { range: { claimed_at: { lte: expiry } } }] } },
            ],
          },
        },
      });

      for (const hit of res.hits.hits) {
        const source = hit._source;
        if (!source || hit._id === undefined) continue;
        const claim = { seqNo: hit._seq_no as number, primaryTerm: hit._primary_term as number };

        if (source.attempts >= maxAttempts) {
          await guardedUpdate(hit._id, claim, { status: "failed", error: "max attempts exceeded" });
          continue;
        }
        const next = await guardedUpdate(hit._id, claim, {
          status: "processing",
          claimed_at: now().toISOString(),
          attempts: source.attempts + 1,
        });
        if (!next) continue; // another worker claimed it first
        return {
          id: hit._id,
          type: source.type,
          payload: source.payload,
          attempts: source.attempts + 1,
          ...(source.traceparent ? { traceparent: source.traceparent } : {}),
          claim: next,
        };
      }
      return null;
    },

    async complete(job) {
      await guardedUpdate(job.id, job.claim, { status: "done" });
    },

    async fail(job, error) {
      await guardedUpdate(job.id, job.claim, {
        status: job.attempts >= maxAttempts ? "failed" : "pending",
        error: error.slice(0, MAX_ERROR_LENGTH),
      });
    },
  };
}
