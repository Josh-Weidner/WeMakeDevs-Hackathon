import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createHealthServer } from "../src/health-server.js";
import { emptyJobSource } from "../src/jobs.js";
import { handlers } from "../src/handlers/index.js";
import { loadConfig } from "../src/config.js";

let server: ReturnType<typeof createHealthServer> | undefined;

async function start(isReady: () => Promise<boolean>) {
  server = createHealthServer({ isReady });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

describe("health server", () => {
  it("answers /healthz", async () => {
    const base = await start(async () => true);
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", service: "confy-worker" });
  });

  it("reports ready and not ready on /readyz", async () => {
    const ready = await start(async () => true);
    expect((await fetch(`${ready}/readyz`)).status).toBe(200);
    await new Promise<void>((resolve) => server!.close(() => resolve()));

    const down = await start(async () => false);
    const res = await fetch(`${down}/readyz`);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ status: "not_ready", dependencies: { elasticsearch: "down" } });
  });

  it("treats a throwing readiness check as not ready", async () => {
    const base = await start(async () => {
      throw new Error("es down");
    });
    expect((await fetch(`${base}/readyz`)).status).toBe(503);
  });

  it("returns 404 for unknown paths", async () => {
    const base = await start(async () => true);
    expect((await fetch(`${base}/nope`)).status).toBe(404);
  });
});

describe("worker defaults", () => {
  it("has an empty job source and no handlers yet", async () => {
    expect(await emptyJobSource.claimNext()).toBeNull();
    await expect(
      emptyJobSource.complete({ id: "1", type: "t", payload: {}, attempts: 0 }),
    ).resolves.toBeUndefined();
    await expect(
      emptyJobSource.fail({ id: "1", type: "t", payload: {}, attempts: 0 }, "e"),
    ).resolves.toBeUndefined();
    expect(handlers).toEqual({});
  });

  it("loads config with defaults", () => {
    const env = {
      ELASTICSEARCH_URL: "https://example.es.io:443",
      ELASTICSEARCH_API_KEY: "k",
      OPENAI_API_KEY: "sk-test",
    };
    const saved = { ...process.env };
    Object.assign(process.env, env);
    try {
      expect(loadConfig()).toMatchObject({ HEALTH_PORT: 4001, POLL_MIN_MS: 500, POLL_MAX_MS: 5000 });
    } finally {
      process.env = saved;
    }
  });
});
