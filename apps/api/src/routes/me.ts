import { MeResponse } from "@confy/shared/contracts";
import type { FastifyInstance } from "fastify";
import type { MeService } from "../services/me.js";

/** The active demo persona and its opt-in profile links (persona switcher, share-your-LinkedIn QR). */
export function meRoutes(me: MeService) {
  return async (app: FastifyInstance) => {
    app.get("/me", async (request) => MeResponse.parse(await me.get(request.userId)));
  };
}
