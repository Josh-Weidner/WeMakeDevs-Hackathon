# Confy review instructions

Confy is a conference companion built for a hackathon. The full guidelines are in `CLAUDE.md`. Review every PR against these project-specific conventions. Flag violations as blocking unless noted.

## Architecture and layering
- `apps/web` may import only `@confy/shared/contracts`. It must never import `@confy/shared` (root), `@elastic/elasticsearch`, or `openai`, and it must never read ES/OpenAI keys.
- In `apps/api`, `routes/` only validate input, call one service, and shape the response. Business logic in a route is a finding.
- `services/` must not import Fastify types or set HTTP status codes. They throw domain errors from `errors.ts`.
- All Elasticsearch queries live in repositories under `packages/shared/src/es/`. Inline ES queries in routes, services, or worker handlers are a finding.
- Infrastructure clients are only constructed in `container.ts` (api) or `main.ts` (worker).
- Request/response/document shapes must come from zod schemas in `packages/shared/src/contracts`. Flag hand-written duplicate types.

## Elasticsearch
- **Blocking, security:** every query against `contacts`, `clips`, or `highlights` must include a `term` filter on `owner_id`. A missing filter leaks one user's private contacts to another user.
- Code must reference aliases (`INDEX.*` constants), never versioned names like `talks_v1`.
- Mappings must use `dynamic: "strict"`.
- Embedding model/dims must come from `EMBEDDING_MODEL` / `EMBEDDING_DIMS`. Flag hard-coded `1536` or model strings.
- `refresh: true` / `"wait_for"` must not appear on request paths (seed scripts and tests are fine).
- Worker job handlers must be idempotent (deterministic document IDs).

## Observability
- New business operations should use `withSpan("confy.<domain>.<op>", ...)` with `confy.`-prefixed attributes.
- **Blocking, privacy:** span attributes, metric attributes, and log fields must not contain names, emails, transcripts, notes, free-text queries, or secrets. IDs and counts only.
- Metric names must come from `METRIC` constants.
- Use the pino logger, never `console.log`.

## Kubernetes
- Every container needs resource requests and limits, liveness and readiness probes, and a non-root security context.
- Never commit Secret values or `.env` files. New env vars must be added to `.env.example`.

## Privacy and Clip mode
- Audio is uploaded only after an explicit user Save action. Raw audio must be deleted after transcription.
- **Blocking:** no code may automate LinkedIn (scraping, search, connection requests, or messages). LinkedIn follow-ups are drafts the user sends manually.

## Error handling
- External calls (ES, OpenAI) need timeouts and bounded retries. LLM output must be parsed with a zod schema before use.
- API errors must use the `{ error: { code, message } }` envelope and must not leak stack traces or upstream payloads.
