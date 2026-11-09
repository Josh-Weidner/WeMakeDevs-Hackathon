import { BookmarkResponse, TalkResult, TalkSearchQuery, TalkSearchResponse, TalkSuggestQuery, TalkSuggestResponse } from "@confy/shared/contracts";
import type { FastifyInstance } from "fastify";
import type { DemandService } from "../services/demand.js";
import type { TalksService } from "../services/talks.js";
import { parse } from "./parse.js";

export function talksRoutes(talks: TalksService, demand: Pick<DemandService, "recordBookmark">) {
  return async (app: FastifyInstance) => {
    app.get("/talks/search", async (request) =>
      TalkSearchResponse.parse(await talks.search(request.userId, parse(TalkSearchQuery, request.query))),
    );

    app.get("/talks/suggest", async (request) =>
      TalkSuggestResponse.parse(await talks.suggest(parse(TalkSuggestQuery, request.query))),
    );

    app.post<{ Params: { id: string } }>("/talks/:id/bookmark", async (request, reply) => {
      await demand.recordBookmark(request.userId, request.params.id);
      return reply.status(201).send(BookmarkResponse.parse({ talk_id: request.params.id, recorded: true }));
    });

    app.get<{ Params: { id: string } }>("/talks/:id", async (request) =>
      TalkResult.parse(await talks.get(request.params.id)),
    );
  };
}
