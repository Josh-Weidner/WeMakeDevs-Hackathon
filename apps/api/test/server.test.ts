import { createLogger } from "@confy/shared";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Container } from "../src/container.js";
import { buildServer } from "../src/server.js";
import { createHealthService } from "../src/services/health.js";

function fakeContainer(esUp: boolean): Container {
  return {
    logger: createLogger("test", "silent"),
    services: {
      health: createHealthService({
        service: "confy-api",
        checks: { elasticsearch: async () => esUp },
      }),
    },
    close: async () => undefined,
  };
}

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
});

describe("health routes", () => {
  it("GET /healthz is always ok", async () => {
    app = await buildServer(fakeContainer(false));
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", service: "confy-api" });
  });

  it("GET /readyz is 503 when Elasticsearch is down", async () => {
    app = await buildServer(fakeContainer(false));
    const res = await app.inject({ method: "GET", url: "/readyz" });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: "not_ready", dependencies: { elasticsearch: "down" } });
  });

  it("GET /readyz is 200 when dependencies are up", async () => {
    app = await buildServer(fakeContainer(true));
    const res = await app.inject({ method: "GET", url: "/readyz" });
    expect(res.statusCode).toBe(200);
  });
});

describe("user context", () => {
  it("defaults to the demo persona", async () => {
    app = await buildServer(fakeContainer(true));
    const res = await app.inject({ method: "GET", url: "/v1/me" });
    expect(res.json()).toEqual({ userId: "demo-alex" });
  });

  it("uses the x-user-id header", async () => {
    app = await buildServer(fakeContainer(true));
    const res = await app.inject({ method: "GET", url: "/v1/me", headers: { "x-user-id": "demo-sam" } });
    expect(res.json()).toEqual({ userId: "demo-sam" });
  });

  it("rejects malformed ids with the error envelope", async () => {
    app = await buildServer(fakeContainer(true));
    const res = await app.inject({ method: "GET", url: "/v1/me", headers: { "x-user-id": "Robert'); DROP" } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: "validation_error", message: "Invalid x-user-id header" } });
  });

  it("unknown routes return the error envelope", async () => {
    app = await buildServer(fakeContainer(true));
    const res = await app.inject({ method: "GET", url: "/v1/nope" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("not_found");
  });
});
