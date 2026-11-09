import { describe, expect, it, vi } from "vitest";
import { EMBEDDING_DIMS } from "../src/ai/openai.js";
import type { EsClient } from "../src/es/client.js";
import { buildHybridQuery, MIN_COSINE_SIMILARITY, termFilters, toKeywordQuery } from "../src/es/query-builders.js";
import { createContactsRepository } from "../src/es/repositories/contacts.js";
import { createPeopleRepository } from "../src/es/repositories/people.js";
import { createRoomsRepository } from "../src/es/repositories/rooms.js";
import { createTalksRepository } from "../src/es/repositories/talks.js";

const vec = new Array<number>(EMBEDDING_DIMS).fill(0.1);
const notFound = () => Object.assign(new Error("nf"), { statusCode: 404 });

const talk = {
  title: "T", abstract: "A", level: "beginner", tags: ["x"], track: "Platform", format: "talk", is_vendor_pitch: false,
  speaker_ids: ["s"], speaker_names: ["Ann"], room_id: "room-1", start: "2026-11-10T10:30:00-07:00", end: "2026-11-10T11:15:00-07:00",
};
const searchOf = (hits: unknown[]) => vi.fn().mockResolvedValue({ hits: { hits } });

interface Bool {
  bool: { filter: unknown; must_not: unknown };
}
interface Rrf {
  rrf: { retrievers: Array<{ standard: { query: Bool }; knn: { filter: Bool } }> };
}

describe("buildHybridQuery", () => {
  const filter = termFilters({ level: "beginner", track: undefined });

  it("fuses BM25 and kNN with RRF and applies the same filters to both sides", () => {
    const body = buildHybridQuery({ text: "tenancy", vector: vec, fields: ["title"], filter, mustNot: [{ term: { is_vendor_pitch: true } }], limit: 5 });
    const rrf = (body.retriever as unknown as Rrf).rrf;
    expect(rrf.retrievers).toHaveLength(2);
    expect(rrf.retrievers[0]?.standard.query.bool.filter).toEqual([{ term: { level: "beginner" } }]);
    expect(rrf.retrievers[0]?.standard.query.bool.must_not).toEqual([{ term: { is_vendor_pitch: true } }]);
    expect(rrf.retrievers[1]?.knn.filter.bool.filter).toEqual([{ term: { level: "beginner" } }]);
    expect(rrf.retrievers[1]?.knn.filter.bool.must_not).toEqual([{ term: { is_vendor_pitch: true } }]);
    expect(body.size).toBe(5);
  });

  it("cuts off weak vector matches so results are not padded with unrelated documents", () => {
    const body = buildHybridQuery({ vector: vec, fields: ["t"], limit: 3 });
    expect(body).toHaveProperty("knn.similarity", MIN_COSINE_SIMILARITY);
  });

  it("uses most_fields scoring when asked", () => {
    const body = buildHybridQuery({ text: "x", fields: ["t"], matchType: "most_fields", limit: 3 });
    expect(JSON.stringify(body)).toContain('"type":"most_fields"');
  });

  it("degrades to keyword-only, vector-only, or a filtered browse", () => {
    expect(buildHybridQuery({ text: "x", fields: ["t"], limit: 3 })).toHaveProperty("query.bool.must");
    expect(buildHybridQuery({ vector: vec, fields: ["t"], limit: 3 })).toHaveProperty("knn.field", "embedding");
    expect(buildHybridQuery({ fields: ["t"], filter, limit: 3 })).toEqual({ size: 3, query: { bool: { filter, must_not: [] } } });
  });

  it("ignores a vector of the wrong size instead of sending a bad request", () => {
    expect(buildHybridQuery({ text: "x", vector: [1, 2, 3], fields: ["t"], limit: 3 })).not.toHaveProperty("retriever");
  });
});

describe("toKeywordQuery", () => {
  it("drops filler words but keeps content words", () => {
    expect(toKeywordQuery("how do I stop one team hogging the cluster")).toBe("stop one team hogging cluster");
    expect(toKeywordQuery("the person I met at the eBPF talk who worked at a bank")).toBe("person met eBPF talk worked bank");
  });

  it("keeps the original text when every word is filler, and sends the stripped text to BM25 only", () => {
    expect(toKeywordQuery("what is the")).toBe("what is the");
    const body = buildHybridQuery({ text: "in space", vector: vec, fields: ["t"], limit: 3 });
    expect(JSON.stringify(body)).toContain('"query":"space"');
  });
});

