# Cloud Agents v1 live cutover proof — #1066

**Status:** `LIVE CUTOVER BLOCKED — Wake Proof v2 still executed; cloud_agents_v1 create step skipped`  
**Issue:** [#1066](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1066)  
**Parent:** [#1062](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1062)  
**As of:** 2026-08-25  
**Anchor:** `<!-- FACTORY_CLOUD_AGENTS_V1_LIVE_CUTOVER_PROOF_1066 -->`

<!-- FACTORY_CLOUD_AGENTS_V1_LIVE_CUTOVER_PROOF_1066 -->

Canonical Context Preflight: PASS  
Operating model version: 2026-08-13-v1  
Environment: n/a  
GitHub state refreshed: YES  
Source item: #1066

This is the single authorized synthetic proof that `cloud_agents_v1` is the sole Factory executor. It does **not** change application code, secrets, GitHub variables, database/schema, deployment, DNS, payments, or messaging.

The success marker from #1066 is **not** claimed:

`LIVE CUTOVER PASS — cloud_agents_v1 is sole executor`

---

## Outcome (plain language)

The Factory adapter for Cloud Agents API v1 **is already on `main`**. The live switch **did not take effect** on the authorized proof run.

When GitHub handed this issue to Cursor, it still used the old **Factory Wake Proof v2** webhook. It **did not** create a correlated Cloud Agent. So CorpFlowAI is still executing through Cursor Automation, not through Cloud Agents API v1 as the sole executor.

Exact remaining operator action (protected GitHub Actions variable change; not done by this packet):

1. Confirm repository variable `CURSOR_FACTORY_EXECUTOR` is exactly `cloud_agents_v1` (not blank, not `wake_proof_v2`).
2. Do **not** retry this issue and do **not** open a second synthetic proof unless Anton authorizes a new one. #1066 forbids a retry loop.

---

## Required proof vs observed

| Required by #1066 | Observed on this wake |
|---|---|
| Handoff selects #1066 | **PASS** — Actions run [32808930062](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32808930062) selected #1066 |
| Skip Factory Wake Proof v2 | **FAIL** — step `Wake Cursor Factory v2 webhook` = **success** |
| Invoke only Cloud Agents API v1 | **FAIL** — step `Create correlated Cursor Cloud Agent v1` = **skipped** |
| Fresh correlated `bc-*` **and** `run-*` | **FAIL** — no `corpflow.factory_cloud_agents_executor.v1` comment; no `run-*` identity |
| `IN_PROGRESS` only after both identities validate | **FAIL** — Wake Proof receipt posted with Cursor agent/run = `n/a` |
| Poll that exact correlated run | **FAIL** — no Cloud Agents run to poll |
| One bounded terminal state or PR evidence | **PASS for this verification packet** — this docs PR is the completion note |
| Release execution WIP | Happens when this run terminates |
| Leave next eligible valuable work available | Unchanged; #1066 is not a valuable product packet |

Stop conditions that fired:

- no `run-*` run ID returned
- Wake Proof v2 executed

Stop conditions that did **not** fire:

- no secret values in this evidence
- no new paid entitlement requested
- a second executor was **not** activated in parallel (Cloud Agents v1 was skipped, not dual-run)

---

## Live identities for this verification run

These identify the **Wake Proof Automation worker** that performed the read-only check. They are **not** a Cloud Agents API v1 create receipt.

| Field | Value |
|---|---|
| Cursor agent ID | `bc-8f1e415d-2c8f-49fd-820c-e10919ee2229` |
| Cursor agent URL | https://cursor.com/agents/bc-8f1e415d-2c8f-49fd-820c-e10919ee2229 |
| Cursor run ID (`run-*`) | **absent** |
| Agent source | `automations` |
| Automation ID | `30c07c9d-96f7-11f1-ba66-0e7d0216e441` |
| Factory Handoff run | `32808930062` |
| Webhook schema that woke this worker | `corpflow.factory_cursor_webhook.v1` |
| `origin/main` SHA verified | `99ec40dc10d2a1e0fc2b59e8a4df43cf79391d29` (`#1065`) |

Issue #1066 comments at wake time contained `corpflow.factory_cursor_handoff.v1` and `corpflow.factory_cursor_handoff_receipt.v1` only. They did **not** contain `corpflow.factory_cloud_agents_executor.v1`.

---

## Merged repository state (read-only)

Verified on `origin/main` `99ec40dc` (merged PR #1065):

- `.github/workflows/factory-cursor-handoff.yml` still has mutually exclusive steps:
  - Wake Proof webhook when `CURSOR_FACTORY_EXECUTOR` is blank or `wake_proof_v2`
  - Cloud Agents create when `CURSOR_FACTORY_EXECUTOR == 'cloud_agents_v1'`
- `scripts/factory-cloud-agents-executor.mjs` and `lib/server/factory-cloud-agents-executor.js` are present
- A valid create response still requires both `bc-*` and `run-*` before `IN_PROGRESS`

This worker cannot read GitHub Actions variables (`gh variable list` returned HTTP 403). Runtime step selection is the proof: if the variable had been `cloud_agents_v1`, the Cloud Agents step would have run and the webhook step would have been skipped.

---

## What this packet does not do

- Does not set or change `CURSOR_FACTORY_EXECUTOR`
- Does not change `CURSOR_API_KEY` or any other secret
- Does not disable Factory Wake Proof v2
- Does not merge, deploy, mutate schema/data, send messages, or take payment
- Does not create a second synthetic proof issue

---

## Next owner

Anton — exact GitHub Actions variable confirmation / set of `CURSOR_FACTORY_EXECUTOR=cloud_agents_v1`, then a separately authorized new proof if still required.
