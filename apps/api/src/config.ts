import { baseServiceEnv, loadEnv } from "@confy/shared";
import { z } from "zod";

export const apiEnv = baseServiceEnv.extend({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  /** Chat model for request parsing; defaults to the shared DEFAULT_CHAT_MODEL. */
  OPENAI_CHAT_MODEL: z.string().min(1).optional(),
  /** Speech-to-text model for Clip mode; defaults to the shared DEFAULT_TRANSCRIBE_MODEL. */
  OPENAI_TRANSCRIBE_MODEL: z.string().min(1).optional(),
});

export type ApiConfig = z.infer<typeof apiEnv>;

export function loadConfig(): ApiConfig {
  return loadEnv(apiEnv);
}
