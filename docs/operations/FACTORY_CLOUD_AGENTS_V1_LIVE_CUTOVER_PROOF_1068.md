# Cloud Agents v1 live cutover proof — #1068

**Status:** `LIVE CUTOVER PASS — cloud_agents_v1 is sole executor`  
**Issue:** [#1068](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1068)  
**Parent:** [#1062](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1062)  
**Prior blocked proof:** [#1066](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1066)  
**As of:** 2026-08-25  
**Anchor:** `<!-- FACTORY_CLOUD_AGENTS_V1_LIVE_CUTOVER_PROOF_1068 -->`

<!-- FACTORY_CLOUD_AGENTS_V1_LIVE_CUTOVER_PROOF_1068 -->

Canonical Context Preflight: PASS  
Operating model version: 2026-08-13-v1  
Environment: n/a  
GitHub state refreshed: YES  
Source item: #1068

This is the single authorized fresh proof that Factory Handoff now uses Cloud Agents API v1 as the sole executor after the repository Actions variable was corrected. It does **not** change application code, secrets, GitHub variables, database/schema, deployment, DNS, payments, or messaging.

Success marker claimed:

`LIVE CUTOVER PASS — cloud_agents_v1 is sole executor`

---

## Outcome (plain language)

GitHub handed **this** issue to Cursor through **Cloud Agents API v1 only**. The old Factory Wake Proof v2 webhook did **not** run. Both a `bc-*` agent ID and a `run-*` run ID were returned, and `IN_PROGRESS` was written only after that pair validated.

This is the production execution transport proof. It is **not** a client-site change and it is **not** a `client_production` release.

Earlier same-day context (honest, not a retry loop of a completed proof):

- #1066 / Actions run `32808930062` still ran Wake Proof v2 because the Actions variable had not taken effect.
- First #1068 Handoff `32812018040` selected Cloud Agents v1 and skipped Wake Proof, then failed on a missing import before the Cursor API call. Repair merged as PR #1069 (`f4cb4def`).
- This authorized proof is Handoff `32812974882` on that repaired `main`.

Do **not** create another proof issue.

---

## Required proof vs observed

| Required by #1068 | Observed on this wake |
|---|---|
| Handoff selects #1068 | **PASS** — Queue Reconcile → Factory Handoff [32812974882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/32812974882) selected #1068 |
| Skip Factory Wake Proof v2 | **PASS** — step `Wake Cursor Factory v2 webhook` = **skipped** |
| Invoke only Cloud Agents API v1 | **PASS** — step `Create correlated Cursor Cloud Agent v1` = **success**; Wake Proof publish step = **skipped** |
| Fresh correlated `bc-*` **and** `run-*` | **PASS** — `bc-57f57ed7-452d-4d09-bb4d-ea6dea47cc28` and `run-2453b792-2a59-427e-b0c8-03e394f46996` |
| `IN_PROGRESS` only after both identities validate | **PASS** — receipt, origin metadata, work-status, and `corpflow.factory_cloud_agents_executor.v1` comments all carry both IDs and `IN_PROGRESS` |
| Poll that exact correlated run | **PASS** — this worker is that `bc-*` / `run-*` pair (`source=api`, not `automations`) |
| One bounded terminal state or PR evidence | **PASS** — this docs PR is the completion note |
| Release execution WIP | Happens when this review-ready PR is detected; this packet does not keep a second executor running |
| Leave next eligible valuable work available | Unchanged product queue; this synthetic issue is not a valuable product packet |

Stop conditions that fired: **none**.

Stop conditions checked and clear:

- `bc-*` agent ID returned
- `run-*` run ID returned
- Wake Proof v2 did **not** execute
- no secret values in this evidence
- no new paid entitlement requested
- only one executor activated (`cloud_agents_v1`)

---

## Live identities for this proof run

These identify the **Cloud Agents API v1** worker created by Factory Handoff. They are the correlated create receipt.

| Field | Value |
|---|---|
| Cursor agent ID | `bc-57f57ed7-452d-4d09-bb4d-ea6dea47cc28` |
| Cursor agent URL | https://cursor.com/agents/bc-57f57ed7-452d-4d09-bb4d-ea6dea47cc28 |
| Cursor run ID | `run-2453b792-2a59-427e-b0c8-03e394f46996` |
| Work request ID | `cfai-wr-57f57ed7-452d-4d09-bb4d-ea6dea47cc28` |
| Agent source | `api` |
| Agent name | `factory-handoff-issue:1068` |
| Factory Handoff / Queue Reconcile run | `32812974882` |
| Executor evidence schema | `corpflow.factory_cloud_agents_executor.v1` |
| `origin/main` SHA served by this Handoff | `f4cb4def57441c8fd4046d71dd88e3c7cbf3b58b` (PR #1069 repair on PR #1065 adapter) |

Issue #1068 comments at wake time contained `corpflow.factory_cloud_agents_executor.v1` with source issue, work request, handoff run, concrete `bc-*`, concrete `run-*`, and `IN_PROGRESS`. They did **not** contain a Factory Wake Proof v2 webhook receipt.

---

## Merged repository state (read-only)

Verified on `origin/main` `f4cb4def` (merged PRs #1065 and #1069):

- `.github/workflows/factory-cursor-handoff.yml` keeps mutually exclusive executor steps:
  - Wake Proof webhook only when `CURSOR_FACTORY_EXECUTOR` is blank or `wake_proof_v2`
  - Cloud Agents create only when `CURSOR_FACTORY_EXECUTOR == 'cloud_agents_v1'`
- This live run proved the variable is `cloud_agents_v1`: Wake Proof skipped, Cloud Agents create succeeded
- `scripts/factory-cloud-agents-executor.mjs` no longer imports a missing `listGitHubIssueComments` export
- `lib/server/factory-cloud-agents-executor.js` still requires both `bc-*` and `run-*` before `IN_PROGRESS`

This worker cannot list GitHub Actions variables. Runtime step selection is the proof.

---

## What this packet does not do

- Does not change application / runtime code
- Does not set, print, or rotate `CURSOR_API_KEY` or any other secret
- Does not change `CURSOR_FACTORY_EXECUTOR` (already live as `cloud_agents_v1`)
- Does not rewrite protected operating-model doctrine
- Does not merge, deploy, mutate schema/data, send messages, or take payment
- Does not create a second synthetic proof issue

---

## Next owner

Anton — merge this evidence PR when ready. No further synthetic proof is authorized by #1068. Ordinary Factory work can use the next eligible valuable issue. Protected-action gates are unchanged.
