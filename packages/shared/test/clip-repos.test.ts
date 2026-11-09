import { describe, expect, it, vi } from "vitest";
import { createAiClient, DEFAULT_TRANSCRIBE_MODEL } from "../src/ai/openai.js";
import { linkedInSearchUrl } from "../src/contracts/clips.js";
import type { EsClient } from "../src/es/client.js";
import { INDEX } from "../src/es/indices.js";
import { createClipsRepository, createHighlightsRepository } from "../src/es/repositories/clips.js";
import { createContactsRepository } from "../src/es/repositories/contacts.js";
import { createJobsRepository } from "../src/es/repositories/jobs.js";
import { createResourcesRepository } from "../src/es/repositories/resources.js";

const clip = {
  owner_id: "demo-sam",
  kind: "highlight" as const,
  duration_s: 60,
  transcript: "t",
  summary: "s",
  result: { kind: "highlight" as const, topic_tags: ["ebpf"], experiment: null, resources: [], highlight_id: "clip-1" },
  "@timestamp": "2026-11-10T10:00:00.000Z",
};

function fakeEs(over: Record<string, unknown> = {}) {
  return {
    index: vi.fn().mockResolvedValue({}),
    search: vi.fn().mockResolvedValue({ hits: { hits: [] } }),
    get: vi.fn(),
    ...over,
  } as unknown as EsClient & Record<"index" | "search" | "get", ReturnType<typeof vi.fn>>;
}

describe("clips repository", () => {
  it("validates and writes the clip under its deterministic id", async () => {
    const es = fakeEs();
    await createClipsRepository(es).save("c1", clip);
    expect(es.index).toHaveBeenCalledWith({ index: INDEX.clips, id: "c1", document: clip });
  });

  it("rejects a document that doesn't match the contract before it reaches ES", async () => {
    const es = fakeEs();
    await expect(createClipsRepository(es).save("c1", { ...clip, extra: 1 } as never)).rejects.toThrow();
    expect(es.index).not.toHaveBeenCalled();
  });

  it("always filters reads by owner", async () => {
    const es = fakeEs({ search: vi.fn().mockResolvedValue({ hits: { hits: [{ _id: "c1", _source: clip }] } }) });
    await expect(createClipsRepository(es).get("demo-sam", "c1")).resolves.toEqual(clip);
    const filter = es.search.mock.calls[0]![0].query.bool.filter;
    expect(filter).toEqual([{ ids: { values: ["c1"] } }, { term: { owner_id: "demo-sam" } }]);
  });

  it("returns null when the owner has no such clip", async () => {
    await expect(createClipsRepository(fakeEs()).get("demo-alex", "c1")).resolves.toBeNull();
  });
});

describe("highlights repository", () => {
  const highlight = { owner_id: "demo-sam", text: "x", topic_tags: [], resource_ids: [], "@timestamp": "2026-11-10T10:00:00.000Z" };

  it("writes the embedding only when there is one", async () => {
    const es = fakeEs();
    const repo = createHighlightsRepository(es);
    await repo.save("h1", highlight, [0.1]);
    await repo.save("h2", highlight);
    expect(es.index.mock.calls[0]![0].document.embedding).toEqual([0.1]);
    expect(es.index.mock.calls[1]![0].document).not.toHaveProperty("embedding");
  });
});

describe("contacts repository save", () => {
  it("validates the contact and stores the embedding alongside", async () => {
    const es = fakeEs();
    const contact = { owner_id: "demo-sam", contact_name: "Dana", role: "SRE", company: "Acme", company_type: "unknown", met_at_time: "2026-11-10T10:00:00.000Z", notes: "n" };
    await createContactsRepository(es).save("clip-1", contact, [0.2]);
    expect(es.index).toHaveBeenCalledWith({ index: INDEX.contacts, id: "clip-1", document: { ...contact, embedding: [0.2] } });
  });
});

describe("resources repository", () => {
  const resource = { title: "Kubernetes: eBPF", url: "https://kubernetes.io/docs/x", type: "doc", tags: ["ebpf"] };
  const hits = { hits: { hits: [{ _id: "r1", _score: 2, _source: resource }, { _id: "r2", _score: undefined, _source: resource }] } };

  it("ranks by vector when there is an embedding, and maps hits", async () => {
    const es = fakeEs({ search: vi.fn().mockResolvedValue(hits) });
    const out = await createResourcesRepository(es).search({ text: "ebpf", vector: [0.1], limit: 3 });
    expect(out).toEqual([{ ...resource, id: "r1", score: 2 }, { ...resource, id: "r2", score: null }]);
    expect(JSON.stringify(es.search.mock.calls[0]![0])).not.toContain("multi_match");
  });

  it("falls back to keyword search without an embedding", async () => {
    const es = fakeEs();
    await createResourcesRepository(es).search({ text: "ebpf", limit: 3 });
    expect(JSON.stringify(es.search.mock.calls[0]![0])).toContain("multi_match");
  });
});

describe("jobs repository get", () => {
  it("returns the job's type, status and payload", async () => {
    const es = fakeEs({ get: vi.fn().mockResolvedValue({ _source: { type: "process-clip", status: "done", payload: { a: 1 }, attempts: 1 } }) });
    await expect(createJobsRepository(es).get("j1")).resolves.toEqual({ type: "process-clip", status: "done", payload: { a: 1 } });
  });

  it("returns null for a missing job or empty source, and rethrows other errors", async () => {
    const notFound = Object.assign(new Error("nf"), { statusCode: 404 });
    await expect(createJobsRepository(fakeEs({ get: vi.fn().mockRejectedValue(notFound) })).get("j1")).resolves.toBeNull();
    await expect(createJobsRepository(fakeEs({ get: vi.fn().mockResolvedValue({}) })).get("j1")).resolves.toBeNull();
    await expect(createJobsRepository(fakeEs({ get: vi.fn().mockRejectedValue(new Error("down")) })).get("j1")).rejects.toThrow("down");
  });
});

describe("ai transcribe", () => {
  it("sends the audio from memory with the right extension and trims the text", async () => {
    const ai = createAiClient({ apiKey: "sk-test" });
    const create = vi.spyOn(ai.raw.audio.transcriptions, "create").mockResolvedValue("  hello there \n" as never);
    await expect(ai.transcribe(new Uint8Array([1, 2, 3]), "audio/webm")).resolves.toBe("hello there");
    const [body, opts] = create.mock.calls[0]! as unknown as [{ file: File; model: string }, { timeout: number }];
    expect(body.model).toBe(DEFAULT_TRANSCRIBE_MODEL);
    expect(body.file.name).toBe("clip.webm");
    expect(opts.timeout).toBeGreaterThan(60_000);
  });

  it("rejects audio types it can't name", async () => {
    await expect(createAiClient({ apiKey: "sk-test" }).transcribe(new Uint8Array([1]), "audio/flac")).rejects.toThrow("unsupported audio type");
  });
});

describe("linkedInSearchUrl", () => {
  it("encodes name and company into a plain people-search link", () => {
    expect(linkedInSearchUrl({ name: " Dana Ortiz ", company: "Acme & Co" })).toBe(
      "https://www.linkedin.com/search/results/people/?keywords=Dana%20Ortiz%20Acme%20%26%20Co",
    );
    expect(linkedInSearchUrl({ name: "Dana", company: "" })).toBe("https://www.linkedin.com/search/results/people/?keywords=Dana");
  });
});
