import { z } from "zod";

/**
 * Parse process.env (or a given record) with a zod schema.
 * Fails fast at startup with a readable list of missing/invalid variables,
 * without ever echoing secret values.
 */
export function loadEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: Record<string, string | undefined> = process.env,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}

/** Variables every backend service needs. Services extend this schema. */
export const baseServiceEnv = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  ELASTICSEARCH_URL: z.string().url(),
  ELASTICSEARCH_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
});

export type BaseServiceEnv = z.infer<typeof baseServiceEnv>;
