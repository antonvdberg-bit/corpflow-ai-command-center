# Cursor Cloud Agents API v1 cutover — #1062

**Status:** `LIVE CUTOVER PASS — cloud_agents_v1 is sole executor` on authorized proof
[#1068](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1068)
(2026-08-25). Evidence:
`docs/operations/FACTORY_CLOUD_AGENTS_V1_LIVE_CUTOVER_PROOF_1068.md`.
This repository packet still does not change secrets, GitHub variables, Automation,
deployment, or live executor settings.

## Boundary contract

| Boundary | Producer → consumer | Correlation / acknowledgement | Failure / retry |
|---|---|---|---|
| Selection | Factory Handoff → Cloud executor | `source_issue`, Actions `handoff_run_id` | No selected issue: no executor call |
| Durable request | GitHub issue → executor | Existing `work_request_id`, or a redacted stable request marker created on the same issue | Request creation failure stops before API |
| Create | executor → Cursor API `POST /v1/agents` | Bounded prompt contains issue, request, handoff, repo, outcome, and protected constraints | HTTP/API error is `BLOCKED`; no `IN_PROGRESS` |
| Receipt | Cursor API → GitHub issue | Valid `bc-*` agent ID and optional run ID | Missing/invalid identity is `BLOCKED` |
| Poll | lifecycle poller → Cursor API `GET /v1/agents/{agentId}/runs/{runId}` | Only persisted correlated agent/run pairs are eligible | API failure maps to existing terminal lifecycle handling |
| Terminal | lifecycle → GitHub / Queue Reconcile | branch, PR, completion or blocker evidence | Terminal transition removes execution WIP; capacity wakes Handoff |

Redacted create request shape:

```json
{
  "prompt": { "text": "Source issue: #1062\nWork request ID: cfai-wr-…\nHandoff run ID: 32800850448\nRepository: owner/repo\n…protected constraints…" },
  "repos": [{ "url": "https://github.com/owner/repo", "startingRef": "main" }],
  "autoCreatePR": true,
  "name": "factory-handoff-issue:1062"
}
```

Expected minimum response shape:

```json
{
  "agent": { "id": "bc-…", "url": "https://cursor.com/agents/bc-…" },
  "run": { "id": "run-…" }
}
```

Both `bc-*` and `run-*` are mandatory, and `run.agentId` must match the returned agent.
A HTTP-success response without that pair is a create failure, never `IN_PROGRESS`. Agent
metadata is not execution state; polling is always run-scoped.

## Live-switch packet

1. Confirm the existing Cursor entitlement allows the documented Cloud Agents API v1 endpoint
   with the intended repository. Do not buy or upgrade from this packet.
2. Install an existing authorized API credential as GitHub Actions secret `CURSOR_API_KEY`.
   Never put its value in a variable, workflow log, issue, PR, or repository file.
3. Set repository Actions variable `CURSOR_FACTORY_EXECUTOR=cloud_agents_v1`. This is the sole
   switch: the Handoff workflow then skips the Wake Proof webhook and runs
   `scripts/factory-cloud-agents-executor.mjs`.
4. Verify `CURSOR_FACTORY_WAKE_WEBHOOK_URL` and its auth are no longer invoked by an eligible
   Handoff. Do not delete them until rollback evidence is complete.
5. Create one explicitly low-risk synthetic `dispatch:cursor-ready` issue. Confirm one source
   issue comment contains `corpflow.factory_cloud_agents_executor.v1` with source issue,
   work request, handoff run, concrete `bc-*` ID, and `IN_PROGRESS`.
6. Run the lifecycle poller. Confirm it polls that exact `bc-*` ID, records terminal/PR evidence,
   removes active execution labels for review-ready PRs, and Queue Reconcile can select the next
   eligible item.
7. Stop immediately if the API rejects/does not return `bc-*`, a second executor starts, the
   issue becomes `IN_PROGRESS` without an ID, or a secret appears in evidence.

## Rollback

1. Do not retry or run both transports.
2. Set `CURSOR_FACTORY_EXECUTOR=wake_proof_v2`.
3. Verify the next eligible Handoff invokes only the Wake Proof webhook and does not run the
   Cloud Agents create step.
4. Preserve the failed issue's `BLOCKED` / claim-release evidence; do not erase it or label-cycle
   it automatically.
5. Remove/rotate the Cloud Agents credential only through a separately authorized secret change
   if compromise is suspected.

## Entitlement gate

The repository can validate API behavior only with a credential. Entitlement is **not provable
from repository state**. Before live cutover, the credential owner must verify the current Cursor
plan/account exposes `POST /v1/agents` without an upgrade. If it does not, the outcome is:

`PAID GATE — Cloud Agents API v1 is unavailable under the existing plan; record Cursor's exact
upgrade/cost/limitation before any purchase.`
