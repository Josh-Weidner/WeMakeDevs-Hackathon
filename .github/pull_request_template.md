## What
<!-- One feature per PR (CLAUDE.md §6). What does this change? -->

## Why
<!-- Problem it solves for attendees / which SPEC.md section -->

## Tracks advanced
- [ ] Elasticsearch (Find the Right Talk)
- [ ] Dash0 (Stop Flying Blind)
- [ ] Radar (AI SRE)
- [ ] Gitar (Never Merge Broken)
- [ ] Merge Forward (accessibility / inclusion)

## How it was tested
<!-- Commands run, screenshots for UI, Dash0 trace link, Radar finding -->

## Checklist
- [ ] Follows layering: routes → services → repositories (no ES/HTTP leaking across layers)
- [ ] Contracts updated in `packages/shared/src/contracts` if any request/response/document changed
- [ ] Private-index queries (`contacts`, `clips`, `highlights`) filter on `owner_id`
- [ ] New operations have spans/metrics; no PII or user text in telemetry or logs
- [ ] UI: alt text, labeled controls, no color-only status, keyboard reachable, live-region announcements
- [ ] `.env.example` updated for any new env var
