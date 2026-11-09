import { baseServiceEnv, loadEnv } from "@confy/shared";
import { z } from "zod";

export const workerEnv = baseServiceEnv.extend({
  HEALTH_PORT: z.coerce.number().int().positive().default(4001),
  POLL_MIN_MS: z.coerce.number().int().positive().default(500),
  POLL_MAX_MS: z.coerce.number().int().positive().default(5_000),
  /** Chat model for clip classification; defaults to the shared DEFAULT_CHAT_MODEL. */
  OPENAI_CHAT_MODEL: z.string().min(1).optional(),
});

export type WorkerConfig = z.infer<typeof workerEnv>;

export function loadConfig(): WorkerConfig {
  return loadEnv(workerEnv);
}
