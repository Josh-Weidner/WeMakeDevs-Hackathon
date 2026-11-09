import { ScheduleRequest, ScheduleResponse } from "@confy/shared/contracts";
import type { FastifyInstance } from "fastify";
import type { ScheduleService } from "../services/schedule.js";
import { parse } from "./parse.js";

export function scheduleRoutes(schedule: ScheduleService) {
  return async (app: FastifyInstance) => {
    app.post("/schedule/build", async (request) =>
      ScheduleResponse.parse(await schedule.build(parse(ScheduleRequest, request.body))),
    );
  };
}
