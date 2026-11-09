import { HealthResponse, ReadinessResponse } from "@confy/shared/contracts";
import type { FastifyInstance } from "fastify";
import type { HealthService } from "../services/health.js";

/** k8s probes: /healthz = process alive, /readyz = dependencies reachable. */
export function healthRoutes(health: HealthService) {
  return async (app: FastifyInstance) => {
    app.get("/healthz", async () => HealthResponse.parse(health.liveness()));

    app.get("/readyz", async (_request, reply) => {
      const result = ReadinessResponse.parse(await health.readiness());
      return reply.status(result.status === "ready" ? 200 : 503).send(result);
    });
  };
}
