import { MAX_JOB_ATTEMPTS, type AiClient, type TalkResult } from "@confy/shared";
import { describe, expect, it, vi } from "vitest";
import { createProcessClipHandler, defaultLinkedInNote, fallbackAnalysis, isAttendee, systemPrompt, type ProcessClipDeps } from "../src/handlers/process-clip.js";
import type { Job } from "../src/jobs.js";

const CLIP_ID = "6f1c2c4e-8a3b-4d5e-9f10-1a2b3c4d5e6f";
const NOW = new Date("2026-11-10T15:00:00-07:00");
const talk = { id: "talk-014", title: "Multi-Tenancy 101", score: null } as TalkResult;

const alex = { display_name: "Alex Rivera", role: "Platform Engineer", bio: "Platform Engineer at Quillstack, a startup organization.", company_type: "startup", stack: "EKS", interests: [] };

const job = (payload: Record<string, unknown> = {}, attempts = 1): Job => ({
  id: `clip-${CLIP_ID}`,
  type: "process-clip",
  attempts,
  payload: { clip_id: CLIP_ID, owner_id: "demo-alex", transcript: "Hi, I'm Dana from Acme Bank, I run our platform team.", duration_s: 42, ...payload },
});

function setup(analysis: unknown) {
  const deps = {
    ai: {
      // The real chatJson validates with the given schema; the fake returns the model's raw reply after parsing it.
      chatJson: (async ({ schema }) => {
        if (analysis instanceof Error) throw analysis;
        return schema.parse(analysis);
      }) as AiClient["chatJson"],
      embed: vi.fn<AiClient["embed"]>().mockResolvedValue([[0.1, 0.2]]),
    },
    clips: { save: vi.fn().mockResolvedValue(undefined) },
    contacts: { save: vi.fn().mockResolvedValue(undefined) },
    highlights: { save: vi.fn().mockResolvedValue(undefined) },
    resources: { search: vi.fn().mockResolvedValue([{ id: "res-001", title: "Kubernetes multi-tenancy docs", type: "doc", url: "https://kubernetes.io/docs/concepts/security/multi-tenancy/", tags: ["k8s"], score: 1 }]) },
    talks: { search: vi.fn().mockResolvedValue([talk]), get: vi.fn().mockResolvedValue(talk) },
    people: { getProfile: vi.fn().mockResolvedValue(alex) },
    metrics: { recordAiError: vi.fn() },
    now: () => NOW,
  } satisfies ProcessClipDeps;
  return { deps, handler: createProcessClipHandler(deps) };
}

const connection = {
  kind: "connection",
  summary: "You talked with Dana about running a shared platform at a bank.",
  person: { name: "Dana Ortiz", role: "Platform lead", company: "Acme Bank" },
  linkedin_note: "Hi Dana, great chatting about shared platforms at Acme Bank!",
  topic_tags: ["platform"],
  experiment: null,
  resource_query: null,
};

const highlight = {
  kind: "highlight",
  summary: "The speaker explained ResourceQuotas per namespace.",
  person: null,
  linkedin_note: null,
  topic_tags: ["multi-tenancy", "quotas"],
  experiment: "kind create cluster\nkubectl create ns team-a",
  resource_query: "namespace resource quotas",
};

