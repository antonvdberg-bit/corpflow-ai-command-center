# OpenHands operating runbook (day-to-day — Phase 1 target)

**Status:** DRAFT — describes day-to-day operation **after** a future, separately authorized install. As of
2026-08-04, OpenHands is not installed anywhere; nothing in this doc is a live procedure yet.
**Controlling issue:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743)

**Companion docs:**

- `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` — the dedicated-rootless-Docker-daemon design (2026-08-04, #747
  follow-up to #743) that every `docker`/`docker compose` command below runs against — never the box's primary
  daemon.
- `docs/operations/OPENHANDS_OPERATING_CHARTER.md` — the permanent operating model (work routing, protected actions).
- `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` — how the system got to a running state.
- `docs/operations/OPENHANDS_SECURITY_MODEL.md` — the boundary this runbook must not weaken during routine use.
- `docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md` — cost gates referenced in § 5.
- `docs/execution/OPENHANDS_WORK_PACKET_TEMPLATE.md` — the packet shape referenced in § 2.
- `docs/operations/MONITORING_ARCHITECTURE.md` § 9 — the add-a-monitor recipe this runbook's future alert path would follow.

---

## 1. Start / stop via tunnel

**Starting a session (operator UI access):**

```bash
ssh -L 3000:127.0.0.1:3000 anton@<EXEC01_SSH_HOST>
# then open http://127.0.0.1:3000 in a local browser
```

The container itself is `restart: unless-stopped` — it does **not** need Anton's laptop open to keep running or
to keep processing an already-dispatched task. The SSH tunnel is only needed when Anton wants to **look at** the
UI (review a running task, check conversation history, or triage before escalating to Cursor).

**Stopping (routine, e.g. before a maintenance window):**

```bash
export DOCKER_HOST="unix://$HOME/corpflowai-openhands/docker/docker.sock"
cd "$HOME/corpflowai-openhands"
docker compose -p corpflowai-openhands stop
```

**Restarting:**

```bash
export DOCKER_HOST="unix://$HOME/corpflowai-openhands/docker/docker.sock"
docker compose -p corpflowai-openhands up -d
```

Both actions touch **only** `corpflowai-openhands*` resources (enforced by the allowlist in
`scripts/ops/openhands/lib/common.sh`) on the **dedicated** Docker daemon — Uptime Kuma, ERPNext, restic, and
any other box workload live on the box's separate primary daemon and are unaffected, per
`docs/operations/OPENHANDS_DOCKER_ISOLATION.md`.

## 2. Packet intake

- Work packets originate as **GitHub issues** scoped per the Charter's work-packet contract (packet ID, parent
  issue, allowed files, acceptance tests, max attempts, model tier, spend ceiling, protected gates, escalation
  condition, branch convention, expected PR boundary) — see
  `docs/execution/OPENHANDS_WORK_PACKET_TEMPLATE.md` for the human-readable shape.