describe("talks repository", () => {
  it("searches the talks alias, excludes vectors, and maps hits", async () => {
    const search = searchOf([{ _id: "talk-1", _score: 1.5, _source: talk }]);
    const repo = createTalksRepository({ search } as unknown as EsClient);
    const results = await repo.search({ text: "x", vector: vec, excludeVendorPitch: true, level: "beginner", limit: 5 });

    expect(results[0]).toMatchObject({ id: "talk-1", score: 1.5, title: "T" });
    const req = search.mock.calls[0]?.[0];
    expect(req.index).toBe("talks");
    expect(req._source).toEqual({ excludes: ["embedding"] });
    expect(JSON.stringify(req)).toContain('"is_vendor_pitch":true');
    expect(req.sort).toBeUndefined();
  });

  it("browses by start time when there is no text", async () => {
    const search = searchOf([]);
    await createTalksRepository({ search } as unknown as EsClient).search({ limit: 5 });
    expect(search.mock.calls[0]?.[0].sort).toEqual([{ start: "asc" }]);
  });

  it("gets a talk, returns null when missing, and rethrows other errors", async () => {
    const get = vi.fn().mockResolvedValueOnce({ _source: talk }).mockRejectedValueOnce(notFound()).mockRejectedValueOnce(new Error("down"));
    const repo = createTalksRepository({ get } as unknown as EsClient);
    await expect(repo.get("talk-1")).resolves.toMatchObject({ id: "talk-1", score: null });
    await expect(repo.get("nope")).resolves.toBeNull();
    await expect(repo.get("x")).rejects.toThrow("down");
  });

  it("suggests titles with bool_prefix on the as-you-type field", async () => {
    const search = searchOf([{ _id: "talk-9", _source: { title: "eBPF in Production" } }]);
    const out = await createTalksRepository({ search } as unknown as EsClient).suggest("ebp", 3);
    expect(out).toEqual([{ id: "talk-9", title: "eBPF in Production" }]);
    expect(search.mock.calls[0]?.[0].query.multi_match.type).toBe("bool_prefix");
  });
});

describe("rooms repository", () => {
  const room = { name: "Hall A", capacity: 150, floor: "1", is_quiet_room: false, step_free_route: "r", accessibility_notes: "n" };

  it("lists and gets rooms", async () => {
    const es = { search: searchOf([{ _id: "room-1", _source: room }]), get: vi.fn().mockResolvedValueOnce({ _source: room }).mockRejectedValueOnce(notFound()).mockRejectedValueOnce(new Error("down")) };
    const repo = createRoomsRepository(es as unknown as EsClient);
    await expect(repo.list()).resolves.toEqual([{ ...room, id: "room-1" }]);
    await expect(repo.get("room-1")).resolves.toMatchObject({ id: "room-1" });
    await expect(repo.get("nope")).resolves.toBeNull();
    await expect(repo.get("x")).rejects.toThrow("down");
  });
});

describe("people repository", () => {
  const attendee = { display_name: "Rafael Costa", role: "SRE", company_type: "telco", bio: "b", stack: "bare metal", interests: ["a"], open_to_intros: true, intro_prefs: "1:1", visibility: "public" };

  it("only matches opted-in attendees, never the requester, and hides private fields", async () => {
    const search = searchOf([{ _id: "att-rafael", _score: 2, _source: attendee }]);
    const out = await createPeopleRepository({ search } as unknown as EsClient).match({ excludeId: "demo-alex", text: "bare metal", vector: vec, limit: 3 });

    const body = JSON.stringify(search.mock.calls[0]?.[0]);
    expect(body).toContain('"open_to_intros":true');
    expect(body).toContain('"ids":{"values":["demo-alex"]}');
    expect(out[0]).toMatchObject({ id: "att-rafael", display_name: "Rafael Costa", score: 2, opener: null, linkedin_url: null });
    expect(out[0]).not.toHaveProperty("open_to_intros");
    expect(out[0]).not.toHaveProperty("visibility");
  });
});

