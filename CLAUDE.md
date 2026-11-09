# CLAUDE.md: Confy

Confy is an all-in-one conference companion, built for the WeMakeDevs Cloud Native Hackathon (Nov 9).
**Product spec, decisions, and demo script are in [SPEC.md](SPEC.md). Read it before starting a feature.**
Deadline: **submissions close 5:30 PM MT**. Prefer shipping a small working slice over a large unfinished one.

Tracks we're entering (each must be clearly visible in the code and demo):
**Elasticsearch** (core data layer) · **Dash0** (OpenTelemetry, and observability as part of the product) · **Radar** (runs on k8s, AI SRE) · **Sonar/Gitar** (every change is a reviewed PR) · **Merge Forward** (accessibility and inclusion).

---

## 1. Repo layout

```
apps/
  web/        Next.js (App Router, TS). UI only, and talks only to the api
  api/        Node + Fastify (TS). HTTP API, business logic
  worker/     Node (TS). Polls the ES `jobs` index for embeddings, transcription, classification
packages/
  shared/     Code shared by api and worker (and contracts shared with web)
    src/contracts/   zod schemas + inferred types for every request/response/document
    src/es/          ES client factory, index mappings, repositories, query builders
    src/ai/          OpenAI client wrapper (embeddings, chat, speech-to-text)
    src/telemetry/   OTel bootstrap, metric names, span helpers
    src/config/      zod-validated env loading
deploy/k8s/   kustomize base + overlays (dev, chaos)
seed/         synthetic data generator and generated JSON
.gitar/       Gitar review instructions and rules
.github/      CI workflows, PR template
```

Tooling: **pnpm workspaces**, **TypeScript `strict: true`** everywhere, Node 22 LTS, ESM. Packages import each other by workspace name (`@confy/shared`), never by relative paths across package boundaries.

## 2. Architecture rules (clean layering)

### Dependency direction (enforced in review)

```
web ──HTTP (contracts)──▶ api routes ─▶ services ─▶ repositories ─▶ ES / OpenAI clients
                                                   ▲
                          worker handlers ─────────┘ (reuses the same services/repositories)
```

- **Dependencies point inward.** A layer may import only the layer below it. Lower layers never import upper ones, so a repository never imports Fastify and a service never builds an HTTP response.
- **Contracts are the source of truth** for the frontend and backend. Every request body, query, response, and ES document has a zod schema in `packages/shared/src/contracts`. TS types come from `z.infer`, so no types are hand-duplicated. When changing an API, change the contract first in its own small PR so both teammates can build against it in parallel.

### api (`apps/api/src`)

| Folder | Responsibility | May NOT |
|---|---|---|
| `routes/` | One file per resource (`talks.ts`, `schedule.ts`, `people.ts`, `contacts.ts`, `clips.ts`, `demand.ts`, `intros.ts`). Parse and validate input with the contract schema, call one service, and map the result to the response schema | contain business logic or touch ES |
| `services/` | Business logic: schedule solver, NL-query parsing, demand forecast, match + opener, clip classification | know about HTTP (req/reply, status codes) |
| `container.ts` | **Composition root.** Builds clients, then repositories, then services, and injects them. The only place that calls `new` on infrastructure | — |
| `errors.ts` | Domain errors (`NotFoundError`, `ValidationError`, `UpstreamError`) mapped to HTTP status codes in **one** Fastify error handler | — |
| `server.ts` / `main.ts` | Builds the Fastify app (testable without listening) / starts the process | — |

