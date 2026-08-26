# Commercial Lane watch — Agent Relay evidence loop v1

**Status:** Implemented in repo (#1111). Live controller use is the existing factory control-plane caller; this is not a client_production release.  
**Environment:** `corpflow_test`  
**Owner:** Cursor (implementation); Commercial Lane watch remains the orchestration owner.  
**Parents:** #1093 Agent Relay Phase 2, #710 commercial controller, #1083 delivery-control repair.  
**Anchor:** `<!-- COMMERCIAL_LANE_WATCH_V1 -->`

<!-- COMMERCIAL_LANE_WATCH_V1 -->

## 1. Purpose

Give the Commercial Lane controller one Relay-backed GitHub evidence snapshot so ChatGPT/controller status no longer depends on agent self-report or Anton copy/paste.

Agent Relay stays transport / policy / evidence. Commercial Lane watch stays the orchestration owner. Factory Handoff, Queue Reconcile, GitHub Actions native checks, Operator Bridge, n8n, `/change`, and Postgres business records are **not** replaced.

## 2. Integration point

There was no separate Commercial Lane watcher workflow. The safe existing caller is the same control-plane boundary already proven for Relay Phase 2:

- authenticated **admin session**, or
- existing trusted **`CORPFLOW_CRON_SECRET` / `CRON_SECRET` Bearer**

Route: `POST /api/factory/commercial-lane/watch`  
Library: `lib/server/commercial-lane-watch.js`  
Contract: `corpflow.commercial_lane_watch.v1`

No new secret, env, App permission, PAT, cookie, or public unauthenticated route.

## 3. Before / after controller flow

**Before**

1. ChatGPT/controller inspects GitHub separately, or Cursor reports completion in chat.
2. Anton may copy issue/PR/check evidence between Cursor, ChatGPT, and GitHub.
3. Broad/direct GitHub reads (issue + comments + PR + checks + workflows) sit at the controller boundary.
4. Agent-reported `COMPLETED` can look terminal while the PR is still draft or checks are red.
5. Re-asking “is it done?” can look like a reason to activate again.

**After**

1. Controller posts the source issue (and optional PR) to the existing authenticated factory route.
2. Watch requests only named Relay reads: `issue.get_metadata`, `issue.list_comments`, and when a PR exists `pull_request.get_metadata`, `pull_request.get_head`, `pull_request.list_check_runs`, `pull_request.list_workflow_runs`.
3. Relay authenticates via its existing App identity and returns projected non-secret evidence.
4. Watch classifies `NO_MOVEMENT | ACTIVE | REVIEW_READY | BLOCKED | PROTECTED_GATE | TERMINAL` and returns `advance | hold | block | escalate`.
5. Agent-reported completion that conflicts with Relay/GitHub evidence fails closed.
6. Reprocessing the same fingerprint never dispatches and never writes status.

Elapsed controller-awareness path is structural, not a fabricated wall-clock: source issue metadata → comments → PR metadata → SHA-bound head/checks/workflows → classification in one in-process watch call. No Anton courier step is required for that transition.

## 4. Controller decisions (orchestration stays here)

| Classification | Decision | Next permitted action |
|---|---|---|
| Unclaimed + eligible (`NO_MOVEMENT`) | `advance` | Existing **CorpFlowAI Cursor Factory Handoff** owns activation. This watch does not wake Cursor. |
| `ACTIVE` | `hold` | No duplicate activation or polling loop. |
| `REVIEW_READY` | `advance` | Release execution WIP; surface only the real merge/review gate. |
| `BLOCKED` | `block` | Record one exact blocker. |
| `PROTECTED_GATE` | `escalate` | Anton only for that exact protected consequence. No protected action is performed. |
| `TERMINAL` | `hold` | Do not reselect as new execution work. |

Remembered state and agent self-report cannot override Relay/GitHub evidence.

## 5. Why the bounded comment marker was skipped

The read-only snapshot is the machine-to-machine handoff. GitHub already stores durable claim, origin, lifecycle, and work-status comments. A second `issue.add_comment` marker would be another ledger, not simpler controller awareness.

Therefore this packet does **not** call `issue.add_comment`. Replay of the same watch input returns the same fingerprint and creates no GitHub comment. Slice 3 already proved Relay comment idempotency and `corpflowai-agent-relay[bot]` / `corpflowai-agent-relay` provenance on #1093; this watch does not repeat that write.

## 6. Explicit non-adoption

Do **not** route these through Relay:

- `factory-queue-reconcile.yml` GitHub-native queue reads
- `factory-cursor-handoff.yml` GitHub-native selection/dispatch evidence
- GitHub Actions current-head checks available natively inside Actions
- Postgres business records
- `/change`
- n8n exception-only supervisor
- Operator Bridge / Decision Inbox

Rare & Exclusive issue **#35** is not mutated. `JAN_APPROVAL_MODE` remains synthetic/disabled.

## 7. Verification

```bash
node --test node-tests/commercial-lane-watch.test.mjs
node --test node-tests/agent-relay-work.test.mjs
```
