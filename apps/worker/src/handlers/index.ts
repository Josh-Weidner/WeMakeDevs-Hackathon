import type { AiClient, EmbeddingStore, ProductMetrics } from "@confy/shared";
import type { JobHandler } from "../jobs.js";
import { createEmbedHandlers } from "./embed.js";

/**
 * Job type → handler. Each handler lives in its own file in this folder and calls
 * shared services/repositories. No ES query code in handlers.
 * Planned: transcribe-clip, classify-clip.
 */
export function createHandlers(deps: {
  store: EmbeddingStore;
  ai: Pick<AiClient, "embed">;
  metrics?: Pick<ProductMetrics, "recordAiError">;
}): Record<string, JobHandler> {
  return { ...createEmbedHandlers(deps) };
}
