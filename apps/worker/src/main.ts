import {
  createAiClient,
  createClipsRepository,
  createContactsRepository,
  createEmbeddingStore,
  createHighlightsRepository,
  createResourcesRepository,
  createTalksRepository,
  createEsClient,
  createJobsRepository,
  createLogger,
  createProductMetrics,
  isEsReachable,
} from "@confy/shared";
import { loadConfig } from "./config.js";
import { createHandlers } from "./handlers/index.js";
import { createHealthServer } from "./health-server.js";
import { createJobLoop } from "./loop.js";

const BACKLOG_REFRESH_MS = 10_000;

// Composition root for the worker.
const config = loadConfig();
const logger = createLogger("confy-worker", config.LOG_LEVEL);
const es = createEsClient({ url: config.ELASTICSEARCH_URL, apiKey: config.ELASTICSEARCH_API_KEY });

const metrics = createProductMetrics("confy-worker");

const handlers = createHandlers({
  store: createEmbeddingStore(es),
  ai: createAiClient({ apiKey: config.OPENAI_API_KEY, ...(config.OPENAI_CHAT_MODEL ? { chatModel: config.OPENAI_CHAT_MODEL } : {}) }),
  metrics,
  clipRepos: {
    clips: createClipsRepository(es),
    contacts: createContactsRepository(es),
    highlights: createHighlightsRepository(es),
    resources: createResourcesRepository(es),
    talks: createTalksRepository(es),
  },
});

// Claim only what this build can handle, so workers on different versions can share one queue.
const jobs = createJobsRepository(es, { types: Object.keys(handlers) });

// The backlog gauge reads a cached value (metric callbacks must not do I/O); a timer keeps it fresh.
let backlog: number | undefined;
metrics.observeBacklog(() => backlog);
const refreshBacklog = () => jobs.backlog().then((n) => (backlog = n), (err: unknown) => logger.warn({ err }, "backlog refresh failed"));
void refreshBacklog();
const backlogTimer = setInterval(() => void refreshBacklog(), BACKLOG_REFRESH_MS);
backlogTimer.unref();

const loop = createJobLoop({
  source: jobs,
  onJobFailed: (job) => metrics.recordJobFailed(job.type),
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
clearInterval(backlogTimer);
health.close();
await es.close();
process.exit(0);
