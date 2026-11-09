# Confy

**An all-in-one conference companion.** Find the right talks, meet the right people, get warned before a room fills up, and get through the conference your way.

Built during the [WeMakeDevs Cloud Native Hackathon](https://www.wemakedevs.org/hackathons/cnh) (Nov 9, Salt Lake City) for the **Elasticsearch**, **Dash0**, **Radar**, **Sonar/Gitar**, and **Merge Forward** tracks.

- Product spec, track coverage, and demo script: [SPEC.md](SPEC.md)
- Architecture and codebase conventions: [CLAUDE.md](CLAUDE.md)

## Architecture

```
Browser ─▶ web (Next.js) ─▶ api (Fastify) ─┬─▶ Elasticsearch (Elastic Cloud Serverless)
                                            └─▶ OpenAI (embeddings, chat, speech-to-text)
           worker (Node) ── polls ES `jobs` index ─▶ embeddings / transcription ─▶ ES
All services ─ OpenTelemetry ─▶ Dash0        All services run on kind, watched by Radar
```

| Path | What |
|---|---|
| `apps/web` | Next.js UI. Talks only to the api (same-origin `/api/proxy`) |
| `apps/api` | HTTP API: routes → services → repositories |
| `apps/worker` | Background job loop (ES-backed queue) |
| `packages/shared` | zod contracts, ES client and index names, OpenAI wrapper, OTel bootstrap |
| `deploy/` | kind config, k8s manifests (kustomize), chaos overlay |
| `.gitar/` | Gitar review instructions and custom rules |

## Prerequisites

- Node 22+ and pnpm 9 (`corepack enable` gives you the pinned pnpm)
- Docker, [kind](https://kind.sigs.k8s.io/), and kubectl (for the cluster)
- Accounts: Elastic Cloud Serverless (Elasticsearch project), OpenAI, Dash0, Radar Cloud, and Gitar installed on this repo

## Setup

```bash
corepack enable
pnpm install
cp .env.example .env        # fill in ES, OpenAI, and Dash0 values (.env is gitignored)
```

### Run locally (no cluster)

```bash
pnpm dev                    # web :3000, api :4000, worker health :4001
```

Set `OTEL_SDK_DISABLED=true` in `.env` to run without sending telemetry.

### Run on Kubernetes (kind)

```bash
make up                     # kind cluster + secrets from .env + build/load images + deploy
make status
make port-forward           # http://localhost:3000
```

Then connect the cluster to Radar Cloud (see the [Radar docs](https://github.com/skyhook-io/radar)) and add the Radar MCP to your coding agent:

```bash
claude mcp add radar-cloud --scope user --transport http https://api.radarhq.io/mcp
```

### Demo chaos ("keynote time")

```bash
make break-worker           # worker memory limit → 48Mi → OOMKilled
make fix-worker             # restore
```

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

CI runs these on every PR, plus Docker builds of all three images. Every feature lands as its own PR reviewed by Gitar (see CLAUDE.md §6).

## AI assistance disclosure

Per hackathon rule 5: this project was built with help from **Claude Code** (Anthropic), an AI coding assistant. It helped draft the spec, codebase guidelines, scaffolding, and code. Each PR notes AI-assisted commits with a `Co-Authored-By` trailer. The team reviewed, tested, and can explain all of the code and architecture.

## Data and privacy

All schedule, attendee, and contact data is **synthetic**. Clip mode uploads audio only when the user taps Save, and raw audio is deleted after transcription. LinkedIn follow-ups are drafts the user sends manually. There is no automated outreach.
