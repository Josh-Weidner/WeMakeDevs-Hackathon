import { createLogger, type DemandCounts, type RoomResult, type TalkResult } from "@confy/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { NotFoundError } from "../src/errors.js";
import { buildServer } from "../src/server.js";
import { computeForecast, createDemandService, FORECAST_WINDOW_MINUTES } from "../src/services/demand.js";
import { fakeContainer } from "./helpers.js";

const logger = createLogger("test", "silent");
const NOW = new Date("2026-11-10T12:00:00.000Z");
const talk = (id: string, room: string): TalkResult => ({
  id, score: null, title: `Talk ${id}`, abstract: "A", level: "beginner", tags: ["x"], track: "P", format: "talk", is_vendor_pitch: false,
  speaker_ids: ["s"], speaker_names: ["Ann"], room_id: room, start: "2026-11-10T13:30:00-07:00", end: "2026-11-10T14:15:00-07:00",
});
const room = (id: string, capacity: number): RoomResult => ({ id, name: id, capacity, floor: "1", is_quiet_room: false, step_free_route: "r", accessibility_notes: "n" });

function setup(counts: DemandCounts[] = []) {
  const demand = { record: vi.fn().mockResolvedValue(undefined), aggregate: vi.fn().mockResolvedValue(counts) };
  const talks = { get: vi.fn(), getMany: vi.fn().mockResolvedValue([talk("talk-1", "room-4"), talk("talk-2", "room-1")]), search: vi.fn(), suggest: vi.fn() };
  const rooms = { list: vi.fn().mockResolvedValue([room("room-4", 40), room("room-1", 150)]), get: vi.fn() };
  const metrics = { recordSearchHits: vi.fn(), recordBookmark: vi.fn() };
  const service = createDemandService({ demand, talks, rooms, metrics, logger, now: () => NOW });
  return { demand, talks, metrics, service };
}

describe("computeForecast", () => {
  it("weights a search hit at a quarter of a bookmark and compares against capacity", () => {
    expect(computeForecast({ bookmarks: 30, searchHits: 60 }, 40)).toEqual({ forecast: 45, ratio: 1.125, likelyFull: true });
    expect(computeForecast({ bookmarks: 10, searchHits: 4 }, 40)).toMatchObject({ forecast: 11, likelyFull: false });
    expect(computeForecast({ bookmarks: 40, searchHits: 0 }, 40).likelyFull).toBe(false); // exactly full is not over
    expect(computeForecast({ bookmarks: 5, searchHits: 0 }, 0).ratio).toBe(0);
  });
});

describe("demand service", () => {
  it("forecasts per talk, ranks by occupancy, and flags rooms likely to be full", async () => {
    const { service, demand } = setup([
      { talkId: "talk-2", roomId: "room-1", bookmarks: 20, searchHits: 8 },
      { talkId: "talk-1", roomId: "room-4", bookmarks: 30, searchHits: 60 },
      { talkId: "ghost", roomId: "room-9", bookmarks: 1, searchHits: 1 },
    ]);
    const out = await service.forecast();

    expect(demand.aggregate).toHaveBeenCalledWith(new Date(NOW.getTime() - FORECAST_WINDOW_MINUTES * 60_000).toISOString());
    expect(out.talks.map((t) => [t.talk_id, t.likely_full])).toEqual([["talk-1", true], ["talk-2", false]]); // unknown talk dropped
    expect(out.talks[0]).toMatchObject({ forecast: 45, capacity: 40, ratio: 1.125, room_name: "room-4" });
    expect(service.latest()).toEqual([
      { talkId: "talk-1", roomId: "room-4", ratio: 1.125 },
      { talkId: "talk-2", roomId: "room-1", ratio: 22 / 150 },
    ]);
  });

  it("records a bookmark event and metric, and rejects unknown talks", async () => {
    const { service, demand, talks, metrics } = setup();
    talks.get.mockResolvedValueOnce(talk("talk-1", "room-4")).mockResolvedValueOnce(null);

    await service.recordBookmark("demo-alex", "talk-1");
    expect(demand.record).toHaveBeenCalledWith([{ "@timestamp": NOW.toISOString(), talk_id: "talk-1", room_id: "room-4", event_type: "bookmark", user_id: "demo-alex" }]);
    expect(metrics.recordBookmark).toHaveBeenCalledWith({ talkId: "talk-1", roomId: "room-4" });

    await expect(service.recordBookmark("demo-alex", "nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("records search hits without ever failing the caller", async () => {
    const { service, demand, metrics } = setup();
    demand.record.mockRejectedValue(new Error("es down"));

    service.recordSearchHits("demo-alex", [talk("talk-1", "room-4")]);
    service.recordSearchHits("demo-alex", []);
    await new Promise((r) => setImmediate(r)); // let the swallowed rejection settle

    expect(metrics.recordSearchHits).toHaveBeenCalledTimes(1);
    expect(metrics.recordSearchHits).toHaveBeenCalledWith([{ talkId: "talk-1", roomId: "room-4" }]);
    expect(demand.record.mock.calls[0]?.[0][0]).toMatchObject({ event_type: "search_hit", user_id: "demo-alex" });
  });

  it("keeps the previous forecast when a refresh fails", async () => {
    const { service, demand } = setup([{ talkId: "talk-1", roomId: "room-4", bookmarks: 30, searchHits: 60 }]);
    await service.refresh();
    expect(service.latest()).toHaveLength(1);
    demand.aggregate.mockRejectedValue(new Error("es down"));
    await expect(service.refresh()).resolves.toBeUndefined();
    expect(service.latest()).toHaveLength(1);
  });
});

describe("demand routes", () => {
  let app: FastifyInstance | undefined;
  afterEach(async () => {
    await app?.close();
  });

  it("GET /v1/demand returns the forecast", async () => {
    const forecast = vi.fn().mockResolvedValue({
      window_minutes: 60,
      talks: [{ talk_id: "talk-1", title: "T", room_id: "room-4", room_name: "Room 4", start: "s", bookmarks: 30, search_hits: 60, forecast: 45, capacity: 40, ratio: 1.125, likely_full: true }],
    });
    app = await buildServer(fakeContainer(true, { demand: { forecast, recordBookmark: vi.fn(), recordSearchHits: vi.fn(), refresh: vi.fn(), latest: () => [] } }));
    const res = await app.inject({ method: "GET", url: "/v1/demand" });
    expect(res.statusCode).toBe(200);
    expect(res.json().talks[0].likely_full).toBe(true);
  });

  it("POST /v1/talks/:id/bookmark records for the persona and returns 201", async () => {
    const recordBookmark = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new NotFoundError("Talk not found"));
    app = await buildServer(fakeContainer(true, { demand: { forecast: vi.fn(), recordBookmark, recordSearchHits: vi.fn(), refresh: vi.fn(), latest: () => [] } }));

    const ok = await app.inject({ method: "POST", url: "/v1/talks/talk-1/bookmark", headers: { "x-user-id": "demo-sam" } });
    expect(ok.statusCode).toBe(201);
    expect(ok.json()).toEqual({ talk_id: "talk-1", recorded: true });
    expect(recordBookmark).toHaveBeenCalledWith("demo-sam", "talk-1");

    expect((await app.inject({ method: "POST", url: "/v1/talks/nope/bookmark" })).statusCode).toBe(404);
  });
});
