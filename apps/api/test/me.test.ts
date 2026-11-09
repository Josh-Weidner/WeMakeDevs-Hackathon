import { createLogger, type PeopleRepository } from "@confy/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "../src/server.js";
import { createMeService } from "../src/services/me.js";
import { fakeContainer } from "./helpers.js";

const logger = createLogger("test", "silent");
const profile = { display_name: "Alex Rivera", role: "Platform engineer", bio: "b", company_type: "startup", stack: "k8s", interests: [] };
const URL = "https://www.linkedin.com/in/alex-rivera-demo";

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
});

const fake = () => vi.fn<PeopleRepository["getProfile"]>();

async function get(getProfile: PeopleRepository["getProfile"]) {
  app = await buildServer(fakeContainer(true, { me: createMeService({ people: { getProfile }, logger }) }));
  return app.inject({ method: "GET", url: "/v1/me", headers: { "x-user-id": "demo-alex" } });
}

describe("GET /v1/me", () => {
  it("includes the persona's name and their opt-in LinkedIn URL", async () => {
    const getProfile = fake().mockResolvedValue({ ...profile, linkedin_url: URL });
    const res = await get(getProfile);
    expect(getProfile).toHaveBeenCalledWith("demo-alex");
    expect(res.json()).toEqual({ userId: "demo-alex", displayName: "Alex Rivera", linkedinUrl: URL });
  });

  it("leaves the URL out when the persona didn't share one", async () => {
    const res = await get(fake().mockResolvedValue(profile));
    expect(res.json()).toEqual({ userId: "demo-alex", displayName: "Alex Rivera" });
  });

  it("still answers when the profile lookup fails", async () => {
    const res = await get(fake().mockRejectedValue(new Error("es down")));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ userId: "demo-alex" });
  });
});
