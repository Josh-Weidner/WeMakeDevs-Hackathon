import type { AiClient, EmbeddingStore, ProductMetrics } from "@confy/shared";
import type { JobHandler } from "../jobs.js";
import { createEmbedHandlers } from "./embed.js";
import { createProcessClipHandler, PROCESS_CLIP_JOB, type ProcessClipDeps } from "./process-clip.js";

/**
 * Job type → handler. Each handler lives in its own file in this folder and calls
 * shared services/repositories. No ES query code in handlers.
 */
export function createHandlers(deps: {
  store: EmbeddingStore;
  ai: Pick<AiClient, "embed" | "chatJson">;
  metrics?: Pick<ProductMetrics, "recordAiError">;
  clipRepos: Omit<ProcessClipDeps, "ai" | "metrics">;
}): Record<string, JobHandler> {
  return {
    ...createEmbedHandlers(deps),
    [PROCESS_CLIP_JOB]: createProcessClipHandler({ ...deps.clipRepos, ai: deps.ai, ...(deps.metrics ? { metrics: deps.metrics } : {}) }),
  };
}
