import { createLogger, type ClipDoc } from "@confy/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "../src/server.js";
import { createClipsService } from "../src/services/clips.js";
import { fakeContainer } from "./helpers.js";

const logger = createLogger("test", "silent");
const CLIP_ID = "6f1c2c4e-8a3b-4d5e-9f10-1a2b3c4d5e6f";
const audio = Buffer.alloc(4096, 1);

const clipDoc: ClipDoc = {
  owner_id: "demo-alex",
  kind: "highlight",
  duration_s: 60,
  transcript: "ResourceQuotas cap what each namespace can use.",
  summary: "The speaker explained ResourceQuotas.",
  highlight_id: `clip-${CLIP_ID}`,
  result: { kind: "highlight", topic_tags: ["quotas"], experiment: null, resources: [], highlight_id: `clip-${CLIP_ID}` },
  "@timestamp": "2026-11-10T22:00:00.000Z",
};

function deps(overrides: { transcript?: string | Error; clip?: ClipDoc | null; job?: unknown } = {}) {
  const t = overrides.transcript ?? "Hi, I'm Dana from Acme Bank.";
  return {
    ai: { transcribe: vi.fn(t instanceof Error ? () => Promise.reject(t) : () => Promise.resolve(t)) },
    jobs: { enqueue: vi.fn().mockResolvedValue(1), get: vi.fn().mockResolvedValue(overrides.job ?? null) },
    clips: { get: vi.fn().mockResolvedValue(overrides.clip ?? null) },
    logger,
    metrics: { recordAiError: vi.fn() },
  };
}

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
});

async function server(d: ReturnType<typeof deps>) {
  app = await buildServer(fakeContainer(true, { clips: createClipsService(d) }));
  return app;
}

describe("POST /v1/clips", () => {
  it("transcribes in memory and queues only the transcript for the worker", async () => {
    const d = deps();
    const res = await (await server(d)).inject({
      method: "POST",
      url: "/v1/clips?durationS=60&talkId=talk-014",
      headers: { "content-type": "audio/webm;codecs=opus", "x-user-id": "demo-alex" },
      payload: audio,
    });

    expect(res.statusCode).toBe(202);
    const { id, status } = res.json();
    expect(status).toBe("processing");
    expect(d.ai.transcribe).toHaveBeenCalledWith(expect.any(Uint8Array), "audio/webm");
    const [[job]] = d.jobs.enqueue.mock.calls[0]!;
    expect(job).toEqual({
      id: `clip-${id}`,
      type: "process-clip",
      payload: { clip_id: id, owner_id: "demo-alex", transcript: "Hi, I'm Dana from Acme Bank.", duration_s: 60, talk_id: "talk-014" },
    });
    // No audio is ever handed to the queue.
    expect(JSON.stringify(job)).not.toContain("audio");
  });

  it("rejects non-audio bodies", async () => {
    const res = await (await server(deps())).inject({ method: "POST", url: "/v1/clips?durationS=60", headers: { "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(400);
  });

  it("rejects unsupported audio types and empty clips", async () => {
    const a = await (await server(deps())).inject({ method: "POST", url: "/v1/clips?durationS=60", headers: { "content-type": "audio/flac" }, payload: audio });
    expect(a.statusCode).toBe(400);
    await app?.close();
    const b = await (await server(deps())).inject({ method: "POST", url: "/v1/clips?durationS=60", headers: { "content-type": "audio/wav" }, payload: Buffer.alloc(10) });
    expect(b.json().error.code).toBe("validation_error");
  });

  it("rejects clips longer than 5 minutes", async () => {
    const res = await (await server(deps())).inject({ method: "POST", url: "/v1/clips?durationS=301", headers: { "content-type": "audio/wav" }, payload: audio });
    expect(res.statusCode).toBe(400);
  });

  it("maps a transcription failure to 502 without leaking details, and counts it", async () => {
    const d = deps({ transcript: new Error("openai: 500 internal") });
    const res = await (await server(d)).inject({ method: "POST", url: "/v1/clips?durationS=60", headers: { "content-type": "audio/wav" }, payload: audio });
    expect(res.statusCode).toBe(502);
    expect(res.body).not.toContain("openai");
    expect(d.metrics.recordAiError).toHaveBeenCalledWith("transcribe");
    expect(d.jobs.enqueue).not.toHaveBeenCalled();
  });

  it("says so when there was no speech", async () => {
    const res = await (await server(deps({ transcript: "" }))).inject({ method: "POST", url: "/v1/clips?durationS=60", headers: { "content-type": "audio/wav" }, payload: audio });
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /v1/clips/:id", () => {
  it("returns the finished clip without private bookkeeping fields", async () => {
    const d = deps({ clip: clipDoc });
    const res = await (await server(d)).inject({ method: "GET", url: `/v1/clips/${CLIP_ID}`, headers: { "x-user-id": "demo-alex" } });
    expect(res.statusCode).toBe(200);
    expect(d.clips.get).toHaveBeenCalledWith("demo-alex", CLIP_ID);
    const body = res.json();
    expect(body.status).toBe("done");
    expect(body.clip).toMatchObject({ id: CLIP_ID, kind: "highlight", created_at: "2026-11-10T22:00:00.000Z" });
    expect(body.clip.owner_id).toBeUndefined();
  });

  it("reports processing and failed from the job while the worker runs", async () => {
    const processing = await (await server(deps({ job: { type: "process-clip", status: "pending", payload: { owner_id: "demo-alex" } } }))).inject({ method: "GET", url: `/v1/clips/${CLIP_ID}`, headers: { "x-user-id": "demo-alex" } });
    expect(processing.json()).toEqual({ id: CLIP_ID, status: "processing" });
    await app?.close();
    const failed = await (await server(deps({ job: { type: "process-clip", status: "failed", payload: { owner_id: "demo-alex" } } }))).inject({ method: "GET", url: `/v1/clips/${CLIP_ID}`, headers: { "x-user-id": "demo-alex" } });
    expect(failed.json().status).toBe("failed");
  });

  it("hides another persona's clip", async () => {
    const res = await (await server(deps({ job: { type: "process-clip", status: "pending", payload: { owner_id: "demo-sam" } } }))).inject({ method: "GET", url: `/v1/clips/${CLIP_ID}`, headers: { "x-user-id": "demo-alex" } });
    expect(res.statusCode).toBe(404);
  });

  it("validates the id", async () => {
    const res = await (await server(deps())).inject({ method: "GET", url: "/v1/clips/not-a-uuid" });
    expect(res.statusCode).toBe(400);
  });
});
