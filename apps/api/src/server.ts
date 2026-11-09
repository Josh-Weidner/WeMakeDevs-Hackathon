import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";
import type { Container } from "./container.js";
import { registerErrorHandler } from "./errors.js";
import { registerUserContext } from "./plugins/user-context.js";
import { healthRoutes } from "./routes/health.js";
import { meRoutes } from "./routes/me.js";

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
      await v1.register(meRoutes);
      // Feature routes register here: talks, schedule, people, contacts, clips, demand, intros
    },
    { prefix: "/v1" },
  );

  return app;
}
