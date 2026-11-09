import type { ScheduleBreak, ScheduleItem } from "@confy/shared/contracts";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Times come from the api as ISO strings in the venue's offset. We read the clock straight from the
 * string so the schedule shows venue time no matter where the browser is.
 */
export function clock(iso: string): string {
  const hours = Number(iso.slice(11, 13));
  const minutes = iso.slice(14, 16);
  return `${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

export const dayKey = (iso: string) => iso.slice(0, 10);

/** "Tuesday, November 10" for an ISO date or datetime. */
export function dayLabel(iso: string): string {
  const [y, m, d] = dayKey(iso).split("-").map(Number) as [number, number, number];
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${MONTHS[m - 1]} ${d}`;
}

export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export const levelLabel = (level: string) => level.charAt(0).toUpperCase() + level.slice(1);

export type DayEntry = { kind: "talk"; item: ScheduleItem } | { kind: "break"; rest: ScheduleBreak };

export interface DayGroup {
  day: string;
  label: string;
  entries: DayEntry[];
}

/** Group talks and breaks by day, in time order, ready to render as one timeline per day. */
export function groupByDay(items: ScheduleItem[], breaks: ScheduleBreak[]): DayGroup[] {
  const entries: Array<DayEntry & { start: string }> = [
    ...items.map((item) => ({ kind: "talk" as const, item, start: item.start })),
    ...breaks.map((rest) => ({ kind: "break" as const, rest, start: rest.start })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  const groups = new Map<string, DayGroup>();
  for (const entry of entries) {
    const key = dayKey(entry.start);
    const group = groups.get(key) ?? { day: key, label: dayLabel(key), entries: [] };
    group.entries.push(entry);
    groups.set(key, group);
  }
  return [...groups.values()];
}