- All routes live under `/v1`. Responses are JSON. Errors have the shape `{ error: { code, message } }`, and never include stack traces or upstream payloads.
- Every service takes its dependencies through constructor/factory params (`createScheduleService({ talksRepo, ai })`) so that tests can pass in fakes.
- Health: `GET /healthz` (process alive) and `GET /readyz` (ES reachable). k8s probes use both.
- The **demo persona** comes from the `x-user-id` header (there's no auth, by decision). A Fastify hook resolves it once into `request.userId`, and services receive `userId` as an explicit argument.

### worker (`apps/worker/src`)

- `loop.ts` claims a job, dispatches to `handlers/<jobType>.ts`, then marks it done or failed. Handlers call shared services/repositories and contain no ES query code of their own.
- **Job queue = ES `jobs` index** (by decision):
  - Status: `pending → processing → done | failed`. Fields: `type`, `payload`, `status`, `attempts`, `claimed_at`, `error`, `@timestamp`.
  - **Claim atomically** with optimistic concurrency (`if_seq_no` + `if_primary_term`). If a claim fails on a version conflict, skip that job, because another worker already took it.
  - **Lease timeout:** `processing` jobs with `claimed_at` older than 2 min become claimable again. Max 3 attempts, then `failed`, with the error message stored without PII.
  - **Handlers must be idempotent**: use deterministic doc IDs (e.g. `talk:<id>`) so retries overwrite instead of duplicating.
  - Poll with backoff (e.g. 500 ms → 5 s when idle). Shut down gracefully on SIGTERM: finish the current job, then exit.

### web (`apps/web/src`)

| Folder | Responsibility |
|---|---|
| `app/` | Routes and layouts only. Keep them thin, composing feature components |
| `features/<feature>/` | `schedule`, `people`, `contacts`, `clip`, `talk-mode`, `rooms`. Each has its own components, hooks, and view-model mapping |
| `components/ui/` | Shared **accessible** primitives (Button, IconButton, Dialog, Toast/LiveRegion, StatusBadge). Build features from these, not raw elements |
| `lib/api/` | The **only** place that calls the api: a typed client that validates responses with the shared zod schemas |
| `lib/telemetry/` | Browser RUM / OTel web setup |

- **web never calls Elasticsearch or OpenAI directly** and never holds their keys. All secrets are server-side in api/worker.
- Use Server Components by default. Add `"use client"` only for interactivity (mic buffer, toggles, forms).
- The api base URL comes from env (`API_BASE_URL`). Inside k8s it's the api Service DNS name.

## 3. Elasticsearch (track: Find the Right Talk)

ES is the **core data layer**. Every persisted entity lives in ES: no side database, no in-memory "source of truth".

- **Versioned index plus alias** for every index (`talks_v1` → alias `talks`). Code reads and writes **aliases only**. Mappings are defined as code in `packages/shared/src/es/mappings/` and applied by an **idempotent** `pnpm es:setup` script.
- Use `dynamic: "strict"` mappings. Every field is declared explicitly, so a typo fails loudly instead of creating a new field.
- **Repositories own all queries.** There's one repository per index in `packages/shared/src/es/repositories/`. Query builders are pure functions (`buildHybridTalkQuery(params) → body`) so they can be unit-tested and snapshotted.
- **Private indices (`contacts`, `clips`, `highlights`) require `ownerId`** in every repository method signature, and the query always includes `filter: { term: { owner_id } }`. Never add a method that skips the filter.
- Embeddings: OpenAI `text-embedding-3-small`, **1536 dims, cosine**. The constant `EMBEDDING_DIMS` lives in one place. Embedding input text is built by one function per entity so that indexing and querying stay consistent.
- Showcase several search types (judges score "smart use of search"):
  - **Hybrid:** `retriever: { rrf: { retrievers: [ standard(multi_match), knn ] } }` for talk search and the schedule builder
  - **Vector (kNN):** people matching, with filters (`open_to_intros: true`) inside the `knn.filter`
  - **Keyword:** BM25 `multi_match`, `search_as_you_type` autocomplete, terms aggregations for facets
  - **Aggregations:** room demand from `demand-events`
  - **Scoped hybrid:** contacts recall and Resources
- Hard constraints go in `filter` / `must_not` (level, vendor pitch, owner) rather than in scoring. Natural-language requests are parsed by the LLM into `{ text, filters }` validated with zod before they reach ES.
- Use `_bulk` for ingestion. Use `refresh: "wait_for"` only in seed scripts and tests, never on the hot request path.
- Secrets: `ELASTICSEARCH_URL` and `ELASTICSEARCH_API_KEY` come from env / k8s Secret. They are never committed or logged.

## 4. Observability: OpenTelemetry + Dash0 (track: Stop Flying Blind)

- **Instrument first.** A new service isn't "done" until its traces show up in Dash0.
- OTel bootstraps from `packages/shared/src/telemetry`, loaded **before** app code (`node --import @confy/shared/telemetry/register`). It exports OTLP to the collector / Dash0 (`OTEL_EXPORTER_OTLP_ENDPOINT`, auth header from a Secret).
- `service.name`: `confy-web`, `confy-api`, `confy-worker`. Also set `service.version` (git SHA) and `deployment.environment`.
- Every search must produce one connected trace: **web (RUM) → api → OpenAI → Elasticsearch**. Propagate W3C trace context from the browser fetch to the api and from api → worker through the job document (store `traceparent` on the job and use it as a span link).
- Manual spans for business operations are named `confy.<domain>.<operation>` (e.g. `confy.schedule.build`, `confy.jobs.claim`). Attributes use the `confy.` prefix (`confy.talk_id`, `confy.job_type`, `confy.result_count`).
- **No PII or content in telemetry:** no transcripts, notes, names, queries typed by users, or API keys in span attributes, logs, or metric labels. Use IDs and counts.
- Logs are structured JSON (pino) and include `trace_id` / `span_id`. Log errors once, at the boundary.
- **Product metrics** (the same numbers the app shows, by decision):
  - `confy.talk.bookmarks`, `confy.talk.search_hits` (counters, attrs `talk_id`, `room_id`)
  - `confy.room.forecast_occupancy` (gauge, ratio to capacity)
  - `confy.jobs.backlog`, `confy.jobs.failed`, `confy.ai.errors`
  - Metric names live as constants in `telemetry/metrics.ts`, so don't use ad-hoc strings.
- Keep these up to date: a Dash0 dashboard (search p95, error rate, job backlog, room demand) and one SLO ("99% of `/v1/search*` < 500 ms").

## 5. Kubernetes + Radar (track: AI SRE)

- A local **kind** cluster, namespace `confy`, with one Deployment + Service per app (`web`, `api`, `worker`). ES is Elastic Cloud Serverless, outside the cluster.
- Manifests live in `deploy/k8s/base`. `overlays/chaos` holds the deliberate break (worker memory limit too low, or a bad ConfigMap value). `make break-worker` / `make fix-worker` toggle it.
- Every container has: resource **requests and limits**, liveness + readiness probes, a non-root `securityContext`, and labels `app.kubernetes.io/name`, `app.kubernetes.io/part-of: confy`, `app.kubernetes.io/version`.
- Config goes in a ConfigMap and secrets in Secrets created from a local `.env` (`make secrets`). **Never commit `.env` or Secret manifests with values.** Keep `.env.example` updated whenever you add a variable.
- Images use multi-stage Dockerfiles, are built locally and loaded with `kind load docker-image`, and are tagged with the git SHA rather than `latest`.
- Radar is connected to the cluster. Use the Radar MCP from Claude Code while building and operating (`radar-cloud` MCP server). Note significant Radar findings in the PR description, because that's demo evidence.

## 6. Git, PRs, and Gitar (track: Never Merge Broken)

### Rule: one feature = one branch = one PR (applies to humans and Claude)

1. **Before writing any code for a feature**, sync `main` and create its branch: `git switch main && git pull && git switch -c feat/<area>-<short>`. Never start feature work on `main` or on another feature's branch.
2. **Commit early and often**: a commit for each working step (it compiles, tests pass), with a small focused diff. Don't save everything for one giant commit at the end.
3. **Push and open the PR as soon as the first commit exists** (`gh pr create --draft` is fine), so Gitar reviews the work while it's in progress. Mark it ready when done.
4. **One feature per PR.** If you notice unrelated work (a bug, refactor, or another feature), open a separate branch/PR for it. Don't bundle it.
5. **Merge only when** CI is green and Gitar's review comments are addressed (fixed, auto-applied, or replied to with a reason). Use squash merge, then delete the branch.
6. Claude: after finishing a feature, report the PR URL. Don't merge PRs unless the user asks.

- **Nobody pushes to `main`.** Every change goes through a PR reviewed by Gitar (and the teammate when possible).
- Branches: `feat/<area>-<short>`, `fix/…`, `chore/…`, `docs/…`, `contract/…` (contract-only PRs). Keep PRs small: one feature slice each.
- PR description: what and why, how it was tested, which track(s) it advances, and screenshots for UI.
- CI (`.github/workflows/ci.yml`) must pass: typecheck, lint (including `eslint-plugin-jsx-a11y`), unit tests, build. When CI fails, let **Gitar diagnose it and use auto-apply** where it fits. Keep at least one example for the demo.
- Gitar config (per [docs.gitar.ai](https://docs.gitar.ai/features/rules.md)): **review instructions** are plain markdown in `.gitar/review/*.md`, and **custom rules** are markdown with YAML frontmatter (`title`, `description`, `when`, `actions`, `type: check|automation`) in `.gitar/rules/*.md`. To apply a Gitar suggestion, tick its checkbox or reply `gitar fix`. Together they must mirror the key rules in this file, especially: the `owner_id` filter on private indices, no PII in telemetry, layering rules, and the accessibility rules below.
- Commits are imperative and concise (`Add hybrid talk search`). Disclose AI assistance (see §9).

## 7. Accessibility + inclusion (track: Merge Forward)

These are **merge-blocking rules**, also enforced by the Gitar a11y rule:
- Every `<img>` has meaningful `alt` (`alt=""` only for decorative images).
- Every button, icon-button, link, and form control has an accessible name (visible label or `aria-label`).
- **Status is never conveyed by color alone.** "Likely full", crowd level, and errors always include text and/or an icon with a label.
- Everything is keyboard reachable with a visible focus indicator and a logical tab order. Dialogs trap focus and close on Esc.
- Dynamic updates (warnings, clip saved, search results count) are announced through an `aria-live` region.
- WCAG AA contrast. Respect `prefers-reduced-motion`. Low-stimulation mode also removes animation, reduces color saturation, and hides non-essential badges.
- Use semantic HTML first (`<button>`, `<nav>`, `<main>`, headings in order) and ARIA only when needed.
- Talk pages always show room location, step-free route, and captions/transcript/stream links when available.

## 8. Privacy, data, and Clip mode

- **All demo data is synthetic** (generated in `seed/`). No real attendee data, no scraped profiles (hackathon rule 4).
- **Clip mode:** audio stays in an in-browser rolling buffer and is uploaded **only when the user taps Save** (last 1 or 5 min). Raw audio is deleted after transcription, and only the transcript, summary, and entities are stored, scoped to `owner_id`.
- **LinkedIn: draft only.** Confy generates a note and a LinkedIn people-search link, and the **user sends it manually**. Never add code that automates LinkedIn search, connection requests, or messaging (it violates LinkedIn's terms).
- Never store or log secrets. All keys come from env/Secrets.

## 9. Code quality and testing

- Use TypeScript strict, no `any`, unless it sits at a parsed boundary with a zod schema directly after it. Validate all external input (HTTP, ES responses you depend on, LLM output) with zod.
- **LLM output is untrusted input**: parse it into a schema, and handle refusals and invalid JSON with a fallback.
- Every OpenAI and ES call has a timeout and bounded retries with backoff. If OpenAI is down, search degrades to keyword-only instead of failing.
- Tests (vitest):
  - Query builders: snapshot tests
  - Services: unit tests with fake repositories
  - Routes: `fastify.inject` tests
  - One smoke script hits the deployed stack
- Keep functions small and named for what they do. Comments explain *why*, not *what*.
- README must include setup steps (cluster, secrets, seed, run) and an **AI-assistance disclosure** (hackathon rule 5). Both teammates must be able to explain every part of the architecture (rule 6).

## 10. Commands

> Keep this section accurate. Add a command here in the same PR that creates it.

```
corepack enable              # provides the pinned pnpm (packageManager field)
pnpm install
pnpm dev                     # web :3000 + api :4000 + worker (health :4001), uses .env
pnpm typecheck && pnpm lint && pnpm test && pnpm build   # same as CI
make help                    # list all targets
make up                      # kind cluster + secrets from .env + build/load images + deploy
make status | make port-forward | make logs-<api|worker|web>
make break-worker / make fix-worker   # demo chaos toggle (worker OOMKilled)
make destroy                 # delete the kind cluster
```

Planned (add when built): `pnpm es:setup` (indices + aliases), `pnpm seed` (synthetic data), `make load` (keynote spike load script).

Gotchas:
- `@confy/shared` must be built before the apps typecheck or run. The root `dev`, `typecheck`, and `test` scripts do this for you.
- Local dev without Dash0: set `OTEL_SDK_DISABLED=true` in `.env`.
- TypeScript is pinned to ~6.0 and ESLint to ^9 until typescript-eslint and jsx-a11y support newer versions.
