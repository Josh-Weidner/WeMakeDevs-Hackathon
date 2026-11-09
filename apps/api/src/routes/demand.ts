import { DemandResponse } from "@confy/shared/contracts";
import type { FastifyInstance } from "fastify";
import type { DemandService } from "../services/demand.js";

/** Room demand forecast: powers the in-app "likely full" warning (same numbers go to Dash0). */
export function demandRoutes(demand: DemandService) {
  return async (app: FastifyInstance) => {
    app.get("/demand", async () => DemandResponse.parse(await demand.forecast()));
  };
}
