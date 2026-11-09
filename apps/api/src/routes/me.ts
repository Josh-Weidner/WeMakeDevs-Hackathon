import { MeResponse } from "@confy/shared/contracts";
import type { FastifyInstance } from "fastify";

/** Echoes the active demo persona; used by the web persona switcher. */
export async function meRoutes(app: FastifyInstance) {
  app.get("/me", async (request) => MeResponse.parse({ userId: request.userId }));
}
