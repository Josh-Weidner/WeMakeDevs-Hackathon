import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";
import type { Container } from "./container.js";
import { registerErrorHandler } from "./errors.js";
import { registerUserContext } from "./plugins/user-context.js";
import { healthRoutes } from "./routes/health.js";
import { clipsRoutes } from "./routes/clips.js";
import { contactsRoutes } from "./routes/contacts.js";
import { demandRoutes } from "./routes/demand.js";
import { meRoutes } from "./routes/me.js";
import { peopleRoutes } from "./routes/people.js";
import { roomsRoutes } from "./routes/rooms.js";
import { scheduleRoutes } from "./routes/schedule.js";
import { talksRoutes } from "./routes/talks.js";

/** Builds the app without listening, so tests can use `app.inject()`. */
export async function buildServer(container: Container): Promise<FastifyInstance> {
  const app = Fastify({
    // Fastify bundles its own pino types; our pino Logger is runtime-compatible.
    loggerInstance: container.logger as unknown as FastifyBaseLogger,
  });

  registerErrorHandler(app);
  registerUserContext(app);

  await app.register(healthRoutes(container.services.health));
  await app.register(
    async (v1) => {
      await v1.register(meRoutes(container.services.me));
      await v1.register(talksRoutes(container.services.talks, container.services.demand));
      await v1.register(demandRoutes(container.services.demand));
      await v1.register(scheduleRoutes(container.services.schedule));
      await v1.register(roomsRoutes(container.services.rooms));
      await v1.register(peopleRoutes(container.services.people));
      await v1.register(contactsRoutes(container.services.contacts));
      await v1.register(clipsRoutes(container.services.clips));
      // Still to come: intros
    },
    { prefix: "/v1" },
  );

  return app;
}
