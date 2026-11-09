import type { ScheduleBreak, TalkResult } from "@confy/shared";

const MINUTE = 60_000;
/** Low-stimulation mode: at least this long between talks. */
export const MIN_GAP_MINUTES = 15;
/** ...and after {@link MAX_IN_A_ROW} talks in a row, a longer rest. */
export const REST_GAP_MINUTES = 30;
export const MAX_IN_A_ROW = 2;
/** How many ranking places one unit of "crowdedness" costs a talk in low-stimulation mode. */
const CROWD_PENALTY = 10;

export interface Candidate {
  talk: TalkResult;
  /** Demand forecast ÷ capacity for this talk's room (0 when unknown). */
  ratio: number;
}

export interface SolverOptions {
  maxTalks: number;
  lowStimulation: boolean;
}

const startMs = (t: TalkResult) => Date.parse(t.start);
const endMs = (t: TalkResult) => Date.parse(t.end);

/** True when a run of talks (each starting after the previous gap < REST_GAP) exceeds MAX_IN_A_ROW. */
function breaksRhythm(sorted: TalkResult[]): boolean {
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = (startMs(sorted[i] as TalkResult) - endMs(sorted[i - 1] as TalkResult)) / MINUTE;
    run = gap < REST_GAP_MINUTES ? run + 1 : 1;
    if (run > MAX_IN_A_ROW) return true;
  }
  return false;
}

/**
 * Greedy, clash-free selection. Candidates arrive best-first (search relevance). A talk is taken when it
 * overlaps nothing already chosen. Low-stimulation mode also needs a gap between talks, caps back-to-back
 * runs, and demotes talks in crowded rooms so quieter alternatives win.
 */
export function pickSchedule(candidates: Candidate[], options: SolverOptions): TalkResult[] {
  const buffer = (options.lowStimulation ? MIN_GAP_MINUTES : 0) * MINUTE;

  const ranked = candidates
    .map((c, index) => ({ talk: c.talk, key: index + (options.lowStimulation ? CROWD_PENALTY * c.ratio : 0) }))
    .sort((a, b) => a.key - b.key)
    .map((c) => c.talk);

  const chosen: TalkResult[] = [];
  for (const talk of ranked) {
    if (chosen.length >= options.maxTalks) break;
    const clashes = chosen.some((c) => startMs(talk) < endMs(c) + buffer && startMs(c) < endMs(talk) + buffer);
    if (clashes) continue;

    const next = [...chosen, talk].sort((a, b) => startMs(a) - startMs(b));
    if (options.lowStimulation && breaksRhythm(next)) continue;
    chosen.push(talk);
  }
  return chosen.sort((a, b) => startMs(a) - startMs(b));
}

type QuietRoom = ScheduleBreak["quiet_room"];

/** Rest windows between consecutive talks on the same day, each pointing at the quiet room. */
export function findBreaks(schedule: TalkResult[], quietRoom: QuietRoom): ScheduleBreak[] {
  const breaks: ScheduleBreak[] = [];
  for (let i = 1; i < schedule.length; i++) {
    const prev = schedule[i - 1] as TalkResult;
    const next = schedule[i] as TalkResult;
    const minutes = Math.round((startMs(next) - endMs(prev)) / MINUTE);
    if (prev.start.slice(0, 10) !== next.start.slice(0, 10) || minutes < MIN_GAP_MINUTES) continue;
    breaks.push({ start: prev.end, end: next.start, minutes, quiet_room: quietRoom });
  }
  return breaks;
}
