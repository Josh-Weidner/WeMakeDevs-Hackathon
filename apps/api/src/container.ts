import {
  createAiClient,
  createContactsRepository,
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
import { createHealthService, type HealthService } from "./services/health.js";
import { createPeopleService, type PeopleService } from "./services/people.js";
import { createRoomsService, type RoomsService } from "./services/rooms.js";
import { createTalksService, type TalksService } from "./services/talks.js";

/** Everything the HTTP layer needs. Tests build this with fakes. */
export interface Container {
  logger: Logger;
  services: {
    health: HealthService;
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

  const health = createHealthService({
    service: "confy-api",
    checks: { elasticsearch: () => isEsReachable(es) },
  });

  return {
    logger,
    services: {
      health,
      talks: createTalksService({ talks: createTalksRepository(es), ai, logger }),
      rooms: createRoomsService({ rooms: createRoomsRepository(es) }),
      people: createPeopleService({ people: createPeopleRepository(es), ai, logger }),
      contacts: createContactsService({ contacts: createContactsRepository(es), ai, logger }),
    },
    close: () => es.close(),
  };
}
