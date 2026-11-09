import { DEFAULT_DEMO_USER_ID, USER_ID_HEADER, UserId } from "@confy/shared/contracts";
import type { FastifyInstance } from "fastify";
import { ValidationError } from "../errors.js";

declare module "fastify" {
  interface FastifyRequest {
    /** Demo persona id from the x-user-id header (no auth, by decision). */
    userId: string;
  }
}

/** Resolves the demo persona once per request so services receive it as an explicit argument. */
export function registerUserContext(app: FastifyInstance): void {
  app.decorateRequest("userId", "");

  app.addHook("onRequest", async (request) => {
    const raw = request.headers[USER_ID_HEADER];
    if (raw === undefined) {
      request.userId = DEFAULT_DEMO_USER_ID;
      return;
    }
    const parsed = UserId.safeParse(Array.isArray(raw) ? raw[0] : raw);
    if (!parsed.success) throw new ValidationError(`Invalid ${USER_ID_HEADER} header`);
    request.userId = parsed.data;
  });
}
