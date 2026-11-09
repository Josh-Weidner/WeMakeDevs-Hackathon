import { propagation, trace, type Meter } from "@opentelemetry/api";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProductMetrics, METRIC } from "../src/telemetry/metrics.js";
import { currentTraceparent, linksFromTraceparent, withSpan } from "../src/telemetry/tracing.js";

const TRACEPARENT = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";

afterEach(() => {
  vi.restoreAllMocks();
  propagation.disable();
});

describe("trace context helpers", () => {
  it("returns no traceparent and no links outside a trace", () => {
    expect(currentTraceparent()).toBeUndefined();
    expect(linksFromTraceparent(undefined)).toEqual([]);
    expect(linksFromTraceparent(TRACEPARENT)).toEqual([]); // no propagator registered
  });

  it("reads the traceparent injected by the active propagator", () => {
    vi.spyOn(propagation, "inject").mockImplementation((_ctx, carrier) => {
      (carrier as Record<string, string>).traceparent = TRACEPARENT;
    });
    expect(currentTraceparent()).toBe(TRACEPARENT);
  });

  it("turns a stored traceparent into a span link", () => {
    propagation.setGlobalPropagator({
      inject: () => undefined,
      fields: () => ["traceparent"],
      extract: (ctx, carrier) => {
        const [, traceId, spanId] = String((carrier as Record<string, string>).traceparent).split("-");
        return trace.setSpanContext(ctx, { traceId: traceId!, spanId: spanId!, traceFlags: 1, isRemote: true });
      },
    });
    const [link] = linksFromTraceparent(TRACEPARENT);
    expect(link?.context).toMatchObject({ traceId: "0af7651916cd43dd8448eb211c80319c", spanId: "b7ad6b7169203331" });
  });

  it("accepts span links in withSpan", async () => {
    await expect(withSpan("confy.test.linked", {}, async () => 1, { links: [] })).resolves.toBe(1);
  });
});

function fakeMeter() {
  const counters = new Map<string, ReturnType<typeof vi.fn>>();
  const gauges = new Map<string, (r: { observe: ReturnType<typeof vi.fn> }) => void>();
  const meter = {
    createCounter: (name: string) => {
      const add = vi.fn();
      counters.set(name, add);
      return { add };
    },
    createObservableGauge: (name: string) => ({
      addCallback: (cb: (r: { observe: ReturnType<typeof vi.fn> }) => void) => gauges.set(name, cb),
    }),
  } as unknown as Meter;
  return { meter, counters, gauges };
}

describe("product metrics", () => {
  it("counts search hits, bookmarks, failed jobs and AI errors with ID-only attributes", () => {
    const { meter, counters } = fakeMeter();
    const m = createProductMetrics("test", meter);

    m.recordSearchHits([{ talkId: "talk-1", roomId: "room-4" }, { talkId: "talk-2", roomId: "room-1" }]);
    m.recordBookmark({ talkId: "talk-1", roomId: "room-4" });
    m.recordJobFailed("embed-talk");
    m.recordAiError("embed_query");

    expect(counters.get(METRIC.talkSearchHits)).toHaveBeenCalledTimes(2);
    expect(counters.get(METRIC.talkSearchHits)).toHaveBeenCalledWith(1, { talk_id: "talk-1", room_id: "room-4" });
    expect(counters.get(METRIC.talkBookmarks)).toHaveBeenCalledWith(1, { talk_id: "talk-1", room_id: "room-4" });
    expect(counters.get(METRIC.jobsFailed)).toHaveBeenCalledWith(1, { job_type: "embed-talk" });
    expect(counters.get(METRIC.aiErrors)).toHaveBeenCalledWith(1, { operation: "embed_query" });
  });

  it("reports occupancy per talk and the job backlog from cached values", () => {
    const { meter, gauges } = fakeMeter();
    const m = createProductMetrics("test", meter);
    m.observeOccupancy(() => [{ talkId: "talk-1", roomId: "room-4", ratio: 1.125 }]);
    const state: { backlog?: number } = {};
    m.observeBacklog(() => state.backlog);

    const occupancy = { observe: vi.fn() };
    gauges.get(METRIC.roomForecastOccupancy)!(occupancy);
    expect(occupancy.observe).toHaveBeenCalledWith(1.125, { talk_id: "talk-1", room_id: "room-4" });

    const unknown = { observe: vi.fn() };
    gauges.get(METRIC.jobsBacklog)!(unknown);
    expect(unknown.observe).not.toHaveBeenCalled(); // not measured yet → no sample

    state.backlog = 7;
    const known = { observe: vi.fn() };
    gauges.get(METRIC.jobsBacklog)!(known);
    expect(known.observe).toHaveBeenCalledWith(7);
  });
});
