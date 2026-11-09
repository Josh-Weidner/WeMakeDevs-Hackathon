import {
  AttendeeDoc,
  ContactDoc,
  ResourceDoc,
  RoomDoc,
  SpeakerDoc,
  TalkDoc,
} from "@confy/shared/contracts";
import { CLOSERS, KEYNOTES, TAG_BLURBS, TALKS, TRACK_BY_TAG, type TalkSeed } from "./data-talks.js";
import { COMPANIES, FIRST_NAMES, LAST_NAMES, RESOURCES, ROLES, ROOMS, STACKS } from "./data-people.js";
import { createRng, type Rng } from "./rng.js";

export interface SeedDoc<T> {
  _id: string;
  _source: T;
}

export interface SeedData {
  talks: Array<SeedDoc<TalkDoc>>;
  speakers: Array<SeedDoc<SpeakerDoc>>;
  rooms: Array<SeedDoc<RoomDoc>>;
  attendees: Array<SeedDoc<AttendeeDoc>>;
  contacts: Array<SeedDoc<ContactDoc>>;
  resources: Array<SeedDoc<ResourceDoc>>;
}

export const DEFAULT_SEED = 20261109;
export const DEMO_PERSONAS = ["demo-alex", "demo-sam", "demo-priya", "demo-jordan"] as const;

const DAYS = ["2026-11-10", "2026-11-11"] as const;
const SLOT_STARTS = ["10:30", "11:30", "13:30", "14:30", "15:30", "16:30"] as const;
const TALK_MINUTES = 45;
const LAB_ROOM = "room-6";
/** Regular sessions: every room except the quiet room and the hands-on lab. */
const TALK_ROOMS = ROOMS.filter((r) => !r.quiet && r.id !== LAB_ROOM).map((r) => r.id);
const SPEAKER_COUNT = 40;
const ATTENDEE_COUNT = 80;
/** Mountain Standard Time in November. */
const MT_OFFSET_HOURS = 7;

const instant = (day: string, hhmm: string) => Date.parse(`${day}T${hhmm}:00-07:00`);
const iso = (ms: number) => new Date(ms - MT_OFFSET_HOURS * 3_600_000).toISOString().replace(/\.\d+Z$/, "-07:00");
const pad3 = (n: number, prefix: string) => `${prefix}-${String(n).padStart(3, "0")}`;

interface Placement {
  seed: TalkSeed;
  start: number;
  end: number;
  room: string;
  slot: number;
}

function placeTalks(rng: Rng): Placement[] {
  const placements: Placement[] = [];
  const totalSlots = DAYS.length * SLOT_STARTS.length;
  const taken = new Set<string>();
  const load = new Array<number>(totalSlots).fill(0);
  const at = (slot: number) => {
    const day = DAYS[Math.floor(slot / SLOT_STARTS.length)] as string;
    const hhmm = SLOT_STARTS[slot % SLOT_STARTS.length] as string;
    return { start: instant(day, hhmm), end: instant(day, hhmm) + TALK_MINUTES * 60_000 };
  };
  const place = (seed: TalkSeed, slot: number, room: string) => {
    taken.add(`${slot}:${room}`);
    load[slot] = (load[slot] ?? 0) + 1;
    placements.push({ seed, slot, room, ...at(slot) });
  };

  // Keynotes open each day in the biggest room.
  KEYNOTES.forEach((seed, day) => {
    const start = instant(DAYS[day] as string, "09:00");
    placements.push({ seed, slot: -1, room: "room-1", start, end: start + 60 * 60_000 });
  });

  const pinned = TALKS.filter((t) => t.pin);
  for (const t of pinned) place(t, t.pin!.slot, t.pin!.room);

  for (const seed of rng.shuffle(TALKS.filter((t) => !t.pin))) {
    const candidates = seed.format === "workshop" ? [LAB_ROOM] : rng.shuffle(TALK_ROOMS);
    const slots = [...load.keys()].sort((a, b) => (load[a] as number) - (load[b] as number) || a - b);
    outer: for (const slot of slots) {
      for (const room of candidates) {
        if (!taken.has(`${slot}:${room}`)) {
          place(seed, slot, room);
          break outer;
        }
      }
    }
  }
  return placements.sort((a, b) => a.start - b.start || a.room.localeCompare(b.room));
}

