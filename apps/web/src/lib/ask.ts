import type { NavItem } from "./nav";

/** Where a plain-language request can go. Each destination reads `?q=` and runs it on arrival. */
export interface AskTarget {
  id: "schedule" | "people" | "contacts";
  path: string;
  /** Same cap as that page's own text box. */
  maxLength: number;
  /** How the palette words the action, e.g. "Build a schedule for". */
  verb: string;
}

export const ASK_TARGETS: Record<AskTarget["id"], AskTarget> = {
  schedule: { id: "schedule", path: "/schedule", maxLength: 300, verb: "Build a schedule for" },
  people: { id: "people", path: "/people", maxLength: 200, verb: "Find people:" },
  contacts: { id: "contacts", path: "/contacts", maxLength: 200, verb: "Search your contacts for" },
};

/** A link that opens the target with the request filled in (and run). */
export function askHref(target: AskTarget, text: string): string {
  return `${target.path}?q=${encodeURIComponent(text.trim().slice(0, target.maxLength))}`;
}

/**
 * Rank the destinations by which one the sentence is most likely for, so pressing Enter does the sensible thing.
 * All three are always offered; this only decides the order. Contacts first ("who did I meet" is about the past),
 * then people ("people who run…"), otherwise schedule.
 */
export function rankAskTargets(text: string): AskTarget[] {
  const t = text.toLowerCase();
  const contacts = /\b(i met|did i meet|i've met|remember|met at|follow[- ]?up|my contacts?)\b/.test(t);
  const people = /\b(people|someone|anyone|person who|engineers? who|who (run|runs|work|works|do|does|know|knows)|meet|introduce)\b/.test(t);
  const first: AskTarget["id"] = contacts ? "contacts" : people ? "people" : "schedule";
  return [first, ...(["schedule", "people", "contacts"] as const).filter((id) => id !== first)].map((id) => ASK_TARGETS[id]);
}

/** Pages the typed text matches, by name or description. With no text, all of them. */
export function matchPages(items: readonly NavItem[], text: string): NavItem[] {
  const t = text.trim().toLowerCase();
  const ready = items.filter((item) => item.ready);
  return t ? ready.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(t)) : ready;
}

/** A `?q=` search param, first value only, trimmed and capped. Anything empty or missing is undefined. */
export function firstParam(value: string | string[] | undefined, max: number): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim().slice(0, max);
  return trimmed ? trimmed : undefined;
}
