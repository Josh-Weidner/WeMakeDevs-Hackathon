import { createLogger, type AiClient, type TalkResult } from "@confy/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { NotFoundError } from "../src/errors.js";
import { buildServer } from "../src/server.js";
import { createContactsService } from "../src/services/contacts.js";
import { createPeopleService } from "../src/services/people.js";
import { createRoomsService } from "../src/services/rooms.js";
import { createTalksService } from "../src/services/talks.js";
import { fakeContainer } from "./helpers.js";

const logger = createLogger("test", "silent");
const talk: TalkResult = {
  id: "talk-1", score: 1, title: "T", abstract: "A", level: "beginner", tags: ["x"], track: "Platform", format: "talk",
  is_vendor_pitch: false, speaker_ids: ["s"], speaker_names: ["Ann"], room_id: "room-1",
  start: "2026-11-10T10:30:00-07:00", end: "2026-11-10T11:15:00-07:00",
};
const vector = [0.1, 0.2];
const demand = { recordSearchHits: vi.fn() };

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
});

describe("talks service", () => {
  const talks = () => ({ search: vi.fn().mockResolvedValue([talk]), get: vi.fn(), getMany: vi.fn(), suggest: vi.fn().mockResolvedValue([{ id: "talk-1", title: "T" }]) });

  it("embeds the query and passes filters to the repository", async () => {
    const repo = talks();
    const embed = vi.fn().mockResolvedValue([vector]);
    const out = await createTalksService({ talks: repo, ai: { embed }, logger, demand }).search("demo-alex", { q: "tenancy", level: "beginner", excludeVendorPitch: true, limit: 5 });

    expect(embed).toHaveBeenCalledWith(["tenancy"]);
    expect(repo.search).toHaveBeenCalledWith(expect.objectContaining({ text: "tenancy", vector, level: "beginner", excludeVendorPitch: true, limit: 5 }));
    expect(out.results).toHaveLength(1);
  });

  it("records search demand for the top results, but not when just browsing", async () => {
    const repo = talks();
    const recordSearchHits = vi.fn();
    const service = createTalksService({ talks: repo, ai: { embed: async () => [vector] }, logger, demand: { recordSearchHits } });

    await service.search("demo-sam", { q: "tenancy", limit: 10 });
    expect(recordSearchHits).toHaveBeenCalledWith("demo-sam", [talk]);

    recordSearchHits.mockClear();
    await service.search("demo-sam", { limit: 10 });
    expect(recordSearchHits).not.toHaveBeenCalled();
  });

  it("counts a failed query embedding as an AI error", async () => {
    const recordAiError = vi.fn();
    const service = createTalksService({ talks: talks(), ai: { embed: vi.fn().mockRejectedValue(new Error("x")) }, logger, demand, metrics: { recordAiError } });
    await service.search("demo-alex", { q: "x", limit: 5 });
    expect(recordAiError).toHaveBeenCalledWith("embed_query");
  });

  it("falls back to keyword search when embedding fails, and skips embedding without text", async () => {
    const repo = talks();
    const embed = vi.fn().mockRejectedValue(new Error("openai down"));
    const service = createTalksService({ talks: repo, ai: { embed }, logger, demand });

    await expect(service.search("demo-alex", { q: "x", limit: 5 })).resolves.toBeDefined();
    expect(repo.search).toHaveBeenLastCalledWith(expect.objectContaining({ vector: undefined }));

    embed.mockClear();
    await service.search("demo-alex", { limit: 5 });
    expect(embed).not.toHaveBeenCalled();
  });

  it("suggests and gets talks, raising NotFound for unknown ids", async () => {
    const repo = talks();
    repo.get.mockResolvedValueOnce(talk).mockResolvedValueOnce(null);
    const service = createTalksService({ talks: repo, ai: { embed: vi.fn() }, logger, demand });
    await expect(service.suggest({ q: "t", limit: 5 })).resolves.toEqual({ suggestions: [{ id: "talk-1", title: "T" }] });
    await expect(service.get("talk-1")).resolves.toBe(talk);
    await expect(service.get("nope")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("rooms, people and contacts services", () => {
  it("lists rooms and raises NotFound for an unknown room", async () => {
    const rooms = { list: vi.fn().mockResolvedValue([]), get: vi.fn().mockResolvedValue(null) };
    const service = createRoomsService({ rooms });
    await expect(service.list()).resolves.toEqual({ rooms: [] });
    await expect(service.get("x")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("matches people excluding the requester, and attaches generated openers", async () => {
    const found = { id: "att-rafael", display_name: "Rafael Costa", role: "SRE", company_type: "telco", bio: "b", stack: "bare metal", interests: ["a"], intro_prefs: "1:1" as const, score: 2, opener: null, linkedin_url: null };
    const people = { match: vi.fn().mockResolvedValue([found]), getProfile: vi.fn().mockResolvedValue({ display_name: "Alex", role: "SRE", company_type: "startup", stack: "k8s", interests: [] }) };
    const chatJson = vi.fn().mockResolvedValue({ openers: [{ id: "att-rafael", opener: "Hi Rafael, I also run bare metal." }] });
    const service = createPeopleService({ people, ai: { embed: async () => [vector], chatJson: chatJson as unknown as AiClient["chatJson"] }, logger });

    const out = await service.match("demo-alex", { q: "bare metal", limit: 3 });
    expect(people.match).toHaveBeenCalledWith({ excludeId: "demo-alex", text: "bare metal", vector, limit: 3 });
    expect(people.getProfile).toHaveBeenCalledWith("demo-alex");
    expect(out.matches[0]?.opener).toBe("Hi Rafael, I also run bare metal.");
  });

  it("still returns matches, with no openers, when generation fails", async () => {
    const found = { id: "a", display_name: "A B", role: "r", company_type: "c", bio: "b", stack: "s", interests: [], intro_prefs: "1:1" as const, score: 1, opener: null, linkedin_url: null };
    const people = { match: vi.fn().mockResolvedValue([found]), getProfile: vi.fn().mockResolvedValue(null) };
    const service = createPeopleService({ people, ai: { embed: async () => [vector], chatJson: vi.fn().mockRejectedValue(new Error("x")) as unknown as AiClient["chatJson"] }, logger });
    expect((await service.match("demo-alex", { q: "x", limit: 3 })).matches[0]?.opener).toBeNull();
  });

  it("still matches people when the requester profile lookup fails", async () => {
    const found = { id: "a", display_name: "A B", role: "r", company_type: "c", bio: "b", stack: "s", interests: [], intro_prefs: "1:1" as const, score: 1, opener: null, linkedin_url: null };
    const profileError = new Error("profile unavailable");
    const people = { match: vi.fn().mockResolvedValue([found]), getProfile: vi.fn().mockRejectedValue(profileError) };
    const chatJson = vi.fn().mockResolvedValue({ openers: [{ id: "a", opener: "Hello" }] });
    const warn = vi.fn();
    const service = createPeopleService({
      people,
      ai: { embed: async () => [vector], chatJson: chatJson as unknown as AiClient["chatJson"] },
      logger: { warn } as unknown as typeof logger,
    });

    const out = await service.match("demo-alex", { q: "x", limit: 3 });

    expect(out.matches[0]?.opener).toBe("Hello");
    expect(JSON.parse(chatJson.mock.calls[0]?.[0].user).me).toBeNull();
    expect(warn).toHaveBeenCalledWith({ err: profileError }, "requester profile lookup failed; generating openers without it");
  });

  it("scopes contacts search to the requesting persona", async () => {
    const contacts = { search: vi.fn().mockResolvedValue([]) };
    await createContactsService({ contacts, ai: { embed: async () => [vector] }, logger }).search("demo-sam", { q: "bank", limit: 5 });
    expect(contacts.search).toHaveBeenCalledWith({ ownerId: "demo-sam", text: "bank", vector, limit: 5 });
  });
});

describe("routes", () => {
  it("GET /v1/talks/search validates the query and returns results", async () => {
    const search = vi.fn().mockResolvedValue({ results: [talk] });
    app = await buildServer(fakeContainer(true, { talks: { search, suggest: vi.fn(), get: vi.fn() } }));

    const ok = await app.inject({ method: "GET", url: "/v1/talks/search?q=tenancy&level=beginner&excludeVendorPitch=true&limit=3" });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().results[0].id).toBe("talk-1");
    expect(search).toHaveBeenCalledWith("demo-alex", { q: "tenancy", level: "beginner", excludeVendorPitch: true, limit: 3 });

    const bad = await app.inject({ method: "GET", url: "/v1/talks/search?level=expert&limit=500" });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe("validation_error");
  });

  it("GET /v1/talks/suggest and /v1/talks/:id", async () => {
    const talks = {
      search: vi.fn(),
      suggest: vi.fn().mockResolvedValue({ suggestions: [{ id: "talk-1", title: "T" }] }),
      get: vi.fn().mockResolvedValueOnce(talk).mockRejectedValueOnce(new NotFoundError('Talk "x" not found')),
    };
    app = await buildServer(fakeContainer(true, { talks }));
    expect((await app.inject({ method: "GET", url: "/v1/talks/suggest?q=ebp" })).json().suggestions).toHaveLength(1);
    expect((await app.inject({ method: "GET", url: "/v1/talks/talk-1" })).json().title).toBe("T");
    const missing = await app.inject({ method: "GET", url: "/v1/talks/x" });
    expect(missing.statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/v1/talks/suggest" })).statusCode).toBe(400);
  });

  it("GET /v1/rooms and /v1/rooms/:id", async () => {
    const room = { id: "room-1", name: "Hall A", capacity: 150, floor: "1", is_quiet_room: false, step_free_route: "r", accessibility_notes: "n" };
    app = await buildServer(fakeContainer(true, { rooms: { list: vi.fn().mockResolvedValue({ rooms: [room] }), get: vi.fn().mockResolvedValue(room) } }));
    expect((await app.inject({ method: "GET", url: "/v1/rooms" })).json().rooms).toHaveLength(1);
    expect((await app.inject({ method: "GET", url: "/v1/rooms/room-1" })).json().capacity).toBe(150);
  });

  it("GET /v1/people/match passes the x-user-id persona through", async () => {
    const match = vi.fn().mockResolvedValue({ matches: [] });
    app = await buildServer(fakeContainer(true, { people: { match } }));
    const res = await app.inject({ method: "GET", url: "/v1/people/match?q=bare+metal", headers: { "x-user-id": "demo-sam" } });
    expect(res.statusCode).toBe(200);
    expect(match).toHaveBeenCalledWith("demo-sam", { q: "bare metal", limit: 3 });
    expect((await app.inject({ method: "GET", url: "/v1/people/match" })).statusCode).toBe(400);
  });

  it("GET /v1/contacts/search is scoped to the persona and defaults to demo-alex", async () => {
    const search = vi.fn().mockResolvedValue({ results: [] });
    app = await buildServer(fakeContainer(true, { contacts: { search } }));
    await app.inject({ method: "GET", url: "/v1/contacts/search?q=bank" });
    expect(search).toHaveBeenCalledWith("demo-alex", { q: "bank", limit: 5 });
    await app.inject({ method: "GET", url: "/v1/contacts/search?q=bank", headers: { "x-user-id": "demo-priya" } });
    expect(search).toHaveBeenLastCalledWith("demo-priya", { q: "bank", limit: 5 });
  });
});
