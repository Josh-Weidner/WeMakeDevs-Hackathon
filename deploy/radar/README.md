# Radar runbook and evidence (track: AI SRE)

The checklist and its status live in [SPEC.md §8a](../../SPEC.md). This file has the commands, and a log of
every time we used Radar, which is the evidence for the demo story: deploy timeline, investigations, and
Checks before and after.

## Setup

| What | Where |
|---|---|
| Cluster | `sweet-blossom` (id `e3rjKKveIz0`), OrbStack Kubernetes, Radar agent 1.20.2 in namespace `radar` (installed by the Argo CD app `radar`) |
| Agent ↔ Radar | `claude mcp add radar-cloud --scope user --transport http https://api.radarhq.io/mcp` |
| Deploys | Argo CD Application `confy` ([deploy/argocd/confy.yaml](../argocd/confy.yaml)) syncs `deploy/k8s/base` from `main` |

## Release loop (every merge to main)

Argo CD syncs manifests on its own, but it can't build images, so after each merge that changes app code:

```
git switch main && git pull
make release        # builds confy-{api,worker,web}:<main sha>, points Argo CD at them, waits for rollout
```

Then have the agent confirm through Radar, not just kubectl:
- `wait_for kind=deployment all=true namespace=confy`: rollouts done
- `issues namespace=confy`: nothing broken
- After a meaningful release, start an **Investigate** on the app even if it looks healthy. An all-clear with evidence counts (checklist 4.2).

## Incident loop (demo)

1. `make break-worker`: patches only the live worker (memory 48Mi + `Recreate`), so all worker pods are OOMKilled
   and the job backlog grows. Argo CD shows **OutOfSync** and does not revert it (selfHeal is off).
2. Radar: the `issues` row (critical `oom_killed`), then **Investigate** on `Deployment confy/worker`.
3. Ship the fix as a PR, which Gitar reviews. Merging to `main` makes Argo CD sync git's state back, and the worker recovers.
   Fallback if there's no time for a PR: `make fix-worker` (an Argo CD sync).

## Checks: before and after

Before (Radar MCP `get_cluster_audit`, 2026-11-09 13:50 MT, before the Checks fixes): **`confy` 10 medium**
(cluster total 68, mostly Argo CD and Radar's own pods, which we don't own).

| Check | Resources | Fix |
|---|---|---|
| automountServiceAccountToken (Security) | api, web, worker | `automountServiceAccountToken: false`: no app calls the Kubernetes API |
| singleReplica | worker | `replicas: 2`: job claims use `if_seq_no`/`if_primary_term`, so two workers never process the same job |
| missingPDB | api, web | `pdb.yaml`, `minAvailable: 1` (worker too, now that it has 2 replicas) |
| missingTopologySpread | api, web | `topologySpreadConstraints` on hostname, `ScheduleAnyway` |
| podHARisk | api, web | **Expected to remain**: the cluster has one node (`orbstack`), so the replicas can't be spread |

After: _run `get_cluster_audit namespace=confy` (and screenshot Checks) once the Checks PR is released._

## Evidence log

| Time (MT) | What | Evidence |
|---|---|---|
| 12:48 | Agent connected; `list_clusters` → `sweet-blossom` connected | Claude Code session |
| 12:55 | Argo CD app `confy` created; Radar shows the deployments as `managedBy: Application argocd/confy` | PR #5 |
| 13:04 | Rehearsal: `make break-worker`. Radar `issues`: critical `oom_killed` on `confy/worker`, correlated change limits.memory 384Mi → 48Mi | [PR #5 comment](https://github.com/Josh-Weidner/WeMakeDevs-Hackathon/pull/5#issuecomment-6750146672) |
| 13:15–13:17 | Radar AI Investigation `chat_YZtzpMMTIX1d76Rd`: suspected memory cut; recommended rolling back and restoring the memory. Verified with kubectl: `OOMKilled`/137, and both pods run the same image, so the only difference is the memory limit | [investigation](https://app.radarhq.io/c/e3rjKKveIz0/investigations/chat_YZtzpMMTIX1d76Rd?org=org_3Ergp3D_7Q1a) (share with the org) |
| 13:15 | Fix shipped: PR #6 merged to `main` → Argo CD sync → worker healthy | Argo CD history, Radar timeline |
| 13:50 | Checks "before" captured via MCP (table above) | this file |
