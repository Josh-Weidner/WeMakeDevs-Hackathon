import { metrics, type Meter, type ObservableResult } from "@opentelemetry/api";

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

export interface TalkRef {
  talkId: string;
  roomId: string;
}

export interface OccupancySample extends TalkRef {
  /** forecast demand ÷ room capacity (> 1 means "likely full"). */
  ratio: number;
}

/** Typed recorders over the product metrics, so call sites never use ad-hoc metric names. */
export interface ProductMetrics {
  recordSearchHits(talks: TalkRef[]): void;
  recordBookmark(talk: TalkRef): void;
  recordJobFailed(jobType: string): void;
  recordAiError(operation: string): void;
  /** Gauge sampled on every export: return the latest cached forecast (never do I/O in here). */
  observeOccupancy(sample: () => OccupancySample[]): void;
  /** Gauge sampled on every export: return the latest cached backlog size, or undefined if unknown. */
  observeBacklog(sample: () => number | undefined): void;
}

export function createProductMetrics(service: string, meter: Meter = getMeter(service)): ProductMetrics {
  const searchHits = meter.createCounter(METRIC.talkSearchHits, { description: "Talks returned by searches" });
  const bookmarks = meter.createCounter(METRIC.talkBookmarks, { description: "Talk bookmarks" });
  const jobsFailed = meter.createCounter(METRIC.jobsFailed, { description: "Jobs that failed an attempt" });
  const aiErrors = meter.createCounter(METRIC.aiErrors, { description: "Failed AI provider calls" });

  return {
    recordSearchHits: (talks) => talks.forEach((t) => searchHits.add(1, { talk_id: t.talkId, room_id: t.roomId })),
    recordBookmark: (t) => bookmarks.add(1, { talk_id: t.talkId, room_id: t.roomId }),
    recordJobFailed: (jobType) => jobsFailed.add(1, { job_type: jobType }),
    recordAiError: (operation) => aiErrors.add(1, { operation }),

    observeOccupancy(sample) {
      meter
        .createObservableGauge(METRIC.roomForecastOccupancy, { description: "Forecast demand ÷ capacity" })
        .addCallback((result: ObservableResult) => {
          for (const s of sample()) result.observe(s.ratio, { talk_id: s.talkId, room_id: s.roomId });
        });
    },

    observeBacklog(sample) {
      meter
        .createObservableGauge(METRIC.jobsBacklog, { description: "Jobs pending or in progress" })
        .addCallback((result: ObservableResult) => {
          const size = sample();
          if (size !== undefined) result.observe(size);
        });
    },
  };
}
