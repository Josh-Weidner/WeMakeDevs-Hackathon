import { ScheduleResponse, type ScheduleItem } from "@confy/shared/contracts";
import { z } from "zod";

/** The last schedule a persona built, kept in the browser so "my day" survives navigating around the app. */
export const SavedSchedule = z.object({
  request: z.string(),
  saved_at: z.iso.datetime({ offset: true }),
  schedule: ScheduleResponse,
});
export type SavedSchedule = z.infer<typeof SavedSchedule>;

export const savedScheduleKey = (personaId: string) => `confy:schedule:${personaId}`;

/** Parse defensively: a missing, corrupted or outdated-shape value is "nothing saved", never an error. */
export function parseSavedSchedule(raw: string | null | undefined): SavedSchedule | null {
  if (!raw) return null;
  try {
    const result = SavedSchedule.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** The first talk that hasn't started yet, or null once the whole schedule is behind us. */
export function nextUp(schedule: { items: ScheduleItem[] }, now: Date): ScheduleItem | null {
  const upcoming = schedule.items.filter((item) => Date.parse(item.start) > now.getTime()).sort((a, b) => a.start.localeCompare(b.start));
  return upcoming[0] ?? null;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "starts in 25 min", "starts in 3 h 10 min", "starts in 2 days". */
export function startsIn(startIso: string, now: Date): string {
  const ms = Date.parse(startIso) - now.getTime();
  if (ms <= 0) return "starting now";
  if (ms < HOUR) return `starts in ${Math.max(1, Math.round(ms / MINUTE))} min`;
  if (ms < 2 * DAY) {
    const hours = Math.floor(ms / HOUR);
    const minutes = Math.round((ms % HOUR) / MINUTE);
    return minutes === 0 ? `starts in ${hours} h` : `starts in ${hours} h ${minutes} min`;
  }
  return `starts in ${Math.round(ms / DAY)} days`;
}
