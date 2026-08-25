# Factory Cursor Cloud Agents API v1 sole executor

**Status:** Implemented in-repo; **dormant**. Current live wake remains Factory Wake Proof v2.  
**Owner:** Anton (live-switch approval); Cursor (repo implementation).  
**Source:** GitHub issue [#1062](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1062). Control issue: [#1059](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1059).  
**Anchor:** `<!-- FACTORY_CURSOR_CLOUD_AGENTS_V1_SOLE_EXECUTOR -->`

<!-- FACTORY_CURSOR_CLOUD_AGENTS_V1_SOLE_EXECUTOR -->

## 1. Business outcome

Replace the proven-broken native Automation wake transport with one deterministic Cursor Cloud Agents API v1 execution transport, while keeping the existing GitHub / n8n control plane.

Target loop after the later approved live switch:

```text
AI controller → n8n/GitHub coordination → GitHub durable work record
  → CorpFlowAI Cursor Factory Handoff
  → Cursor Cloud Agents API v1
  → agent/run ID
  → GitHub IN_PROGRESS lifecycle
  → poll known agent IDs
  → branch/PR/blocker/completion
  → GitHub terminal state
  → capacity release
  → n8n/readback
```

This document does **not** authorize the live switch. Merging this implementation leaves Wake Proof v2 running.

## 2. Root cause confirmed

Issue #1059 proved native `CorpFlowAI Factory Wake Proof v2` cannot provide production correlation:

- Automation workers start with `githubIssueId: null`.
- The Automation does not bind `source_issue`, `handoff_run_id`, or `work_request_id`.
- Handoff HTTP success proves webhook acceptance, not Cursor pickup.
- Accessible Automation API exposes metadata only.

Exact missing boundary on #1059:

```text
MISSING TRANSPORT BOUNDARY — Cursor Automation -> GitHub lifecycle evidence
```

Do not attempt to repair that Automation wake again.

Cloud Agents API v1 **can** satisfy the identity requirement: `POST /v1/agents` returns a durable `agent.id` (`bc-…`) and initial `run.id` (`run-…`). Correlation is carried in the prompt envelope and persisted to the source GitHub issue after a validated create.

## 3. Reused components

| Existing piece | Role |
|----------------|------|
| `CorpFlowAI Cursor Factory Handoff` | Sole selection / WIP / protected-gate path |
| `lib/server/cursor-cloud-agent-client.js` | Cloud Agents API v1 client (`POST /v1/agents`, `GET /v1/agents/{id}`) |
| `lib/server/cursor-activation-claim.js` | Claim-before-API |
| `lib/server/cursor-ops-status.js` | Redaction + GitHub comments |
| `lib/server/factory-cursor-handoff-receipt.js` | #1061 receipt states |
| `lib/server/ai-work-request-lifecycle.js` | #1060 `work_request_id` contract |
| `lib/server/cursor-origin-metadata.js` | Pickup evidence |
| `lib/server/cursor-agent-lifecycle.js` | Known-id poller |
| `lib/server/cursor-wip-control.js` | Cap 2; review-ready = zero execution WIP |
| `factory-dispatcher-activate.yml` | Stays **LEGACY / DIAGNOSTIC**. Not a second production executor. |

New adapter: `lib/server/factory-cursor-cloud-agents-executor.js`.

## 4. Current vs intended executor

| Mode | When | Live wake |
|------|------|-----------|
| `wake_proof_v2` | **Default now** | Factory Wake Proof v2 webhook |
| `cloud_agents_v1` | Only when GitHub Actions variable `FACTORY_CURSOR_EXECUTOR=cloud_agents_v1` | Cloud Agents API v1 |
| `dry_run` | Local/CI `--dry-run` | Neither. No credential required. |

Both live paths must never be on together.

## 5. Cloud Agents v1 request/response contract (redacted)

Create: `POST https://api.cursor.com/v1/agents`

Request (shape only; no secrets):

```json
{
  "prompt": { "text": "<!-- corpflow.factory_cloud_agent_envelope.v1 {...} --> ..." },
  "repos": [{ "url": "https://github.com/antonvdberg-bit/corpflow-ai-command-center", "startingRef": "main" }],
  "autoCreatePR": true,
  "name": "factory-issue:NNNN"
}
```

Envelope fields: `source_issue`, `work_request_id`, `handoff_run_id`, `repository`, `requested_outcome`, `protected_action_required`, `protected_action_constraints`.

Documented success response:

```json
{
  "agent": { "id": "bc-…", "url": "https://cursor.com/agents/bc-…", "latestRunId": "run-…" },
  "run": { "id": "run-…", "agentId": "bc-…", "status": "CREATING" }
}
```

No `bc-…` identity → `NOT_RECEIVED` / `BLOCKED`. Never `IN_PROGRESS`.

Auth: existing GitHub Actions secret **name** `CURSOR_API_KEY` (Bearer). Values are never logged.

## 6. Strict state semantics

| Evidence | State |
|----------|-------|
| Handoff selection alone | not execution (`REQUESTED` / receipt `PENDING`) |
| API attempted, no valid agent identity | `NOT_RECEIVED` or `BLOCKED` |
| Valid `bc-…` identity returned | `IN_PROGRESS` |
| Cursor terminal blocker/refusal | `BLOCKED` or `SUPPRESSED` |
| Bounded assignment complete / review-ready PR | `COMPLETED` |

`COMPLETED` does **not** mean merged, deployed, sent, or `client_production` live.

Review-ready PRs consume **zero** execution WIP.

## 7. Polling

`cursor-agent-lifecycle-status.yml` already polls claimed issues. The #1062 adapter will only poll agent IDs present on the source issue via origin metadata, activation claim, lifecycle state, or AI work-status markers.

Do **not** scan generic Automation workers.

## 8. Cost / entitlement finding

- Cloud Agents API v1 is public beta on the existing Cursor API-key surface.
- This repository already uses secret **name** `CURSOR_API_KEY` for the lifecycle poller and the legacy diagnostic activator.
- A diagnostic live create already succeeded on 2026-07-06 (internal smoke; no secret values recorded).
- **No incremental paid product purchase is required to merge this implementation.**
- Live usage after the later switch is metered against the existing Cursor plan.
- If a later live create returns 401/402/403 with entitlement / billing / upgrade language, that is the **single exact paid-entitlement blocker**. No purchase or plan upgrade is authorized by #1062.

## 9. Exact live-switch packet

Do **not** perform these steps in #1062. Anton performs them only when explicitly authorizing this exact live cutover.

1. **Credential.** Confirm GitHub Actions secret **name** `CURSOR_API_KEY` is present for this repository using the existing GitHub secret-management UI. Do not rotate, print, or commit the value. Reuse the existing secret; do not invent a new env name.
2. **Feature flag.** Set GitHub Actions **variable** (not a secret) `FACTORY_CURSOR_EXECUTOR` to exactly `cloud_agents_v1`.
3. **Disable Wake Proof as production wake.** The Handoff workflow skips the Factory Wake Proof v2 webhook whenever that variable equals `cloud_agents_v1`. After one successful correlated create, disable or pause Automation `CorpFlowAI Factory Wake Proof v2` (`30c07c9d-96f7-11f1-ba66-0e7d0216e441`) in the Cursor dashboard so it cannot compete. Do not delete it until rollback is no longer needed.
4. **Enable Cloud Agents v1 as the sole executor.** With the variable set, Handoff claim-before-API creates one Cloud Agent, persists `bc-…` / `run-…`, and only then emits `IN_PROGRESS`.
5. **Low-risk synthetic proof before the first real client issue.** On `main`, run:
   ```bash
   node scripts/factory-cursor-cloud-agents-execute.mjs --dry-run
   ```
   with `SOURCE_ISSUE` set to a disposable factory issue. Expected: `status=REQUESTED`, `cursor_agent_id=null`, no live API call. Then, only after Anton authorizes the live switch, dispatch Handoff against one synthetic factory issue and confirm the source issue shows `cursor_agent_id=bc-…` and `status: IN_PROGRESS`.
6. **Governance follow-up.** A separate `governance-change` PR may then update `docs/operations/CORPFLOWAI_CURRENT_DELIVERY_REALITY.md` so the operating-model snapshot matches the live executor. That rewrite is **not** this PR.

Protected actions still required at live-switch time: installing/changing the secret value if it is missing; disabling the live Automation; setting the production variable. #1062 does not perform them.

## 10. Exact rollback packet

Restore the prior safe state without exposing secrets:

1. Clear or change GitHub Actions variable `FACTORY_CURSOR_EXECUTOR` so it is **not** `cloud_agents_v1` (empty restores Wake Proof).
2. Confirm Factory Handoff again POSTs the existing Wake Proof webhook (secret **names** `CURSOR_FACTORY_WAKE_WEBHOOK_URL` and `CURSOR_FACTORY_WAKE_AUTH_HEADER` unchanged).
3. Re-enable Automation `CorpFlowAI Factory Wake Proof v2` if it was paused.
4. Do **not** delete `CURSOR_API_KEY`; the lifecycle poller still needs the secret **name**.
5. Leave in-repo Cloud Agents adapter in place; dormant code is not a second live executor.

## 11. Explicit non-actions for this implementation PR

- No live Cursor credential create/install/change
- No setting `FACTORY_CURSOR_EXECUTOR=cloud_agents_v1`
- No disabling Wake Proof v2
- No merge, deploy, DB/schema, payment/upgrade, external send, DNS
- No second dispatcher, database, or control plane

## 12. Related

- `docs/operations/AI_WORK_REQUEST_LIFECYCLE_V1.md`
- `docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md`
- `docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md` (legacy diagnostic API path)
- `docs/operations/CORPFLOWAI_CURRENT_DELIVERY_REALITY.md` (protected; update only at live switch)
