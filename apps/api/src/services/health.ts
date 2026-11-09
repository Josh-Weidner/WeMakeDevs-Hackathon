import type { HealthResponse, ReadinessResponse } from "@confy/shared/contracts";

export type DependencyCheck = () => Promise<boolean>;

export interface HealthService {
  liveness(): HealthResponse;
  readiness(): Promise<ReadinessResponse>;
}

export function createHealthService(deps: {
  service: string;
  checks: Record<string, DependencyCheck>;
}): HealthService {
  return {
    liveness: () => ({ status: "ok", service: deps.service }),

    async readiness() {
      const entries = await Promise.all(
        Object.entries(deps.checks).map(async ([name, check]) => {
          const ok = await check().catch(() => false);
          return [name, ok ? "ok" : "down"] as const;
        }),
      );
      const dependencies = Object.fromEntries(entries);
      const ready = entries.every(([, status]) => status === "ok");
      return { status: ready ? "ready" : "not_ready", dependencies };
    },
  };
}