function buildSpeakers(rng: Rng) {
  return Array.from({ length: SPEAKER_COUNT }, (_, i) => {
    const vendor = i < 2 ? (COMPANIES.find((c) => c.name === (i === 0 ? "NimbusCloud" : "SentinelWorks")) as { name: string }) : undefined;
    const company = vendor?.name ?? rng.pick(COMPANIES.filter((c) => !c.type.includes("vendor"))).name;
    const name = `${FIRST_NAMES[10 + i]} ${LAST_NAMES[(i * 7 + 3) % LAST_NAMES.length]}`;
    return { id: `spk-${String(i + 1).padStart(2, "0")}`, name, company, role: rng.pick(ROLES), talkIds: [] as string[] };
  });
}

function buildTalksAndSpeakers(rng: Rng) {
  const placements = placeTalks(rng);
  const speakers = buildSpeakers(rng);
  const bySlot = new Map<number, Set<string>>();
  let cursor = 0;
  const nextSpeaker = (slotKey: number) => {
    const busy = bySlot.get(slotKey) ?? new Set<string>();
    bySlot.set(slotKey, busy);
    for (let tries = 0; tries < SPEAKER_COUNT; tries++) {
      const s = speakers[2 + (cursor++ % (SPEAKER_COUNT - 2))] as (typeof speakers)[number];
      if (!busy.has(s.id)) {
        busy.add(s.id);
        return s;
      }
    }
    throw new Error("No free speaker for slot");
  };

  const talks = placements.map((p, i): SeedDoc<TalkDoc> => {
    const id = pad3(i + 1, "talk");
    const vendorSpeaker = p.seed.vendor ? (p.seed.title.includes("NimbusCloud") ? speakers[0] : speakers[1]) : undefined;
    const lead = vendorSpeaker ?? nextSpeaker(p.slot);
    const panel = p.seed.format === "panel" ? [lead, nextSpeaker(p.slot)] : [lead];
    for (const s of panel) s.talkIds.push(id);
    const [t0, t1] = p.seed.tags as [string, string | undefined];
    const abstract = [p.seed.hook, TAG_BLURBS[t0], t1 ? TAG_BLURBS[t1] : undefined, CLOSERS[p.seed.level]]
      .filter(Boolean)
      .join(" ");
    return {
      _id: id,
      _source: TalkDoc.parse({
        title: p.seed.title,
        abstract,
        level: p.seed.level,
        tags: p.seed.tags,
        track: TRACK_BY_TAG[t0] ?? "General",
        format: p.seed.format ?? "talk",
        is_vendor_pitch: p.seed.vendor ?? false,
        speaker_ids: panel.map((s) => s.id),
        speaker_names: panel.map((s) => s.name),
        room_id: p.room,
        start: iso(p.start),
        end: iso(p.end),
        captions_url: `https://captions.confy.example/${id}.vtt`,
        ...((ROOMS.find((r) => r.id === p.room)?.capacity ?? 0) >= 80
          ? { stream_url: `https://stream.confy.example/live/${id}` }
          : {}),
      }),
    };
  });

  const speakerDocs = speakers.map(
    (s): SeedDoc<SpeakerDoc> => ({
      _id: s.id,
      _source: SpeakerDoc.parse({
        name: s.name,
        bio: `${s.name} is a ${s.role} at ${s.company}.`,
        company: s.company,
        talk_ids: s.talkIds,
      }),
    }),
  );
  return { talks, speakers: speakerDocs };
}

interface Person {
  id: string;
  company: string;
  doc: AttendeeDoc;
}

/**
 * The people are fictional, so we never invent a profile URL (it could belong to a real stranger). The demo
 * link is a LinkedIn people SEARCH for their name and company, which targets no specific real person.
 */
export const linkedInSearchUrl = (name: string, company: string) =>
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${name} ${company}`)}`;