describe("people repository: opt-in LinkedIn link", () => {
  const base = { display_name: "Rafael Costa", role: "SRE", company_type: "telco", bio: "b", stack: "bare metal", interests: ["a"], open_to_intros: true, intro_prefs: "1:1", visibility: "public" };

  it("exposes the link only for attendees who shared one", async () => {
    const shared = "https://www.linkedin.com/search/results/people/?keywords=Rafael%20Costa";
    const search = searchOf([
      { _id: "a", _score: 1, _source: { ...base, linkedin_url: shared } },
      { _id: "b", _score: 1, _source: base },
    ]);
    const out = await createPeopleRepository({ search } as unknown as EsClient).match({ excludeId: "x", text: "t", limit: 3 });
    expect(out.map((m) => m.linkedin_url)).toEqual([shared, null]);
  });

  it("refuses to return a stored link that is not on linkedin.com", async () => {
    const search = searchOf([{ _id: "a", _score: 1, _source: { ...base, linkedin_url: "https://evil.example/in/x" } }]);
    await expect(createPeopleRepository({ search } as unknown as EsClient).match({ excludeId: "x", text: "t", limit: 3 })).rejects.toThrow();
  });
});

describe("people repository: requester profile", () => {
  const attendee = { display_name: "Alex Rivera", role: "Platform Engineer", company_type: "startup", bio: "b", stack: "k8s", interests: ["gitops"], open_to_intros: true, intro_prefs: "1:1", visibility: "public" };

  it("returns only the requester's own profile fields, null when unknown, and rethrows other errors", async () => {
    const get = vi.fn().mockResolvedValueOnce({ _source: attendee }).mockRejectedValueOnce(notFound()).mockRejectedValueOnce(new Error("down"));
    const repo = createPeopleRepository({ get } as unknown as EsClient);
    await expect(repo.getProfile("demo-alex")).resolves.toEqual({ display_name: "Alex Rivera", role: "Platform Engineer", bio: attendee.bio, company_type: "startup", stack: "k8s", interests: ["gitops"] });
    await expect(repo.getProfile("nobody")).resolves.toBeNull();
    await expect(repo.getProfile("x")).rejects.toThrow("down");
  });
});

describe("contacts repository", () => {
  const contact = { owner_id: "demo-alex", attendee_id: "a", contact_name: "Bo", role: "SRE", company: "Co", company_type: "bank", met_at_time: "2026-11-10T10:30:00-07:00", notes: "n" };

  it("lists only the owner's contacts, newest first, without vectors or owner_id", async () => {
    const search = searchOf([{ _id: "contact-alex-1", _score: null, _source: contact }]);
    const out = await createContactsRepository({ search } as unknown as EsClient).list("demo-alex", 10);

    const req = search.mock.calls[0]?.[0];
    expect(JSON.stringify(req.query)).toContain('"owner_id":"demo-alex"');
    expect(req.sort).toEqual([{ met_at_time: "desc" }]);
    expect(req.size).toBe(10);
    expect(req._source).toEqual({ excludes: ["embedding"] });
    expect(out[0]).toMatchObject({ id: "contact-alex-1", contact_name: "Bo" });
    expect(out[0]).not.toHaveProperty("owner_id");
  });

  it("gets one contact by id AND owner, so another persona's id finds nothing", async () => {
    const search = vi.fn().mockResolvedValueOnce({ hits: { hits: [{ _id: "contact-alex-1", _score: 1, _source: contact }] } }).mockResolvedValueOnce({ hits: { hits: [] } });
    const repo = createContactsRepository({ search } as unknown as EsClient);

    await expect(repo.get("demo-alex", "contact-alex-1")).resolves.toMatchObject({ id: "contact-alex-1" });
    const filter = search.mock.calls[0]?.[0].query.bool.filter;
    expect(filter).toContainEqual({ ids: { values: ["contact-alex-1"] } });
    expect(filter).toContainEqual({ term: { owner_id: "demo-alex" } });

    await expect(repo.get("demo-sam", "contact-alex-1")).resolves.toBeNull();
    expect(search.mock.calls[1]?.[0].query.bool.filter).toContainEqual({ term: { owner_id: "demo-sam" } });
  });

  it("always filters on owner_id and never returns it", async () => {
    const search = searchOf([{ _id: "contact-alex-1", _score: 3, _source: contact }]);
    const out = await createContactsRepository({ search } as unknown as EsClient).search({ ownerId: "demo-alex", text: "bank", vector: vec, limit: 5 });

    const rrf = search.mock.calls[0]?.[0].retriever.rrf.retrievers;
    expect(rrf[0].standard.query.bool.filter).toEqual([{ term: { owner_id: "demo-alex" } }]);
    expect(rrf[1].knn.filter.bool.filter).toEqual([{ term: { owner_id: "demo-alex" } }]);
    expect(out[0]).toMatchObject({ id: "contact-alex-1", contact_name: "Bo" });
    expect(out[0]).not.toHaveProperty("owner_id");
  });
});
