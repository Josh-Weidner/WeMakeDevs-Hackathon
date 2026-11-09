import { createLogger } from "@confy/shared";
import type { Container } from "../src/container.js";
import { createHealthService } from "../src/services/health.js";

/** A container whose services are inert fakes; tests override just the ones they exercise. */
export function fakeContainer(esUp = true, services: Partial<Container["services"]> = {}): Container {
  const unused = (name: string) => () => Promise.reject(new Error(`${name} not stubbed`));
  return {
    logger: createLogger("test", "silent"),
    services: {
      health: createHealthService({ service: "confy-api", checks: { elasticsearch: async () => esUp } }),
      talks: { search: unused("talks.search"), suggest: unused("talks.suggest"), get: unused("talks.get") },
      rooms: { list: unused("rooms.list"), get: unused("rooms.get") },
      people: { match: unused("people.match") },
      contacts: { search: unused("contacts.search") },
      ...services,
    },
    close: async () => undefined,
  };
}
