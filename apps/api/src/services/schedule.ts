import {
  withSpan,
  type AiClient,
  type Logger,
  type ProductMetrics,
  type RoomResult,
  type RoomsRepository,
  type ScheduleItem,
  type ScheduleRequest,
  type ScheduleResponse,
  type TalkResult,
  type TalksRepository,
} from "@confy/shared";
import type { DemandService } from "./demand.js";
import { embedQuery } from "./embed-query.js";
import { parseScheduleRequest } from "./schedule-parser.js";
import { findBreaks, pickSchedule, type Candidate } from "./schedule-solver.js";

/** How many search results the solver may choose from. */
const CANDIDATE_POOL = 40;

export interface ScheduleService {
  build(request: ScheduleRequest): Promise<ScheduleResponse>;
}

export function createScheduleService(deps: {
  talks: TalksRepository;
  rooms: Pick<RoomsRepository, "list">;
  demand: Pick<DemandService, "forecast">;
  ai: Pick<AiClient, "embed" | "chatJson">;
  logger: Logger;
  metrics?: Pick<ProductMetrics, "recordAiError">;
}): ScheduleService {
  const toItem = (talk: TalkResult, room: RoomResult, ratio: number, likelyFull: boolean): ScheduleItem => ({
    talk_id: talk.id,
    title: talk.title,
    level: talk.level,
    tags: talk.tags,
    track: talk.track,
    format: talk.format,
    speaker_names: talk.speaker_names,
    start: talk.start,
    end: talk.end,
    ...(talk.stream_url ? { stream_url: talk.stream_url } : {}),
    ...(talk.captions_url ? { captions_url: talk.captions_url } : {}),
    room: {
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      floor: room.floor,
      step_free_route: room.step_free_route,
      accessibility_notes: room.accessibility_notes,
    },
    occupancy_ratio: ratio,
    likely_full: likelyFull,
  });

  return {
    async build(request) {
      return withSpan("confy.schedule.build", { "confy.low_stimulation": request.lowStimulation }, async () => {
        const { parsed, by } = await parseScheduleRequest(deps.ai, deps.logger, request.request, deps.metrics);
        const vector = await embedQuery(deps.ai, deps.logger, parsed.query ?? undefined, deps.metrics);

        const [found, forecast, rooms] = await Promise.all([
          deps.talks.search({
            text: parsed.query ?? undefined,
            vector,
            level: parsed.level ?? undefined,
            excludeVendorPitch: parsed.excludeVendorPitch,
            limit: CANDIDATE_POOL,
          }),
          deps.demand.forecast(),
          deps.rooms.list(),
        ]);

        const roomById = new Map(rooms.map((r) => [r.id, r]));
        const demandByTalk = new Map(forecast.talks.map((t) => [t.talk_id, t]));
        const onDay = parsed.day ? found.filter((t) => t.start.startsWith(parsed.day as string)) : found;

        const candidates: Candidate[] = onDay.map((talk) => ({ talk, ratio: demandByTalk.get(talk.id)?.ratio ?? 0 }));
        const picked = pickSchedule(candidates, { maxTalks: parsed.maxTalks, lowStimulation: request.lowStimulation });

        const items = picked.flatMap((talk) => {
          const room = roomById.get(talk.room_id);
          const demand = demandByTalk.get(talk.id);
          return room ? [toItem(talk, room, demand?.ratio ?? 0, demand?.likely_full ?? false)] : [];
        });

        const quiet = rooms.find((r) => r.is_quiet_room);
        const breaks = request.lowStimulation
          ? findBreaks(picked, quiet ? { id: quiet.id, name: quiet.name, floor: quiet.floor, step_free_route: quiet.step_free_route } : null)
          : [];

        const warnings: string[] = [];
        if (items.length === 0) warnings.push("No talks matched that request. Try a broader topic or a different level.");
        else if (items.length < parsed.maxTalks) {
          const noun = `talk${items.length === 1 ? "" : "s"}`;
          // Distinguish "few talks matched" from "matches were dropped because they overlap".
          warnings.push(
            onDay.length > items.length
              ? `Only ${items.length} ${noun} fit without clashing.`
              : `Only ${items.length} ${noun} matched that request.`,
          );
        }
        const full = items.filter((i) => i.likely_full);
        if (full.length > 0) warnings.push(`${full.length === 1 ? "One talk is" : `${full.length} talks are`} likely to be full. Arrive early or watch the stream.`);

        return { parsed, interpreted_by: by, low_stimulation: request.lowStimulation, items, breaks, warnings };
      });
    },
  };
}
