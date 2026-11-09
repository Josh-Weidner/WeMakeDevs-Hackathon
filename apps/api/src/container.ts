import {
  createAiClient,
  createContactsRepository,
  createDemandRepository,
  createProductMetrics,
  createEsClient,
  createLogger,
  createPeopleRepository,
  createRoomsRepository,
  createTalksRepository,
  isEsReachable,
  type Logger,
} from "@confy/shared";
import type { ApiConfig } from "./config.js";
import { createContactsService, type ContactsService } from "./services/contacts.js";
import { createDemandService, type DemandService } from "./services/demand.js";
import { createHealthService, type HealthService } from "./services/health.js";
import { createPeopleService, type PeopleService } from "./services/people.js";
import { createRoomsService, type RoomsService } from "./services/rooms.js";
import { createTalksService, type TalksService } from "./services/talks.js";

const DEMAND_REFRESH_MS = 15_000;

/** Everything the HTTP layer needs. Tests build this with fakes. */
export interface Container {
  logger: Logger;
  services: {
    health: HealthService;
    demand: DemandService;
    talks: TalksService;
    rooms: RoomsService;
    people: PeopleService;
    contacts: ContactsService;
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

  const ai = createAiClient({ apiKey: config.OPENAI_API_KEY });

  const metrics = createProductMetrics("confy-api");
  const talksRepo = createTalksRepository(es);
  const roomsRepo = createRoomsRepository(es);
  const demand = createDemandService({ demand: createDemandRepository(es), talks: talksRepo, rooms: roomsRepo, metrics, logger });

  // The occupancy gauge reads the cached forecast; a background refresh keeps it current for Dash0.
  metrics.observeOccupancy(() => demand.latest());
  void demand.refresh();
  const refresher = setInterval(() => void demand.refresh(), DEMAND_REFRESH_MS);
  refresher.unref();

  const health = createHealthService({
    service: "confy-api",
    checks: { elasticsearch: () => isEsReachable(es) },
  });

  return {
    logger,
    services: {
      health,
      demand,
      talks: createTalksService({ talks: talksRepo, ai, logger, demand, metrics }),
      rooms: createRoomsService({ rooms: roomsRepo }),
      people: createPeopleService({ people: createPeopleRepository(es), ai, logger, metrics }),
      contacts: createContactsService({ contacts: createContactsRepository(es), ai, logger, metrics }),
    },
    close: () => {
      clearInterval(refresher);
      return es.close();
    },
  };
}
