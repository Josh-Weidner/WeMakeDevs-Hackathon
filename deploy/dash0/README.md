# Dash0 setup (track: Stop Flying Blind)

Everything the code emits is already wired. These steps create the **dashboard**, the **SLO**, and the
**Agent0 / MCP** moment in the Dash0 UI. Nothing here is applied automatically.

## What the code sends

| Signal | Source | Notes |
|---|---|---|
| Traces | api, worker (`node --import @confy/shared/telemetry/register`) | `web → api → OpenAI → Elasticsearch`. Business spans are `confy.<domain>.<operation>` (e.g. `confy.talks.search`, `confy.demand.forecast`, `confy.ai.embed_query`, `confy.jobs.process`). |
| Browser RUM | web (`@dash0/sdk-web`) | Page views, web vitals, errors, fetch spans. Same-origin `/api/proxy` calls carry `traceparent`, so a click joins the backend trace. Needs `DASH0_RUM_ENDPOINT` + `DASH0_RUM_TOKEN`. |
| Async links | worker | `confy.jobs.process` spans are **linked** to the request span that enqueued the job (`traceparent` stored on the job). |
| Logs | api, worker (pino) | JSON with `trace_id` / `span_id`. No PII. |
| Metrics | api, worker | Table below. |

### Product metrics (the same numbers the app shows)

| Metric (OTel name) | Type | Attributes | Emitted by |
|---|---|---|---|
| `confy.talk.search_hits` | counter | `talk_id`, `room_id` | api, per top-5 search result |
| `confy.talk.bookmarks` | counter | `talk_id`, `room_id` | api, `POST /v1/talks/:id/bookmark` |
| `confy.room.forecast_occupancy` | gauge | `talk_id`, `room_id` | api, forecast ÷ capacity (> 1 = "likely full") |
| `confy.jobs.backlog` | gauge | none | worker, jobs pending or in progress |
| `confy.jobs.failed` | counter | `job_type` | worker, per failed attempt |
| `confy.ai.errors` | counter | `operation` | api + worker |

In Dash0 (PromQL) the names become `confy_talk_search_hits_total`, `confy_room_forecast_occupancy`,
`confy_jobs_backlog`, and so on. Confirm the exact spelling in the Metrics explorer first.

## 1. Tokens

1. **Backend token** (already in `.env`): `OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <token>`.
2. **Browser token** (new): Settings → Auth Tokens → a **separate** token with **Ingesting** permission only,
   limited to the dataset. It ships in the page, so never reuse the backend token.
   Set `DASH0_RUM_ENDPOINT` (same OTLP endpoint) and `DASH0_RUM_TOKEN`; `make secrets` copies them into the cluster.

## 2. Dashboard: "Confy: search, demand, ingest"

| Panel | Query / source |
|---|---|
| Search latency p50/p95 | Histogram of the api HTTP server duration, filtered to routes `/v1/talks/search`, `/v1/people/match`, `/v1/contacts/search`. (Metric is `http.server.request.duration` or `http.server.duration` depending on the instrumentation version; pick whichever the explorer shows.) |
| Search error rate | `5xx` ÷ all requests for the same routes. |
| Room demand | `confy_room_forecast_occupancy` by `talk_id`; add a threshold line at **1.0** (the "likely full" line the app uses). |
| Search hits vs bookmarks | `sum by (talk_id) (rate(confy_talk_search_hits_total[5m]))` and the bookmarks equivalent. |
| Job backlog | `confy_jobs_backlog`. This is the line that climbs during the chaos demo. |
| Failed jobs / AI errors | `rate(confy_jobs_failed_total[5m])`, `rate(confy_ai_errors_total[5m])`. |
| Web vitals / RUM errors | From the Website Monitoring view for `confy-web`. |

Put the **room demand** panel next to the app's "Likely full" warning in the demo: they show the same number.

## 3. SLO

**"99% of searches complete in under 500 ms"**, over a rolling 7 days.

- Good events: api requests to `/v1/talks/search`, `/v1/people/match`, `/v1/contacts/search` with duration < 500 ms
  and status < 500.
- Total events: all requests to those routes.
- Attach a burn-rate alert (fast: 2% budget in 1 h; slow: 5% in 6 h).

## 4. Agent0 / Dash0 MCP moment (required for the track)

During the incident rehearsal (`make break-worker`):

1. The **job backlog** panel climbs and `confy_jobs_failed_total` spikes.
2. Ask **Agent0** (or the Dash0 MCP from Claude Code) for the root cause. Expected finding: the worker is being
   OOMKilled; `confy.jobs.process` spans stop and the backlog grows.
3. Have it open the fix PR (revert the memory limit), which then goes through Gitar.

Capture screenshots or logs of this for the demo. To add the Dash0 MCP to Claude Code, use the MCP URL and token
from Dash0 → Settings (the URL is account-specific, so it is not committed here).
