import { createLogger, type AiClient, type ContactResult } from "@confy/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { NotFoundError } from "../src/errors.js";
import { buildServer } from "../src/server.js";
import { createContactsService } from "../src/services/contacts.js";
import { generateFollowUp, MAX_NOTE_LENGTH } from "../src/services/follow-up.js";
import { fakeContainer } from "./helpers.js";

const logger = createLogger("test", "silent");
const contact: ContactResult = {
  id: "contact-alex-1", score: null, attendee_id: "att-marisol", contact_name: "Marisol Okafor", role: "Staff Security Engineer",
  company: "Halden Bank", company_type: "bank", met_at_talk_id: "talk-009", met_at_talk_title: "eBPF in Production",
  met_at_time: "2026-11-10T12:20:00-07:00", notes: "Talked about runtime detection on payment clusters.",
};
const me = { display_name: "Alex Rivera", role: "Platform Engineer", bio: "b", company_type: "startup", stack: "k8s", interests: ["gitops"] };
const ai = (chatJson: ReturnType<typeof vi.fn>) => ({ chatJson } as unknown as Pick<AiClient, "chatJson">);

describe("generateFollowUp", () => {
  it("sends the contact's details as data and returns a trimmed note", async () => {
    const chatJson = vi.fn().mockResolvedValue({ note: "  Great meeting you at the eBPF talk, Marisol!  " });
    const note = await generateFollowUp(ai(chatJson), logger, { me, contact });

    expect(note).toBe("Great meeting you at the eBPF talk, Marisol!");
    const call = chatJson.mock.calls[0]?.[0];
    const data = JSON.parse(call.user);
    expect(data.contact).toMatchObject({ first_name: "Marisol", met_at: "eBPF in Production", saved_notes: contact.notes });
    expect(call.user).not.toContain("Okafor"); // first name only
    expect(call.system).not.toContain(contact.notes); // notes are data, never in the system prompt
  });

  it("works without a requester profile or a known talk", async () => {
    const chatJson = vi.fn().mockResolvedValue({ note: "Hi!" });
    await generateFollowUp(ai(chatJson), logger, { me: null, contact: { ...contact, met_at_talk_title: undefined } });
    const data = JSON.parse(chatJson.mock.calls[0]?.[0].user);
    expect(data.me).toBeNull();
    expect(data.contact.met_at).toBeNull();
  });

  it("keeps notes within LinkedIn's limit without cutting a word in half", async () => {
    const long = `${"word ".repeat(100)}end`;
    const note = await generateFollowUp(ai(vi.fn().mockResolvedValue({ note: long })), logger, { me, contact });
    expect(note.length).toBeLessThanOrEqual(MAX_NOTE_LENGTH);
    expect(note.endsWith("…")).toBe(true);
    expect(note.slice(0, -1).endsWith("word")).toBe(true);
  });

  it("surfaces a retryable 502 (and counts an AI error) when the model fails or returns nothing", async () => {
    const recordAiError = vi.fn();
    await expect(generateFollowUp(ai(vi.fn().mockRejectedValue(new Error("down"))), logger, { me, contact }, { recordAiError })).rejects.toMatchObject({ statusCode: 502 });
    await expect(generateFollowUp(ai(vi.fn().mockResolvedValue({ note: "   " })), logger, { me, contact })).rejects.toMatchObject({ code: "upstream_error" });
    expect(recordAiError).toHaveBeenCalledWith("generate_follow_up");
  });
});

describe("contacts service: list and follow-up", () => {
  function setup(found: ContactResult | null = contact) {
    const contacts = { search: vi.fn(), list: vi.fn().mockResolvedValue([contact]), get: vi.fn().mockResolvedValue(found) };
    const people = { getProfile: vi.fn().mockResolvedValue(me) };
    const chatJson = vi.fn().mockResolvedValue({ note: "Nice to meet you!" });
    const service = createContactsService({ contacts, people, ai: { embed: vi.fn(), chatJson: chatJson as unknown as AiClient["chatJson"] }, logger });
    return { service, contacts, people };
  }

  it("lists only the persona's own contacts", async () => {
    const { service, contacts } = setup();
    await expect(service.list("demo-sam", { limit: 10 })).resolves.toEqual({ results: [contact] });
    expect(contacts.list).toHaveBeenCalledWith("demo-sam", 10);
  });

  it("drafts a follow-up for the persona's own contact", async () => {
    const { service, contacts, people } = setup();
    await expect(service.followUp("demo-alex", "contact-alex-1")).resolves.toEqual({ draft: "Nice to meet you!" });
    expect(contacts.get).toHaveBeenCalledWith("demo-alex", "contact-alex-1");
    expect(people.getProfile).toHaveBeenCalledWith("demo-alex");
  });

  it("treats someone else's contact id exactly like a missing one, and never calls the model", async () => {
    const { service } = setup(null); // the owner-scoped lookup finds nothing for demo-sam
    await expect(service.followUp("demo-sam", "contact-alex-1")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("contacts routes", () => {
  let app: FastifyInstance | undefined;
  afterEach(async () => {
    await app?.close();
  });

  it("GET /v1/contacts lists for the persona with a default limit, and validates it", async () => {
    const list = vi.fn().mockResolvedValue({ results: [] });
    app = await buildServer(fakeContainer(true, { contacts: { search: vi.fn(), list, followUp: vi.fn() } }));
    await app.inject({ method: "GET", url: "/v1/contacts", headers: { "x-user-id": "demo-priya" } });
    expect(list).toHaveBeenCalledWith("demo-priya", { limit: 10 });
    expect((await app.inject({ method: "GET", url: "/v1/contacts?limit=500" })).statusCode).toBe(400);
  });

  it("POST /v1/contacts/:id/follow-up returns a draft for the persona, 404 for others' contacts", async () => {
    const followUp = vi.fn().mockResolvedValueOnce({ draft: "Hello!" }).mockRejectedValueOnce(new NotFoundError("Contact not found"));
    app = await buildServer(fakeContainer(true, { contacts: { search: vi.fn(), list: vi.fn(), followUp } }));

    const ok = await app.inject({ method: "POST", url: "/v1/contacts/contact-alex-1/follow-up", headers: { "x-user-id": "demo-alex" } });
    expect(ok.json()).toEqual({ draft: "Hello!" });
    expect(followUp).toHaveBeenCalledWith("demo-alex", "contact-alex-1");

    const other = await app.inject({ method: "POST", url: "/v1/contacts/contact-alex-1/follow-up", headers: { "x-user-id": "demo-sam" } });
    expect(other.statusCode).toBe(404);
  });
});
