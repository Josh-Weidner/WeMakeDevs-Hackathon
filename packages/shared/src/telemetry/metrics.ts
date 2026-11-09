import { metrics } from "@opentelemetry/api";

/**
 * Metric names: the single source of truth. The app's in-product numbers
 * (e.g. "likely full") and the Dash0 dashboard use these SAME metrics.
 * Attributes: use IDs only (talk_id, room_id, job_type), never PII.
 */
export const METRIC = {
  talkBookmarks: "confy.talk.bookmarks",
  talkSearchHits: "confy.talk.search_hits",
  roomForecastOccupancy: "confy.room.forecast_occupancy",
  jobsBacklog: "confy.jobs.backlog",
  jobsFailed: "confy.jobs.failed",
  aiErrors: "confy.ai.errors",
} as const;

export function getMeter(serviceName: string) {
  return metrics.getMeter(serviceName);
}
