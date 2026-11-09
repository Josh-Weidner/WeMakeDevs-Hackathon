import { baseServiceEnv, loadEnv } from "@confy/shared";
import { z } from "zod";

export const apiEnv = baseServiceEnv.extend({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
});

export type ApiConfig = z.infer<typeof apiEnv>;

export function loadConfig(): ApiConfig {
  return loadEnv(apiEnv);
}
