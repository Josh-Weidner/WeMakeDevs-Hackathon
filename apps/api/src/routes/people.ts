import { PeopleMatchQuery, PeopleMatchResponse } from "@confy/shared/contracts";
import type { FastifyInstance } from "fastify";
import type { PeopleService } from "../services/people.js";
import { parse } from "./parse.js";

export function peopleRoutes(people: PeopleService) {
  return async (app: FastifyInstance) => {
    app.get("/people/match", async (request) =>
      PeopleMatchResponse.parse(await people.match(request.userId, parse(PeopleMatchQuery, request.query))),
    );
  };
}
