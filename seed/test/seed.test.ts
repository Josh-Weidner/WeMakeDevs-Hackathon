import { describe, expect, it } from "vitest";
import { LinkedInUrl } from "@confy/shared/contracts";
import { generateSeed, linkedInSearchUrl, DEMO_PERSONAS, type SeedData } from "../src/generate.js";
import { createRng } from "../src/rng.js";

const data: SeedData = generateSeed();
const talkTitle = (id: string) => data.talks.find((t) => t._id === id)?._source.title;

describe("rng", () => {
  it("is deterministic per seed", () => {
    const a = createRng(1);
    const b = createRng(1);
    expect([a.next(), a.int(1, 9), a.pick(["a", "b", "c"])]).toEqual([b.next(), b.int(1, 9), b.pick(["a", "b", "c"])]);
    expect(createRng(1).shuffle([1, 2, 3, 4, 5])).toEqual(createRng(1).shuffle([1, 2, 3, 4, 5]));
  });
});

describe("dataset shape", () => {
  it("is deterministic", () => {
    expect(generateSeed()).toEqual(generateSeed());
    expect(generateSeed(7)).not.toEqual(generateSeed(8));
  });

  it("matches the sizes in the spec", () => {
    expect(data.talks.length).toBeGreaterThanOrEqual(55);
    expect(data.speakers).toHaveLength(40);
    expect(data.rooms).toHaveLength(8);
    expect(data.attendees).toHaveLength(80);
  });

  it("has unique ids and no duplicate attendee names", () => {
    for (const docs of Object.values(data) as Array<Array<{ _id: string }>>) {
      expect(new Set(docs.map((d) => d._id)).size).toBe(docs.length);
    }
    const names = data.attendees.map((a) => a._source.display_name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has a 150-seat room and a quiet room", () => {
    expect(data.rooms.some((r) => r._source.capacity >= 150)).toBe(true);
    expect(data.rooms.filter((r) => r._source.is_quiet_room)).toHaveLength(1);
  });
});

describe("schedule integrity", () => {
  it("never double-books a room or a speaker", () => {
    const rooms = new Set<string>();
    const speakers = new Set<string>();
    for (const { _source: t } of data.talks) {
      const roomKey = `${t.room_id}|${t.start}`;
      expect(rooms.has(roomKey)).toBe(false);
      rooms.add(roomKey);
      for (const s of t.speaker_ids) {
        const key = `${s}|${t.start}`;
        expect(speakers.has(key)).toBe(false);
        speakers.add(key);
      }
    }
  });

  it("never schedules a talk in the quiet room", () => {
    const quiet = new Set(data.rooms.filter((r) => r._source.is_quiet_room).map((r) => r._id));
    expect(data.talks.every((t) => !quiet.has(t._source.room_id))).toBe(true);
  });

  it("keeps the hands-on lab for workshops only", () => {
    const lab = data.talks.filter((t) => t._source.room_id === "room-6");
    expect(lab.length).toBeGreaterThan(0);
    expect(lab.every((t) => t._source.format === "workshop")).toBe(true);
  });

  it("references real rooms and speakers, and speakers point back at their talks", () => {
    const roomIds = new Set(data.rooms.map((r) => r._id));
    const speakerById = new Map(data.speakers.map((s) => [s._id, s._source]));
    for (const t of data.talks) {
      expect(roomIds.has(t._source.room_id)).toBe(true);
      for (const s of t._source.speaker_ids) expect(speakerById.get(s)?.talk_ids).toContain(t._id);
    }
    expect(data.speakers.every((s) => s._source.talk_ids.length >= 1)).toBe(true);
  });

  it("ends every talk after it starts", () => {
    expect(data.talks.every((t) => Date.parse(t._source.end) > Date.parse(t._source.start))).toBe(true);
  });
});

describe("demo query: beginner multi-tenancy, nothing vendor-pitchy", () => {
  const tenancy = data.talks.filter((t) => t._source.tags.includes("multi-tenancy"));
  it("has beginner talks to return and a vendor pitch to exclude", () => {
    expect(tenancy.filter((t) => t._source.level === "beginner" && !t._source.is_vendor_pitch).length).toBeGreaterThanOrEqual(2);
    expect(tenancy.some((t) => t._source.is_vendor_pitch)).toBe(true);
  });

  it("has a small-capacity room for the 'likely full' warning", () => {
    const intro = data.talks.find((t) => t._source.title.startsWith("Multi-Tenancy 101"));
    const room = data.rooms.find((r) => r._id === intro?._source.room_id);
    expect(room?._source.capacity).toBeLessThanOrEqual(40);
  });
});

describe("demo query: 3 people on bare-metal Kubernetes", () => {
  it("has exactly 3 matching attendees open to intros, plus one who is not", () => {
    const metal = data.attendees.filter((a) => /bare metal/i.test(a._source.stack));
    expect(metal.filter((a) => a._source.open_to_intros)).toHaveLength(3);
    expect(metal.filter((a) => !a._source.open_to_intros)).toHaveLength(1);
  });
});

describe("demo query: the person from the eBPF talk who worked at a bank", () => {
  const alex = data.contacts.filter((c) => c._source.owner_id === "demo-alex");
  const atEbpf = alex.filter((c) => talkTitle(c._source.met_at_talk_id ?? "")?.includes("eBPF"));

  it("matches exactly one contact, with distractors on each side", () => {
    expect(atEbpf.filter((c) => c._source.company_type === "bank")).toHaveLength(1);
    expect(atEbpf.some((c) => c._source.company_type !== "bank")).toBe(true);
    expect(alex.some((c) => c._source.company_type === "bank" && !atEbpf.includes(c))).toBe(true);
  });

  it("scopes every contact to a demo persona that exists as an attendee", () => {
    const attendeeIds = new Set(data.attendees.map((a) => a._id));
    for (const c of data.contacts) {
      expect(DEMO_PERSONAS).toContain(c._source.owner_id);
      expect(attendeeIds.has(c._source.attendee_id ?? "")).toBe(true); // seeded contacts always have one
      expect(c._source.attendee_id).not.toBe(c._source.owner_id);
    }
    for (const p of DEMO_PERSONAS) expect(attendeeIds.has(p)).toBe(true);
  });
});

describe("LinkedIn links (opt-in, fictional people)", () => {
  const withLink = data.attendees.filter((a) => a._source.linkedin_url);

  it("are valid LinkedIn URLs that search for a person rather than point at a profile", () => {
    expect(withLink.length).toBeGreaterThan(40);
    for (const a of withLink) {
      const url = a._source.linkedin_url as string;
      expect(LinkedInUrl.safeParse(url).success).toBe(true);
      expect(url).toContain("/search/results/people/?keywords=");
      expect(url).not.toContain("/in/"); // never an invented profile URL
    }
  });

  it("are opt-in: some attendees have none, but every demo fixture shares one", () => {
    expect(withLink.length).toBeLessThan(data.attendees.length);
    for (const id of ["demo-alex", "att-marisol", "att-rafael", "att-aisha", "att-lars"]) {
      expect(data.attendees.find((a) => a._id === id)?._source.linkedin_url).toBeTruthy();
    }
  });

  it("are copied from the attendee onto their contact", () => {
    for (const c of data.contacts) {
      expect(c._source.linkedin_url).toBe(data.attendees.find((a) => a._id === c._source.attendee_id)?._source.linkedin_url);
    }
  });

  it("encode the name and company safely", () => {
    expect(linkedInSearchUrl("Zoë O'Neil", "Halden & Co")).toBe("https://www.linkedin.com/search/results/people/?keywords=Zo%C3%AB%20O'Neil%20Halden%20%26%20Co");
  });
});
