import type { DemandResponse, TalkResult } from "@confy/shared/contracts";
import { dayKey, dayLabel } from "../schedule/format";

/** Forecast demand ÷ capacity at or above this is "Getting busy" (1.0 and over is "likely full"). */
export const BUSY_RATIO = 0.7;

export type CrowdLevel = "unknown" | "quiet" | "busy" | "full";

export const CROWD_LABEL: Record<Exclude<CrowdLevel, "unknown">, string> = {
  quiet: "Quiet",
  busy: "Getting busy",
  full: "Likely full: arrive early or watch the stream",
};

/** Same thresholds the api uses for its `likely_full` flag, plus a middle "busy" band. */
export function crowdLevel(demand: { ratio: number; likely_full: boolean } | undefined): CrowdLevel {
  if (!demand) return "unknown";
  if (demand.likely_full) return "full";
  return demand.ratio >= BUSY_RATIO ? "busy" : "quiet";
}

export interface Session {
  talk: TalkResult;
  crowd: CrowdLevel;
}

export interface SessionDay {
  day: string;
  label: string;
  sessions: Session[];
}

/** Attach a crowd level to each talk (from the live forecast) and group them by day, in time order. */
export function sessionsByDay(talks: TalkResult[], demand: DemandResponse | null): SessionDay[] {
  const byTalk = new Map((demand?.talks ?? []).map((t) => [t.talk_id, t]));
  const sorted = [...talks].sort((a, b) => a.start.localeCompare(b.start));

  const days = new Map<string, SessionDay>();
  for (const talk of sorted) {
    const key = dayKey(talk.start);
    const group = days.get(key) ?? { day: key, label: dayLabel(key), sessions: [] };
    group.sessions.push({ talk, crowd: crowdLevel(byTalk.get(talk.id)) });
    days.set(key, group);
  }
  return [...days.values()];
}
