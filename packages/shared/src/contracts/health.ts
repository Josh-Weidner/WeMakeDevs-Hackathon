import { z } from "zod";

export const DependencyStatus = z.enum(["ok", "down"]);

export const HealthResponse = z.object({
  status: z.literal("ok"),
  service: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

export const ReadinessResponse = z.object({
  status: z.enum(["ready", "not_ready"]),
  dependencies: z.record(z.string(), DependencyStatus),
});
export type ReadinessResponse = z.infer<typeof ReadinessResponse>;
