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
      // No profile by default: /v1/me echoes the persona id, as before.
      me: { get: async (userId: string) => ({ userId }) },
      demand: { forecast: unused("demand.forecast"), recordBookmark: unused("demand.recordBookmark"), recordSearchHits: () => undefined, refresh: async () => undefined, latest: () => [] },
      talks: { search: unused("talks.search"), suggest: unused("talks.suggest"), get: unused("talks.get") },
      schedule: { build: unused("schedule.build") },
      rooms: { list: unused("rooms.list"), get: unused("rooms.get") },
      people: { match: unused("people.match") },
      contacts: { search: unused("contacts.search"), list: unused("contacts.list"), followUp: unused("contacts.followUp") },
      clips: { upload: unused("clips.upload"), status: unused("clips.status") },
      ...services,
    },
    close: async () => undefined,
  };
}
