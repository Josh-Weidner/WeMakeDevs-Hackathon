import { TalkResult, TalkSearchQuery, TalkSearchResponse, TalkSuggestQuery, TalkSuggestResponse } from "@confy/shared/contracts";
import type { FastifyInstance } from "fastify";
import type { TalksService } from "../services/talks.js";
import { parse } from "./parse.js";

export function talksRoutes(talks: TalksService) {
  return async (app: FastifyInstance) => {
    app.get("/talks/search", async (request) =>
      TalkSearchResponse.parse(await talks.search(parse(TalkSearchQuery, request.query))),
    );

    app.get("/talks/suggest", async (request) =>
      TalkSuggestResponse.parse(await talks.suggest(parse(TalkSuggestQuery, request.query))),
    );

    app.get<{ Params: { id: string } }>("/talks/:id", async (request) =>
      TalkResult.parse(await talks.get(request.params.id)),
    );
  };
}