describe("process-clip handler", () => {
  it("turns a connection into a contact plus a LinkedIn draft and search link, then writes the clip last", async () => {
    const { deps, handler } = setup(connection);
    await handler(job({ talk_id: "talk-014" }));

    expect(deps.contacts.save).toHaveBeenCalledWith(
      `clip-${CLIP_ID}`,
      expect.objectContaining({ owner_id: "demo-alex", contact_name: "Dana Ortiz", company: "Acme Bank", met_at_talk_title: "Multi-Tenancy 101" }),
      [0.1, 0.2],
    );
    expect(deps.highlights.save).not.toHaveBeenCalled();
    const [id, clip] = deps.clips.save.mock.calls[0]!;
    expect(id).toBe(CLIP_ID);
    expect(clip.result).toEqual({
      kind: "connection",
      person: connection.person,
      linkedin_note: connection.linkedin_note,
      linkedin_search_url: "https://www.linkedin.com/search/results/people/?keywords=Dana%20Ortiz%20Acme%20Bank",
      contact_id: `clip-${CLIP_ID}`,
    });
    // The clip is the "done" marker, so it must come after the contact.
    expect(deps.clips.save.mock.invocationCallOrder[0]).toBeGreaterThan(deps.contacts.save.mock.invocationCallOrder[0]!);
  });

  it("drafts a default note when the model gives none", async () => {
    const { deps, handler } = setup({ ...connection, linkedin_note: null });
    await handler(job());
    expect(deps.clips.save.mock.calls[0]![1].result).toMatchObject({ linkedin_note: defaultLinkedInNote("Dana Ortiz", null) });
  });

  it("truncates long person fields from the model before saving the contact and clip", async () => {
    const longField = "x".repeat(130);
    const { deps, handler } = setup({
      ...connection,
      person: { name: longField, role: longField, company: longField },
    });

    await handler(job());

    expect(deps.contacts.save).toHaveBeenCalledWith(
      `clip-${CLIP_ID}`,
      expect.objectContaining({ contact_name: longField.slice(0, 120), role: longField.slice(0, 120), company: longField.slice(0, 120) }),
      [0.1, 0.2],
    );
    expect(deps.clips.save.mock.calls[0]![1].result).toMatchObject({
      kind: "connection",
      person: { name: longField.slice(0, 120), role: longField.slice(0, 120), company: longField.slice(0, 120) },
    });
  });

  it("treats a 'connection' without a name as a highlight (never invents a person)", async () => {
    const { deps, handler } = setup({ ...connection, person: { name: "", role: "", company: "" } });
    await handler(job());
    expect(deps.contacts.save).not.toHaveBeenCalled();
    expect(deps.clips.save.mock.calls[0]![1].kind).toBe("highlight");
  });

  it("turns a highlight into an experiment plus related talks and resources (hybrid search)", async () => {
    const { deps, handler } = setup(highlight);
    await handler(job());

    expect(deps.resources.search).toHaveBeenCalledWith({ text: "namespace resource quotas", vector: [0.1, 0.2], limit: 3 });
    expect(deps.talks.search).toHaveBeenCalledWith({ text: "namespace resource quotas", vector: [0.1, 0.2], limit: 2 });
    expect(deps.highlights.save).toHaveBeenCalledWith(
      `clip-${CLIP_ID}`,
      expect.objectContaining({ owner_id: "demo-alex", topic_tags: ["multi-tenancy", "quotas"], resource_ids: ["talk-014", "res-001"] }),
    );
    expect(deps.clips.save.mock.calls[0]![1].result).toMatchObject({
      kind: "highlight",
      experiment: highlight.experiment,
      resources: [
        { id: "talk-014", type: "talk", title: "Multi-Tenancy 101" },
        { id: "res-001", type: "doc", url: "https://kubernetes.io/docs/concepts/security/multi-tenancy/" },
      ],
    });
  });

  it("searches keyword-only when embedding fails", async () => {
    const { deps, handler } = setup(highlight);
    deps.ai.embed.mockRejectedValue(new Error("rate limited"));
    await handler(job());
    expect(deps.resources.search).toHaveBeenCalledWith(expect.objectContaining({ vector: undefined }));
    expect(deps.metrics.recordAiError).toHaveBeenCalledWith("embed_query");
  });

  it("fails (so the job retries) when the model errors and attempts remain", async () => {
    const { deps, handler } = setup(new Error("model down"));
    await expect(handler(job({}, 1))).rejects.toThrow("model down");
    expect(deps.clips.save).not.toHaveBeenCalled();
    expect(deps.metrics.recordAiError).toHaveBeenCalledWith("classify_clip");
  });

  it("falls back to a plain highlight on the last attempt instead of leaving the clip stuck", async () => {
    const { deps, handler } = setup(new Error("model down"));
    await handler(job({}, MAX_JOB_ATTEMPTS));
    expect(deps.clips.save.mock.calls[0]![1]).toMatchObject({ kind: "highlight", summary: "Hi, I'm Dana from Acme Bank, I run our platform team." });
  });

  it("rejects an invalid payload", async () => {
    const { handler } = setup(connection);
    await expect(handler(job({ clip_id: "not-a-uuid" }))).rejects.toThrow();
  });

  it("truncates long transcripts in the fallback summary", () => {
    expect(fallbackAnalysis("x".repeat(500)).summary).toHaveLength(280);
  });
});

