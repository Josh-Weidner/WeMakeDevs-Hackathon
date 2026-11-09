import { CLIP_MAX_BYTES, ClipAccepted, ClipStatusResponse, ClipUploadQuery } from "@confy/shared/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ClipsService } from "../services/clips.js";
import { parse } from "./parse.js";

const ClipParams = z.object({ id: z.uuid() });

export function clipsRoutes(clips: ClipsService) {
  return async (app: FastifyInstance) => {
    // Raw audio bodies, scoped to this plugin. Kept in memory only; never written to disk or logged.
    app.addContentTypeParser(/^audio\//, { parseAs: "buffer", bodyLimit: CLIP_MAX_BYTES }, (_request, body, done) => done(null, body));

    app.post("/clips", async (request, reply) => {
      const query = parse(ClipUploadQuery, request.query);
      const mimeType = (request.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();
      const audio = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
      const accepted = await clips.upload(request.userId, { audio, mimeType, query });
      return reply.status(202).send(ClipAccepted.parse(accepted));
    });

    app.get("/clips/:id", async (request) => {
      const { id } = parse(ClipParams, request.params);
      return ClipStatusResponse.parse(await clips.status(request.userId, id));
    });
  };
}