const person = (
  id: string,
  display_name: string,
  role: string,
  company: string,
  company_type: string,
  stack: string,
  interests: string[],
  open_to_intros = true,
  intro_prefs: "quiet" | "1:1" = "1:1",
  shareLinkedIn = true,
): Person => ({
  id,
  company,
  doc: {
    display_name,
    role,
    company_type,
    bio: `${role} at ${company}, a ${company_type} organization. Works with ${stack}. Keen to meet people working on ${interests.join(", ")}.`,
    stack,
    interests,
    open_to_intros,
    intro_prefs,
    visibility: "public",
    ...(shareLinkedIn ? { linkedin_url: linkedInSearchUrl(display_name, company) } : {}),
  },
});

/** Hand-written people the demo queries rely on. */
const FIXTURES: Person[] = [
  // Demo personas (the user switcher)
  person("demo-alex", "Alex Rivera", "Platform Engineer", "Quillstack", "startup", "Kubernetes on AWS EKS, Terraform, Argo CD, Prometheus", ["gitops", "multi-tenancy", "platform-engineering"]),
  person("demo-sam", "Sam Chen", "Site Reliability Engineer", "Brightcart", "retailer", "Kubernetes on GKE, OpenTelemetry, Grafana, Go services", ["observability", "reliability", "opentelemetry"], true, "quiet"),
  person("demo-priya", "Priya Kapoor", "Security Engineer", "Meridian Health", "healthcare", "Kubernetes on Azure AKS, Kyverno, Falco", ["security", "policy", "supply-chain"]),
  person("demo-jordan", "Jordan Hughes", "Engineering Manager", "Foundry Media", "media", "Serverless-first, a few managed clusters, TypeScript", ["devex", "cost", "platform-engineering"], true, "quiet"),
  // Contacts recall: "the person I met at the eBPF talk who worked at a bank"
  person("att-marisol", "Marisol Okafor", "Staff Security Engineer", "Halden Bank", "bank", "Kubernetes with Cilium and eBPF runtime detection", ["ebpf", "security", "observability"]),
  person("att-tomasz", "Tomasz Brandt", "Platform Lead", "Ferro Savings", "bank", "Multi-tenant platform with vcluster and OPA Gatekeeper", ["multi-tenancy", "policy", "platform-engineering"]),
  person("att-keiko", "Keiko Tanaka", "Site Reliability Engineer", "Brightcart", "retailer", "Kubernetes with Cilium, Hubble, and Grafana", ["ebpf", "networking", "observability"]),
  // People matching: "who run Kubernetes in production on bare metal" (3 open to intros, 1 not)
  person("att-rafael", "Rafael Costa", "Infrastructure Engineer", "Gridline Telecom", "telco", "Kubernetes on bare metal, Cluster API, MetalLB, PXE provisioning", ["bare-metal", "networking", "platform-engineering"]),
  person("att-aisha", "Aisha Rahman", "Site Reliability Engineer", "Ironvale Hosting", "hosting provider", "Production Kubernetes on bare metal across three data centers, Ceph", ["bare-metal", "storage", "reliability"]),
  person("att-lars", "Lars Nilsson", "Principal Engineer", "Polar Freight", "logistics", "Bare metal Kubernetes at the edge of warehouses, k3s, GitOps", ["bare-metal", "edge", "gitops"]),
  person("att-nia", "Nia Williams", "Platform Engineer", "Ferro Savings", "bank", "Kubernetes on bare metal in private data centers", ["bare-metal", "security"], false),
];

