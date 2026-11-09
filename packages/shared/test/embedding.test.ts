import { describe, expect, it, vi } from "vitest";
import type { EsClient } from "../src/es/client.js";
import { EMBED_KINDS, EMBEDDABLE, embedJobType } from "../src/es/embedding.js";
import { createEmbeddingStore } from "../src/es/repositories/embeddings.js";

const docs: Record<string, Record<string, unknown>> = {
  talk: { title: "T", abstract: "A", level: "beginner", tags: ["x", "y"], track: "Platform", format: "talk", is_vendor_pitch: false, speaker_ids: ["s"], speaker_names: ["Ann Lee"], room_id: "r", start: "2026-11-10T10:30:00-07:00", end: "2026-11-10T11:15:00-07:00" },
  speaker: { name: "Ann Lee", bio: "Bio", company: "Co", talk_ids: [] },
  attendee: { display_name: "N", role: "SRE", company_type: "bank", bio: "B", stack: "K8s", interests: ["a"], open_to_intros: true, intro_prefs: "1:1", visibility: "public" },
  contact: { owner_id: "o", attendee_id: "a", contact_name: "Bo", role: "SRE", company: "Co", company_type: "bank", met_at_talk_title: "eBPF", met_at_time: "2026-11-10T10:30:00-07:00", notes: "Nice chat" },
  resource: { title: "Docs", url: "https://example.com/", type: "doc", tags: ["k8s"] },
};

describe("embedding text", () => {
  it("covers every kind with its own index and job type", () => {
    expect(EMBED_KINDS.map(embedJobType)).toEqual(["embed-talk", "embed-speaker", "embed-attendee", "embed-contact", "embed-resource"]);
    expect(EMBEDDABLE.talk.index).toBe("talks");
  });

  it.each(EMBED_KINDS)("builds non-empty text for %s and ignores a stored vector", (kind) => {
    const plain = EMBEDDABLE[kind].text(docs[kind] as Record<string, unknown>);
    expect(plain.length).toBeGreaterThan(0);
    expect(EMBEDDABLE[kind].text({ ...(docs[kind] as object), embedding: [0.1, 0.2] })).toBe(plain);
  });

  it("includes the fields that drive search", () => {
    expect(EMBEDDABLE.talk.text(docs.talk as Record<string, unknown>)).toContain("Speakers: Ann Lee");
    expect(EMBEDDABLE.contact.text(docs.contact as Record<string, unknown>)).toContain("Met at: eBPF");
    expect(EMBEDDABLE.contact.text(docs.contact as Record<string, unknown>)).toContain("(bank)");
  });

  it("rejects a document that does not match its schema", () => {
    expect(() => EMBEDDABLE.talk.text({ title: "only a title" })).toThrow();
  });
});

describe("embedding store", () => {
  it("reads through the alias and returns null for a missing document", async () => {
    const get = vi.fn().mockResolvedValueOnce({ _source: { a: 1 } }).mockRejectedValueOnce(Object.assign(new Error("nf"), { statusCode: 404 }));
    const store = createEmbeddingStore({ get } as unknown as EsClient);
    await expect(store.get("talk", "t1")).resolves.toEqual({ a: 1 });
    expect(get).toHaveBeenCalledWith({ index: "talks", id: "t1" });
    await expect(store.get("talk", "gone")).resolves.toBeNull();
  });

  it("treats a response with no source as missing and rethrows other errors", async () => {
    const get = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("es down"));
    const store = createEmbeddingStore({ get } as unknown as EsClient);
    await expect(store.get("talk", "t1")).resolves.toBeNull();
    await expect(store.get("talk", "t1")).rejects.toThrow("es down");
  });

  it("writes only the embedding field", async () => {
    const update = vi.fn().mockResolvedValue({});
    await createEmbeddingStore({ update } as unknown as EsClient).setEmbedding("contact", "c1", [0.5]);
    expect(update).toHaveBeenCalledWith({ index: "contacts", id: "c1", doc: { embedding: [0.5] } });
  });
});