describe("process-clip knows who saved the clip", () => {
  const transcript = "Hi, I'm Alex Rivera, platform engineer at Quillstack. Oh nice, I'm Dana Ortiz, I lead the platform team at Acme Bank.";
  const self = { ...connection, person: { name: "Alex Rivera", role: "Platform engineer", company: "Quillstack" }, linkedin_note: "Hi Alex!" };

  function withReplies(...replies: unknown[]) {
    const { deps } = setup(connection);
    const chatJson = vi.fn(async ({ schema }: { schema: { parse: (v: unknown) => unknown } }) => schema.parse(replies.shift()));
    const d = { ...deps, ai: { ...deps.ai, chatJson: chatJson as unknown as AiClient["chatJson"] } };
    return { deps: d, chatJson, handler: createProcessClipHandler(d) };
  }

  it("tells the model who the attendee is, so their own intro isn't the person met", async () => {
    const { deps, chatJson, handler } = withReplies(connection);
    await handler(job({ transcript }));
    const system = (chatJson.mock.calls[0]![0] as unknown as { system: string }).system;
    expect(system).toContain("Alex Rivera (Platform Engineer). About them: Platform Engineer at Quillstack");
    expect(system).toContain('"person" is always the OTHER speaker');
    expect(deps.people.getProfile).toHaveBeenCalledWith("demo-alex");
    expect(deps.contacts.save.mock.calls[0]![1]).toMatchObject({ contact_name: "Dana Ortiz", role: "Platform lead", company: "Acme Bank" });
  });

  it("asks again when the model returns the attendee, and saves the other speaker", async () => {
    const { deps, chatJson, handler } = withReplies(self, connection);
    await handler(job({ transcript }));
    expect(chatJson).toHaveBeenCalledTimes(2);
    expect((chatJson.mock.calls[1]![0] as unknown as { system: string }).system).toContain("named the attendee (Alex Rivera) as the person met");
    expect(deps.contacts.save.mock.calls[0]![1]).toMatchObject({ contact_name: "Dana Ortiz" });
  });

  it("never saves the attendee as their own contact, even if the model insists", async () => {
    const { deps, handler } = withReplies(self, self);
    await handler(job({ transcript }));
    expect(deps.contacts.save).not.toHaveBeenCalled();
    expect(deps.highlights.save).toHaveBeenCalled();
    expect(deps.clips.save.mock.calls[0]![1]).toMatchObject({ kind: "highlight" });
  });

  it("falls back to the persona list when the profile can't be read", async () => {
    const { deps, chatJson, handler } = withReplies(connection);
    deps.people.getProfile.mockRejectedValue(new Error("es down"));
    await handler(job({ transcript }));
    expect((chatJson.mock.calls[0]![0] as unknown as { system: string }).system).toContain("Alex Rivera (Platform engineer, new to multi-tenancy)");
  });

  it("prompts without an attendee for an unknown user", () => {
    expect(systemPrompt(null)).not.toContain("The attendee who saved this clip");
  });
});

describe("isAttendee", () => {
  const me = { name: "Alex Rivera", role: "Platform Engineer", company: "Quillstack" };
  it("matches the attendee's full name, ignoring case and accents", () => {
    expect(isAttendee({ name: "alex  rivera", role: "", company: "" }, me)).toBe(true);
    expect(isAttendee({ name: "Álex Rivera", role: "", company: "" }, me)).toBe(true);
  });
  it("matches a first name only together with the attendee's own role or company", () => {
    expect(isAttendee({ name: "Alex", role: "platform engineer", company: "" }, me)).toBe(true);
    expect(isAttendee({ name: "Alex", role: "", company: "Quillstack" }, me)).toBe(true);
    expect(isAttendee({ name: "Alex", role: "Designer", company: "Acme" }, me)).toBe(false);
  });
  it("doesn't match other people or a missing attendee", () => {
    expect(isAttendee({ name: "Dana Ortiz", role: "Platform Engineer", company: "Quillstack" }, me)).toBe(false);
    expect(isAttendee({ name: "Alex Rivera", role: "", company: "" }, null)).toBe(false);
    expect(isAttendee({ name: "", role: "", company: "" }, me)).toBe(false);
  });
});