function buildAttendees(rng: Rng): Person[] {
  const used = new Set(FIXTURES.map((f) => f.doc.display_name));
  const generated: Person[] = [];
  for (let i = 0; generated.length < ATTENDEE_COUNT - FIXTURES.length; i++) {
    let name = "";
    for (let shift = 0; shift < LAST_NAMES.length; shift++) {
      name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7 + 1 + shift) % LAST_NAMES.length]}`;
      if (!used.has(name)) break;
    }
    used.add(name);
    const company = rng.pick(COMPANIES);
    const { stack, interests } = rng.pick(STACKS);
    generated.push({
      ...person(
        pad3(generated.length + 1, "att"),
        name,
        rng.pick(ROLES),
        company.name,
        company.type,
        stack,
        interests,
        rng.chance(0.8),
        rng.chance(0.5) ? "quiet" : "1:1",
        rng.chance(0.85), // opt-in: some attendees choose not to share a LinkedIn link
      ),
    });
  }
  return [...FIXTURES, ...generated];
}

function buildContacts(rng: Rng, people: Person[], talks: SeedData["talks"]): Array<SeedDoc<ContactDoc>> {
  const talkByTitle = (title: string) => {
    const t = talks.find((d) => d._source.title === title);
    if (!t) throw new Error(`Seed talk not found: ${title}`);
    return t;
  };
  const byId = new Map(people.map((p) => [p.id, p]));
  const make = (owner: string, n: number, attendeeId: string, talkTitle: string, notes: string) => {
    const a = byId.get(attendeeId) as Person;
    const talk = talkByTitle(talkTitle);
    return {
      _id: `contact-${owner.replace("demo-", "")}-${n}`,
      _source: ContactDoc.parse({
        owner_id: owner,
        attendee_id: attendeeId,
        contact_name: a.doc.display_name,
        role: a.doc.role,
        company: a.company,
        company_type: a.doc.company_type,
        met_at_talk_id: talk._id,
        met_at_talk_title: talk._source.title,
        met_at_time: iso(Date.parse(talk._source.start) + 50 * 60_000),
        notes,
        ...(a.doc.linkedin_url ? { linkedin_url: a.doc.linkedin_url } : {}),
      }),
    };
  };

  const ebpf = "eBPF in Production: What We Learned the Hard Way";
  const contacts = [
    make("demo-alex", 1, "att-marisol", ebpf, "Talked about rolling out eBPF runtime detection on their payment clusters. They are hiring platform security engineers. Follow up about the rollout plan."),
    make("demo-alex", 2, "att-keiko", ebpf, "Compared Hubble dashboards. Runs eBPF-based networking for a retail checkout stack and had good tips on dropping noisy flows."),
    make("demo-alex", 3, "att-tomasz", "Multi-Tenancy 101: Namespaces, Quotas, and Boundaries", "Explained how their team onboards tenants with virtual clusters. Wants to compare quota policies."),
    make("demo-alex", 4, "att-rafael", "Kubernetes on Bare Metal: Lessons from 500 Nodes", "Runs bare metal Kubernetes for a telco and offered to share their PXE provisioning scripts."),
  ];

  const pool = people.filter((p) => p.id.startsWith("att-0"));
  const talkPool = talks.filter((t) => t._source.format !== "keynote");
  for (const owner of ["demo-sam", "demo-priya", "demo-jordan"]) {
    for (let n = 1; n <= 3; n++) {
      const a = rng.pick(pool);
      const t = rng.pick(talkPool);
      const topic = t._source.tags[0] as string;
      contacts.push(
        make(owner, n, a.id, t._source.title, `Chatted about ${topic} after the session. Works as a ${a.doc.role.toLowerCase()} and wants to swap notes later.`),
      );
    }
  }
  return contacts;
}

export function generateSeed(seed: number = DEFAULT_SEED): SeedData {
  const rng = createRng(seed);
  const { talks, speakers } = buildTalksAndSpeakers(rng);
  const people = buildAttendees(rng);

  return {
    talks,
    speakers,
    rooms: ROOMS.map((r) => ({
      _id: r.id,
      _source: RoomDoc.parse({
        name: r.name,
        capacity: r.capacity,
        floor: r.floor,
        is_quiet_room: r.quiet,
        step_free_route: r.route,
        accessibility_notes: r.notes,
      }),
    })),
    attendees: people.map((p) => ({ _id: p.id, _source: AttendeeDoc.parse(p.doc) })),
    contacts: buildContacts(rng, people, talks),
    resources: RESOURCES.map((r, i) => ({ _id: pad3(i + 1, "res"), _source: ResourceDoc.parse(r) })),
  };
}
