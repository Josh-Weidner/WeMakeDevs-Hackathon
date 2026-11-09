import type { JobSource } from "@confy/shared";

// Job types and the ES-backed queue live in @confy/shared (the api enqueues, the worker consumes).
export type { Job, JobHandler, JobSource } from "@confy/shared";

/** Fallback source for tests and dry runs. */
export const emptyJobSource: JobSource = {
  claimNext: async () => null,
  complete: async () => undefined,
  fail: async () => undefined,
};
