# Spec: Confy, the all-in-one conference companion

> Status: **DRAFT v0.2** (core decisions locked; see §13). Items marked **❓ OPEN** need a team decision. Items marked **⚠️ CHECK** are places where our plan differs from the official hackathon pages.

Cloud Native Hackathon (WeMakeDevs × KubeCon NA), Mon Nov 9, The Shop Workspace, SLC.
Sources: [hackathon page](https://www.wemakedevs.org/hackathons/cnh) · [rules](https://www.wemakedevs.org/hackathons/cnh/rules) · [resources](https://www.wemakedevs.org/hackathons/cnh/resources) · [Luma](https://luma.com/cnh)

---

## 1. Problem and pitch

Conferences are overwhelming. Attendees can't find the right talks, rooms fill up, hallway intros are loud and awkward, and afterwards you have 40 connections you can't place. Attendees who are neurodivergent, disabled, or new to the field feel all of this more.

**One app covers the event from start to finish:**

| Phase | Feature | Primary track |
|---|---|---|
| Before | Natural-language personal schedule builder with no clashes | Elasticsearch |
| Before | Clear accessibility details shared ahead of time (room locations, step-free routes, captions) | Merge Forward |
| During | "Likely full" room warnings built from live demand telemetry | Dash0 |
| During | People matching with a suggested opener, plus planned 1:1 intros | Elasticsearch, Merge Forward |
| During | Low-stimulation mode: breaks, quiet rooms, crowd forecasts | Merge Forward, Dash0 |
| During | **Confy Clip**: save the last 1 or 5 min of a conversation or talk, then classify it as a connection (drafted LinkedIn follow-up) or a highlight (Experiment / Resources) | Elasticsearch, Merge Forward |
| During | **Talk mode**: live captions and highlight capture for the talk you're in | Merge Forward, Elasticsearch |
| After | Contacts recall: "the person I met at the eBPF talk who worked at a bank" | Elasticsearch |
| Always | Self-healing operations: Radar AI SRE on Kubernetes, Dash0 traces, Gitar-reviewed PRs | Radar, Dash0, Gitar |

## 2. Hard constraints (from official pages)

- **Deadline: submissions close at 5:30 PM MT today**, followed by presentations and judging. Winners are announced at 6:30.
- Main coding starts **after** kickoff. Ideas and notes made beforehand are fine (rule 1).
- **Public repo plus a README with setup instructions** (rule 3).
- **Disclose AI coding assistant use** in the README (rule 5). Every team member must be able to explain the architecture (rule 6).
- No private, personal, or login-protected data in the repo or demo (rule 4), so attendee and contact data must be **synthetic or opt-in**.
- One project per team, teams of up to 4. A project enters every sponsor track whose tool it genuinely uses, plus Merge Forward.

## 3. What judges score, per track (official) vs. our coverage

| Track | Official criteria | Our plan | Gap |
|---|---|---|---|
| **Elasticsearch: Find the Right Talk** | ES is the **core data layer**. Smart use of keyword, semantic, vector, or hybrid search. Makes conferences easier. | Every entity lives in ES. Hybrid RRF, kNN people matching, scoped contact search | ✅ Show **3+ search types** in the demo (see §6) |
| **Dash0: Stop Flying Blind** | Depth of instrumentation, **including RUM if there's a frontend**. **Use Agent0 or the Dash0 MCP to find and fix a real problem**, shown in the demo. Observability is part of the product. Bonus: dashboard or SLO. | OTel on API and workers. Demand data drives the "likely full" warnings | ⚠️ Add **browser RUM**, an **Agent0/MCP fix moment**, and a **dashboard and SLO** |
| **Radar: AI SRE** | Run on K8s with Radar connected. Use **Radar UI and MCP** while building or operating. **AI Investigation on a real issue**, with the findings explained. | kind/k3d, 4 services, broken ingest worker in the demo | ⚠️ Also use the Radar **MCP from our coding agent** during the build and capture evidence |
| **Sonar: Never Merge Broken** | Gitar is part of how we built (features land through reviewed PRs). **Project-aware setup** with review instructions and rules. **Uses CI failure diagnosis and auto-apply.** | GitHub App, every feature as a PR, a11y rule | ⚠️ We need a **GitHub Actions CI** so Gitar has failures to diagnose. Use **auto-apply** at least once |
| **Merge Forward** | Makes conferences more inclusive and accessible | Low-stimulation mode, planned intros, screen-reader UI, captions, step-free routes | ✅ |

✅ Resolved: Gitar uses **both** `.gitar/review/*.md` (review instructions) and `.gitar/rules/*.md` (custom rules with frontmatter). "Dash0 in the first hour" isn't an official rule, but we're doing it anyway.

## 4. Architecture

```
            ┌──────────────── local Kubernetes (kind) ─────────────────┐
 Browser ──▶│  web: Next.js (+ OTel RUM)  ──▶  api: Node (OTel) ───────┼──▶ Elastic Cloud
  (RUM, mic │                                   │                      │    Serverless
   buffer)  │                                   ▼                      │       ▲
            │                    ingest-worker: Node (OTel) ───────────┼───────┘
            │                       │  embeddings, transcription,      │
            │                       └─ classification ─────────────────┼──▶ OpenAI
            │  OTel Collector / Dash0 Operator ────────────────────────┼──▶ Dash0
            │  Radar agent (UI + MCP + AI Investigations)              │
            └──────────────────────────────────────────────────────────┘
```

Services (each a separate Deployment in namespace `confy`):

1. **web** (Next.js): UI for the schedule builder, people matching, contacts, Clip/Talk mode, low-stim mode, and room info. Accessibility comes first. It does no ES access itself and calls the api.
2. **api** (Node, Fastify or Express ❓): search endpoints, NL-query parsing (OpenAI), schedule solver, demand service, intro scheduler, and clip upload.
3. **ingest-worker** (Node): picks up pending jobs (seed docs, profiles, contact notes, clips), handles transcription, classification, and embeddings, then bulk-indexes into ES. **This is the service we break on purpose in the demo.**
4. **Elasticsearch**: **Elastic Cloud Serverless** (decided). It runs outside the cluster, so the services read the URL and API key from a k8s Secret.

Queue: **an ES `jobs` index that the worker polls** (recommended: fewest moving parts, and the backlog is easy to graph during the incident). ❓ Confirm.

No auth: a **demo user switcher** (a dropdown of synthetic personas) sets `x-user-id`. `contacts` queries still filter on `owner_id`, so per-user scoping is still shown.

## 5. Elasticsearch data model

All indices use **versioned name plus alias** (e.g. `talks_v1` → alias `talks`) so we can reindex without downtime.

Embeddings: **OpenAI `text-embedding-3-small` (1536 dims, cosine)** (decided). The worker computes them and stores them in `dense_vector` fields.

Seed data: **synthetic** (decided). About 60 talks over 2 days, 8 rooms with mixed capacities (including at least one 150-seat room and one quiet room), about 40 speakers, about 80 attendee personas, and a few pre-made contacts per demo persona. It's generated by a script and checked into `seed/`.

| Index (alias) | Key fields | Notes |
|---|---|---|
| `talks` | `title` (text + keyword), `abstract` (text), `level` (keyword: beginner/intermediate/advanced), `tags` (keyword), `track`, `format`, `is_vendor_pitch` (bool or score), `speaker_ids`, `speaker_names` (text), `room_id`, `start`/`end` (date), `captions_url`, `transcript_url`, `stream_url`, `embedding` (dense_vector 1536) | Embedding input = title + abstract + tags + speaker bios |
| `speakers` | `name`, `bio`, `company`, `talk_ids`, `embedding` | |
| `rooms` | `name`, `capacity` (int), `floor`, `is_quiet_room` (bool), `step_free_route` (text), `accessibility_notes`, `location` (geo_point, optional) | Small. Could be joined in the api instead of indexed |
| `attendees` | `display_name`, `role`, `company_type` (e.g. "bank"), `bio`, `stack` (text), `interests` (keyword), `open_to_intros` (bool), `intro_prefs` (quiet/1:1), `visibility`, `embedding` | **Opt-in only. Synthetic seed data for the demo** |
| `contacts` | `owner_id` (keyword, **mandatory filter**), `attendee_id`, `met_at_talk_id`, `met_at_talk_title`, `met_at_time`, `notes` (text), `linkedin_url` (optional, copied from the attendee), `embedding` | Private per user. Every query is filtered by `owner_id` |
| `demand-events` | `talk_id`, `room_id`, `event_type` (search_hit/view/bookmark), `user_id`, `@timestamp` | Data stream. See §7 |
| `intros` | `requester_id`, `target_id`, `slot`, `location` (quiet room), `status` | Planned 1:1s |
| `clips` | `owner_id`, `kind` (connection/highlight), `duration_s`, `transcript` (text), `summary`, `talk_id` (if inside a talk), `entities` (name, role, company), `@timestamp`, `embedding` | Only created when the user taps Save. **No raw audio is stored** |
| `highlights` | `owner_id`, `talk_id`, `text`, `topic_tags`, `experiment` (generated mini-lab), `resource_ids`, `embedding` | From Clip or Talk mode |
| `resources` | `title`, `url`, `type` (doc/repo/talk), `tags`, `embedding` | Small curated synthetic set used by "Resources" |
| `jobs` | `type`, `payload_ref`, `status`, `attempts`, `error` | Work queue that the worker polls |

## 6. Search features (show 3+ kinds)

| Feature | Query technique | Example |
|---|---|---|
| **Personal schedule builder** | OpenAI parses the NL request into `{query, filters}`, then an **RRF retriever** fuses `multi_match` (BM25) and `knn`, with filters `level=beginner` and `must_not is_vendor_pitch`. The **api then picks talks greedily so none overlap** (and inserts breaks in low-stim mode) | "beginner talks on multi-tenancy, nothing vendor-pitchy" |
| **People matching** | **kNN** on `attendees.embedding` with a filter on `open_to_intros=true`, plus a keyword `must` on terms like "bare metal". The top 3 results go to OpenAI, which writes a suggested opener | "3 people here who also run Kubernetes in production on bare metal" |
| **Contacts recall** | **Hybrid** search on `contacts`, scoped by `owner_id`, combining notes, `met_at_talk_title` match ("eBPF"), and attendee `company_type` ("bank") | "the person I met at the eBPF talk who worked at a bank" |
| **Plain keyword search and autocomplete** | BM25 plus a `search_as_you_type` title field, and terms aggregations for facets (track, level, room) | Typing "ebp…" |
| **Room demand** | **Aggregations** on `demand-events` | Feeds §7 |
| (stretch) **RAG Q&A** over abstracts and venue info | Retrieve, then OpenAI answers with citations | "Where's the step-free route to Room 4?" |

## 7. Observability (Dash0) and the demand feature

- **Instrumentation:** OTel SDK auto-instrumentation and manual spans on api and worker, so every search shows a span tree `web → api → (openai) → elasticsearch`. Use **browser RUM** on web (Dash0 website monitoring guide). Logs carry trace correlation.
- **Custom metrics:** `talk.search_hits`, `talk.bookmarks`, `room.forecast_occupancy`, `ingest.queue_lag`, `ingest.embed_errors`.
- **Demand to "likely full":** `forecast = bookmarks + α·recent_searches` over a window, compared with `room.capacity`. If forecast > capacity, show "Likely full: arrive early or watch the stream (link)".
  - **Decided:** The api counts demand by aggregating `demand-events` in ES. The api and worker emit the **same counts** as OTel metrics (`talk.bookmarks`, `talk.search_hits`, `room.forecast_occupancy`, tagged with `talk_id` and `room_id`) to a **Dash0 dashboard**. The demo shows the in-app warning next to the matching Dash0 panel.
- **Dashboard and SLO (bonus):** Search p95 latency, error rate, and ingest lag. One SLO such as "99% of searches < 500 ms".
- **Agent0/MCP moment (required):** During the demo incident, use Agent0 or the Dash0 MCP to find the root cause, and ideally to open a fix PR, which Gitar then reviews. One incident can count for three tracks.

## 8. Kubernetes and Radar

- Manifests (or a Helm chart / kustomize) for web, api, ingest-worker, (ES), and the OTel collector or Dash0 Operator.
- Radar connected through the in-cluster agent / Radar Cloud. Use the Radar MCP from Claude Code (`claude mcp add radar-cloud --scope user --transport http https://api.radarhq.io/mcp`) during the build, and screenshot or log that usage.
- **Chaos switch:** A `make break-worker` target that applies a patch, either `resources.limits.memory: 32Mi` (OOMKilled) or a bad `ELASTICSEARCH_URL`/`OPENAI_MODEL` in the ConfigMap (CrashLoopBackOff). `make fix-worker` reverts it.
- **Argo CD deploys `main`.** Application `confy` syncs `deploy/k8s/base` from `main` (auto-sync + prune, selfHeal **off** so the chaos break stays visible). `make release` builds the images for `origin/main` and rolls them out. Runbook and evidence: [deploy/radar/README.md](deploy/radar/README.md).

### 8a. Radar track checklist (from the organizers' slide)

The two that are easy to forget, and the demo needs both: **the 11:00 Checks screenshot**, and **at least one Investigate even if nothing breaks**.

| # | When | Item | Status |
|---|---|---|---|
| 1.1 | Start (11:00) | Claim the cluster as soon as the team is formed | ✅ `sweet-blossom` (Radar 1.20.2) |
| 1.2 | Start | Connect the coding agent to Radar before writing code (`radar-cloud` MCP) | ✅ |
| 1.3 | Start | Screenshot **Checks**: the "before" picture | ⚠️ Not taken at 11:00. Radar MCP audit captured 13:50, before the Checks fixes: `confy` 10 medium (3 Security, 7 Reliability), cluster 68. After (14:03): **3 medium, 0 Security** (podHARisk only). Take the "after" UI screenshot |
| 2.1 | All day | Argo CD deploys every push. The agent pushes, syncs, and waits for each rollout through Radar (`wait_for`) | ✅ Argo CD tracks `main`; `make release` + Radar `wait_for` after each merge |
| 2.2 | All day | When something breaks, look in Radar first | ✅ Habit: Radar `issues` / `diagnose` before kubectl |
| 3 | Afternoon | Make it better (optional; pick any): add a database · add metrics · **fix something Checks flagged** · set up autoscaling · set up a canary deploy | ✅ Fix Checks findings (PDBs, topology spread, no SA token, worker replicas 2). Database = Elasticsearch, metrics = OTel → Dash0 (§7). Autoscaling skipped: the cluster has no metrics-server. Canary skipped |
| 4.1 | Any time | Run **Investigate** on anything we can't explain, then let the agent ship the fix | ✅ Rehearsal 13:15: worker OOMKilled, investigation `chat_YZtzpMMTIX1d76Rd`, fix shipped by a merge to `main` |
| 4.2 | Any time | No real breakage? Run Investigate on the app after a release anyway. An all-clear with evidence counts | ✅ 14:04: Investigate on `confy/web` after release `3bf65a2`: all-clear (confidence 0.92) |
| 5 | By 5:30 | Tell the day's story **from inside Radar**: the deploy timeline, the investigation(s), Checks before and after (the 11:00 screenshot) | ⬜ Share investigations with the org; stage the tabs |
| 6 | From Nov 10 | Connect our own cluster to Radar Cloud (participants get 3 months of Enterprise free); star the repo | ⬜ |

This only works if we actually use Radar all day, so log every Radar use in [deploy/radar/README.md](deploy/radar/README.md) and the PR descriptions.

## 9. Gitar and the PR workflow

- Install the Gitar GitHub App on the (public) repo. Every feature lands as a PR, and nobody pushes to main.
- `.gitar/review/` gets project review instructions, and `.gitar/rules/` holds custom check rules covering our conventions, such as "every ES query on `contacts` must filter on `owner_id`", "no PII in logs", and "every new endpoint has an OTel span".
- **Accessibility rule:** every `<img>` has `alt`, every button and icon-button has an accessible name, status is never shown by color alone, and every form input has a label.
- **CI (GitHub Actions):** lint, unit tests, and an a11y check (axe / eslint-plugin-jsx-a11y). Gitar diagnoses CI failures and we use **auto-apply** at least once.
- Demo evidence: **PR A**, where Gitar caught a real bug (for example, the contacts query is missing its `owner_id` filter, so contacts leak between users). **PR B**, where Gitar caught an a11y issue.

## 10. Merge Forward features

- **Low-stimulation mode:** Schedule builder enforces breaks (e.g. ≥15 min every 2 talks), prefers less crowded rooms using the §7 forecast, and highlights quiet rooms.
- **Planned 1:1 intros:** Request an intro from a match, pick a time slot and a quiet room, and both people get the details. No hallway shouting.
- **Accessible UI:** Semantic HTML, keyboard navigation, visible focus, ARIA live region for warnings, AA contrast, `prefers-reduced-motion`.
- **Advance info:** Each talk page shows room location, step-free route, captions/transcript/stream links, and expected crowd level.

## 10b. Confy Clip and Talk mode

**Design principle: nothing is kept unless the user chooses to keep it.** This is a feature to pitch, especially for Merge Forward.

- **Clip mode (conversations and talks):** The browser `MediaRecorder` keeps a **rolling in-memory buffer of 5 min** of audio chunks, and older chunks are dropped. Nothing leaves the device. **Save 1 min / Save 5 min** uploads only that slice, which the api turns into a `jobs` entry for the worker. The worker uses OpenAI speech-to-text (⚠️ CHECK the current model ID) to get a transcript, then an LLM classifies it as `connection` or `highlight` and extracts entities. **The raw audio is deleted after transcription.**
  - **Connection:** creates a `contacts` doc (name, role, company, which talk you were near, a summary as notes, embedding), so it shows up in contacts recall. Confy **drafts** a LinkedIn note and provides a **LinkedIn people-search link** (`linkedin.com/search/results/people/?keywords=<name company>`). **The user reviews the note and sends it manually.** There's no automated searching, connecting, or messaging, because LinkedIn's terms prohibit bots and its API doesn't allow it.
  - **Missed it? Share your LinkedIn QR instead.** When the user didn't catch the conversation in time, didn't get enough context, or simply prefers not to record, the Clip page shows a **QR code of their own LinkedIn profile** that the other person scans to connect. The URL comes from the persona's **opt-in** `linkedin_url` (returned by `GET /v1/me`); if there isn't one, the user can paste their profile URL, which is validated (https, linkedin.com) and kept **on this device only**. Error states for a clip that couldn't be saved or heard link straight to it. No recording, no upload, and no LinkedIn automation: the other person scans and connects themselves. For the demo, the web app defaults the QR to the presenter's own profile (`DEMO_SHARE_LINKEDIN_URL`, overridable with `NEXT_PUBLIC_SHARE_LINKEDIN_URL`, or `""` to turn it off); a URL pasted on the device takes priority.
  - **Knows who you are:** the worker gives the model the attendee's own name, role, and bio, so their self-introduction ("Alex Rivera, platform engineer") is never taken as the person met. If the model still returns the attendee, it asks once more; if it insists, no contact is saved.
  - **Highlight:** creates a `highlights` doc. **Experiment** asks the LLM for a small hands-on exercise (e.g. a kind/kubectl snippet to try). **Resources** runs a hybrid search over `talks` + `resources` for related talks and links, which is a fifth ES search use case.
- **Talk mode (replaces always-on listening):** Turn it on inside a talk to get **live captions** (Merge Forward) plus a "⭐ highlight this" button that saves the last 1 min. It's scoped to the speaker's talk, and nothing is saved until you click.
- **Out of scope by decision:** Continuous recording of everyone at the conference and automated LinkedIn outreach. Reasons: consent and privacy, rule 4, LinkedIn's terms, and Merge Forward's goals.
- **Demo-safety:** We use team members (or a pre-recorded synthetic dialogue) as the "conversation" and a fictional LinkedIn persona. No real third parties appear in the demo.

## 11. Demo script (1–2 min: tight, pre-staged, with a recorded backup)

| Time | Beat | Tracks |
|---|---|---|
| 0:00–0:20 | "beginner talks on multi-tenancy, nothing vendor-pitchy" gives a clash-free schedule. Toggle low-stim mode to add breaks and quiet rooms. One talk shows **"Likely full"**, with the matching Dash0 panel shown next to it | ES, Dash0, MF |
| 0:20–0:40 | "3 people who run K8s in prod on bare metal" returns matches with openers. Then **Clip**: Save 1 min of a staged chat, and it becomes a contact plus a drafted LinkedIn note | ES, MF |
| 0:40–0:55 | "the person I met at the eBPF talk who worked at a bank" returns the correct contact | ES |
| 0:55–1:40 | **Keynote spike**: load script plus `make break-worker`. Dash0 error spike, then Radar **Investigate** shows OOMKilled, then Agent0 suggests the fix, then the fix PR goes through Gitar | Radar, Dash0, Gitar |
| 1:40–2:00 | Gitar evidence: PR A caught a bug, PR B caught an a11y issue, and a CI failure was auto-fixed | Gitar |

Because the demo is only 1–2 minutes, **stage everything beforehand**: pre-seeded data, warm caches, the break already applied off-screen if needed, and Radar/Dash0 tabs already open.

## 12. Build plan (today, MT)

| Time | Milestone |
|---|---|
| 11:00–11:45 | Repo scaffold, Gitar installed, CI skeleton, k8s cluster up, Radar connected, ES reachable, **OTel and Dash0 sending first traces** |
| 11:45–1:00 | Seed data and ingest worker (embeddings into ES). Talks search, first hybrid query |
| 1:00–2:00 | Schedule solver, people matching, demand events and the warning (lunch at 1:00) |
| 2:00–2:30 | Kelsey panel (optional, buffer) |
| 2:30–4:00 | Contacts recall, low-stim mode, intros, a11y pass, RUM, dashboard and SLO |
| 4:00–4:45 | Chaos switch and full incident rehearsal (Radar, Agent0) |
| 4:45–5:15 | README (setup and AI disclosure), screenshots, demo rehearsal |
| **5:30** | **Submit** |

## 13. Open questions (holes to fill)

| # | Question | Decision |
|---|---|---|
| 1 | Team size, names, and who owns which track/service? | 2 people. Split ❓ OPEN (proposal in chat: A = web + Merge Forward + Gitar a11y, B = api/worker/ES + k8s/Dash0/Radar, contracts first) |
| 2 | Language/framework | ✅ Next.js (web) + Node (api, worker). api framework ❓ (Fastify recommended) |
| 3 | Kubernetes | ✅ Local cluster (kind recommended) |
| 4 | Elasticsearch | ✅ Elastic Cloud Serverless |
| 5 | Seed data | ✅ Synthetic (schedule, attendees, contacts) |
| 6 | Embeddings | ✅ OpenAI `text-embedding-3-small` |
| 7 | Auth | ✅ None. Demo persona switcher |
| 8 | Demand source | ✅ ES aggregation, with the same numbers emitted to a Dash0 dashboard |
| 9 | Queue | ✅ ES `jobs` index polled by the worker (claimed with optimistic concurrency; see CLAUDE.md §2) |
| 10 | Accounts and repo | ✅ All ready. Repo is public with Gitar installed |
| 11 | Name and demo | ✅ **Confy**, 1–2 min demo |
| 12 | Clip/Talk mode scope | ✅ Clip mode plus Talk mode with live captions. Drafted LinkedIn note and manual send. No always-on recording, no automated outreach |
| 13 | Priority if time runs short | ✅ Building all features. Fallback order if needed: (1) talks hybrid search + schedule, (2) OTel/Dash0 + k8s/Radar + chaos, (3) people matching, (4) contacts recall, (5) Clip mode, (6) demand warning, (7) low-stim + intros, (8) Talk-mode captions, (9) Experiment/Resources |
| 14 | Monorepo layout | ✅ Approved: `apps/web`, `apps/api`, `apps/worker`, `packages/shared` (ES client, OTel setup, types), `deploy/k8s`, `seed/`, `.gitar/`, `.github/workflows/` |
