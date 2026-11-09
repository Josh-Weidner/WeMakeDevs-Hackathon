import { createAiClient, createEmbeddingStore, createEsClient, createJobsRepository, createLogger, isEsReachable } from "@confy/shared";
import { loadConfig } from "./config.js";
import { createHandlers } from "./handlers/index.js";
import { createHealthServer } from "./health-server.js";
import { createJobLoop } from "./loop.js";

// Composition root for the worker.
const config = loadConfig();
const logger = createLogger("confy-worker", config.LOG_LEVEL);
const es = createEsClient({ url: config.ELASTICSEARCH_URL, apiKey: config.ELASTICSEARCH_API_KEY });

const handlers = createHandlers({
  store: createEmbeddingStore(es),
  ai: createAiClient({ apiKey: config.OPENAI_API_KEY }),
});

const loop = createJobLoop({
  source: createJobsRepository(es),
  handlers,
  logger,
  minDelayMs: config.POLL_MIN_MS,
  maxDelayMs: config.POLL_MAX_MS,
});

const health = createHealthServer({ isReady: () => isEsReachable(es) });
health.listen(config.HEALTH_PORT, () => logger.info({ port: config.HEALTH_PORT }, "worker health server listening"));

function shutdown(signal: string) {
  logger.info({ signal }, "shutting down after current job");
  loop.stop();
}
process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

logger.info("job loop started");
await loop.run();
health.close();
await es.close();
process.exit(0);