- OpenHands is dispatched a packet only when:
  1. it fits the Charter's "OpenHands should normally own" list (docs, inventory, health checks, dependency
     review, deterministic test repair, synthetic fixtures, evidence packets, low-risk bounded changes, draft
     PRs, review-feedback repair), **and**
  2. no active Cursor or Codex claim exists on the same packet, branch, or overlapping files (collision check
     per the Charter's "Collision prevention" section), **and**
  3. the concurrency ceiling (§ 3) has a free slot.
- A packet is not "active" until it has a real run ID and a real branch — comments/labels alone are not
  activation, per the Charter's work-packet contract.

## 3. Concurrency: 1

**v1 hard rule: at most one task sandbox runs at a time.** This is deliberate, not a resource accident:

- It bounds the Docker-socket blast radius (`docs/operations/OPENHANDS_SECURITY_MODEL.md` § 3 and § 6) to one
  live sandbox instead of an unbounded pool.
- It keeps cost and evidence review tractable while the pattern is unproven (fewer than 3 successful synthetic
  packets — see `docs/execution/OPENHANDS_SYNTHETIC_VALIDATION_PLAN.md`).
- It matches the resource envelope in `docs/operations/OPENHANDS_ARCHITECTURE.md` § 5 (~4 GiB total ceiling),
  now systemd-enforced as a **total** ceiling by `corpflowai-openhands.slice` (`MemoryMax=4G`, `CPUQuota=200%`)
  per `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` § 2, and app-enforced via `MAX_CONCURRENT_CONVERSATIONS=1`.
- It bounds the impact of the **disclosed, unsolved** per-sandbox resource-limit gap (no native 4 GiB
  `HostConfig` cap in the OSS `1.8` Docker path — `OPENHANDS_DOCKER_ISOLATION.md` § 2.2): with concurrency at 1,
  at most one sandbox can consume up to the whole slice ceiling at a time, not several simultaneously.

Do not raise this ceiling without a fresh review of § 6 (sandbox resource limits are operator policy, not
upstream-enforced) and an explicit Anton approval — this is a Phase 4/5 "controlled expansion" decision per
`docs/operations/OPENHANDS_IMPLEMENTATION_AND_OPERATIONS_RUNBOOK.md`, not a routine operating change.

## 4. Escalation to Cursor

Per the Charter's "Cursor should normally own" list and lifecycle recovery states:

```
READY -> RESERVED -> RUNNING -> BRANCH_ACTIVE -> PR_OPEN -> CI_OR_REVIEW -> REPAIR -> REVIEW_READY -> DISPOSITIONED -> COMPLETE
STALE -> ONE_FOLLOW_UP -> REQUEUED_OR_ESCALATED
```

**Escalate to Cursor when:**

- OpenHands has failed the same packet **twice**,
- the packet turns out to touch auth/cross-tenant logic, complex state/concurrency, a large refactor, or a
  production-critical path (Cursor-first list),
- OpenHands' own failure output suggests it needs specialist reasoning rather than another retry,
- risk warrants escalation earlier than two failures (operator or ChatGPT-orchestrator judgment call).

**Escalation packet must contain** (per the Charter):

- objective, attempts, commands and tests run, errors, changed files, branch/commit evidence, model and
  approximate cost, recommended specialist next step.

Escalation is a **handoff**, not a duplication — the same packet ID continues; OpenHands stops claiming it once
escalated (collision-prevention rule).

## 5. Monitoring — silent success / exception-only (future Telegram)

- **v1 posture: no alert on success.** A completed, healthy synthetic or production packet does not page
  anyone — consistent with every other "quiet success" monitor in `docs/operations/MONITORING_ARCHITECTURE.md` § 4.
- **Exception-only alerting is a future item, not wired in Phase 1.** `ops/openhands/.env.example` ships
  `OPENHANDS_ALERTS_ENABLED=0` by default. When it is later reviewed and enabled:
  - it must use a **dedicated** Telegram bot token, never the in-repo `TELEGRAM_BOT_TOKEN` (same
    failure-domain-isolation rule Uptime Kuma follows, per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5),
  - it must alert only on: container health-check failure, cost ceiling breach (§ 5 of the cost policy doc),
    boundary-check failure (private-bind / sandbox-boundary / no-production-access scripts failing), or a
    STALE task with no automatic follow-up,
  - it must **not** alert on routine successful packet completion (that would defeat the "silent success" design
    and train Anton to ignore the channel).
- Until that future work lands, the only monitoring is `scripts/ops/openhands/health-check.sh` run manually or
  via a future systemd timer (`scripts/ops/systemd/corpflowai-openhands-health.{service,timer}` — present in the
  package's planned file map, **not enabled** at Phase 1) and Anton's own SSH-tunnel spot checks.
- This package does **not** get a row in `MONITORING_ARCHITECTURE.md` § 2 (the active-monitor table) until it is
  actually installed and probing something — see `docs/operations/MONITORING_ARCHITECTURE.md` § 11.2 for the
  pending future-packet row this Phase 1 documentation set adds instead.

## 6. Backup treatment: state vs disposable sandboxes

| Data class | Volume/location | Backup treatment |
|---|---|---|
| **Control-plane state** (`corpflowai-openhands-state` — conversation history, config cache) | Named Docker volume | Treat like any other box-local operator state: covered by the existing restic → R2 backup jobs (`docs/operations/SELF_HOSTED_OPS_R2_RESTIC.md`) **once** those jobs are extended to include this volume — not automatic just because the container exists. Until then, state loss on this volume means losing conversation/history continuity, not losing any CorpFlowAI production data (none is stored here). |
| **Task workspace** (`corpflowai-openhands-workspace`) | Named Docker volume | **Explicitly disposable.** This is a working tree for in-flight tasks, mirrored from GitHub branches. It must never be treated as a system of record — the branch/commit/PR in GitHub **is** the record. Losing this volume loses, at most, an in-progress (not-yet-committed) edit, which is recoverable by re-running the packet. |
| **Sandbox containers** | Ephemeral, per-task | Disposable by design (§ 6 of the security model). Never backed up; never expected to survive past task completion. |
| **GitHub state** (branches, commits, PRs) | GitHub | Already covered by GitHub's own durability — this is the actual source of truth per the Charter, not the box. |

**Operating rule:** if the control-plane state volume is ever lost (disk failure, accidental `docker volume rm`,
box rebuild), the correct response is to re-install per `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` and accept
loss of conversation history — **not** to treat it as a data-loss incident requiring restoration from a backup
that may not exist yet. If the workspace volume is lost mid-task, the correct response is to re-dispatch the
packet from its last committed branch state, not to attempt manual recovery of uncommitted sandbox files.

## 7. Change log

- **2026-08-04** — Initial operating runbook authored alongside the Phase 1 documentation set for #743. No
  installation exists yet; this doc describes the target day-to-day procedure only.
- **2026-08-04 (PR #747, Docker isolation follow-up)** — § 1 commands now export `DOCKER_HOST` at the dedicated
  socket path; § 3 notes the systemd-slice ceiling and app-enforced `MAX_CONCURRENT_CONVERSATIONS=1`. See
  `docs/operations/OPENHANDS_DOCKER_ISOLATION.md`. No installation exists yet.
