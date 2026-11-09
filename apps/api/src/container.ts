import { createEsClient, createLogger, isEsReachable, type Logger } from "@confy/shared";
import type { ApiConfig } from "./config.js";
import { createHealthService, type HealthService } from "./services/health.js";

/** Everything the HTTP layer needs. Tests build this with fakes. */
export interface Container {
  logger: Logger;
  services: {
    health: HealthService;
  };
  close(): Promise<void>;
}

/**
 * Composition root: the ONLY place infrastructure clients are constructed
 * and wired into repositories and services.
 */
export function createContainer(config: ApiConfig): Container {
  const logger = createLogger("confy-api", config.LOG_LEVEL);
  const es = createEsClient({ url: config.ELASTICSEARCH_URL, apiKey: config.ELASTICSEARCH_API_KEY });

  const health = createHealthService({
    service: "confy-api",
    checks: { elasticsearch: () => isEsReachable(es) },
  });

  return {
    logger,
    services: { health },
    close: () => es.close(),
  };
}
