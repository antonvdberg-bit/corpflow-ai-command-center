# 2026-06-18 Codex docs consistency audit

## Status

**Audit status:** COMPLETE (docs/artifact only).

**Packet:** 7.3 — Codex Cloud docs consistency audit.

**Executor:** Codex Cloud.

**Branch expected by packet:** `codex/docs-consistency-audit-v1`.

**Scope result:** This packet created this audit report only. No remediation edits were made to operational docs, app code, runtime configuration, workflows, environment files, secrets, n8n assets, containers, or server/L3 surfaces.

**Operator Bridge:** Attempted to post `IN_PROGRESS` to issue #249 with `gh issue comment 249`, but the checkout has no configured Git remote (`origin` is absent), so GitHub issue posting was not available from this environment. No GitHub settings were changed.

## Files inspected

Primary files requested by the packet:

- `AGENTS.md`
- `docs/execution/CODEX_UTILIZATION_PLAN_V1.md`
- `docs/execution/CODEX_CLOUD_ACTIVATION_PACKET_V1.md`
- `docs/runbooks/CODEX_CLOUD_INSTALL.md`
- `docs/execution/DELIVERY_ACCELERATION_V1.md`
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`
- `docs/operations/OPERATOR_BRIDGE_V1.md`
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- `docs/execution/WEEKEND_EXECUTION_QUEUE.md`

Required process files skimmed before committing:

- `docs/CORPFLOW_SHARED_TODO.md`
- `.cursor/rules/commit-push-doc-constraints.mdc`
- `.cursor/rules/security-sensitive-changes.mdc`
- `.cursor/rules/delivery-reality.mdc`
- `.cursor/rules/predeploy-decision-checks.mdc`

Checks performed:

- `find .. -name AGENTS.md -print` to confirm scoped agent instructions.
- `git status --short --branch` / `git branch --show-current` to confirm local branch state.
- Python path extraction over `AGENTS.md` Must-read backticked paths to verify referenced files exist.
- `rg` scans for Codex/Cursor/L1/L2/L3/Packet 7.2/Packet 7.3/autonomous-merge wording across the requested docs.
- Python internal-reference scan across the requested docs, with manual review to separate true missing paths from intentionally relative shorthand, templates, globs, or future artifact placeholders.

## Findings

### P0

No P0 findings.

### P1

No P1 findings.

### P2

#### P2-1 — Codex activation/status language is stale now that PR #394 and PR #396 are merged and this packet is running

Several Codex docs still describe the activation/utilization state as pending or not installed:

- `CODEX_UTILIZATION_PLAN_V1.md` says the plan is awaiting Anton review and that Packet 7.2 is pending / Codex Cloud is not yet installed.
- `CODEX_CLOUD_ACTIVATION_PACKET_V1.md` says activation is pending, Codex Cloud is not yet installed, no `codex/*` branches exist, first packet is not assigned, and PR #394 is still pending merge.
- `WEEKEND_EXECUTION_QUEUE.md` still says the utilization plan PR #394 is pending merge, Packet 7.2 is pending, and Packet 7.3 is ready to assign after 7.2 / not started.

Why this matters: the packet activation context states PR #394 and PR #396 are merged and Codex Cloud is acting as L2 executor #2. The stale wording does not grant extra authority, but it can confuse reviewers about whether Packet 7.3 is allowed to be in progress.

Recommended remediation: a follow-up docs-only PR should update the state fields in the utilization plan, activation packet, and weekend queue to reflect post-activation reality: PR #394/#396 merged, Packet 7.2 complete or completed enough to run Packet 7.3, Packet 7.3 in review/awaiting approval after this PR, and first `codex/*` branch/PR observed.

#### P2-2 — `AGENTS.md` has duplicate Codex Cloud install runbook rows

`AGENTS.md` Must-read table includes two adjacent rows for `docs/runbooks/CODEX_CLOUD_INSTALL.md` with slightly different descriptions. Both references resolve, but the duplicate can cause drift because future edits may update one row and not the other.

Recommended remediation: a follow-up docs-only cleanup PR should merge those rows into a single canonical Codex Cloud install row.

#### P2-3 — `OPERATOR_BRIDGE_V1.md` top-level status is stale relative to confirmed issue #249

`OPERATOR_BRIDGE_V1.md` begins with `Status: Protocol documentation only. Not yet wired to a GitHub Issue or automation.`, while later in the same doc it says issue #249 is confirmed. This is internally inconsistent and can confuse executors about whether #249 is the live bridge.

Recommended remediation: update the top-level status to say the bridge issue is confirmed as #249, while automation remains documentation/manual unless separately implemented.

#### P2-4 — Autonomous execution policy still speaks only about Cursor agents, not Codex Cloud under the same AAP constraints

`CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` audience and operational wording repeatedly name Cursor agents and contractors, but not Codex Cloud. `DELIVERY_ACCELERATION_V1.md` correctly applies identical §2 latitude and §3 restrictions to Codex Cloud, so the policy outcome is clear when read together. However, the policy itself can look Cursor-only when read in isolation.

Recommended remediation: a policy/docs follow-up PR should add Codex Cloud to AAP audience/actor wording without loosening any hard gate. If treated as a policy amendment, use the repository's `policy:` PR convention.

### P3

#### P3-1 — Some cross-doc references use basename-only shorthand that automated scanners flag as missing

Examples include `DELIVERY_ACCELERATION_V1.md`, `CODEX_CLOUD_INSTALL.md`, `WEEKEND_EXECUTION_QUEUE.md`, `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`, and `.cursor` rule basenames such as `delivery-reality.mdc`. A human can resolve these from nearby context, and the canonical Must-read table paths resolve, but tooling sees them as missing when it interprets them relative to the current doc directory.

Recommended remediation: a follow-up docs-lint PR may normalize shorthand references to repo-root paths (for example, `docs/execution/DELIVERY_ACCELERATION_V1.md` or `.cursor/rules/delivery-reality.mdc`) where clarity matters. This is not urgent.

#### P3-2 — Placeholder artifact paths are intentionally non-existent but look like broken references

Several docs include examples such as `artifacts/audits/<date>-docs-consistency.md`, `artifacts/audits/<date>-broken-references.md`, `artifacts/<date>-queue-summary.md`, and `artifacts/client-reports/<tenant>/<date>.md`. These are templates, not broken current references.

Recommended remediation: no immediate fix required. If a docs-link checker is introduced, exempt placeholder patterns containing `<...>`.

#### P3-3 — Internal-agent roadmap wording remains future-oriented and appears consistent, but should stay watched

`DELIVERY_ACCELERATION_V1.md` and `WEEKEND_EXECUTION_QUEUE.md` mention a future internal CorpFlow agent roadmap/phases. Current wording does not authorize a fourth execution layer and is bounded by explicit “not installed in v1” language. No conflict found, but this area should be re-audited before any internal-agent proposal.

Recommended remediation: no immediate fix required. Any future internal-agent work should start with a separate proposal/authorization packet and should re-check `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`.

## Severity: P0/P1/P2/P3

| ID | Severity | Summary | Recommended owner |
| --- | --- | --- | --- |
| P2-1 | P2 | Codex activation/status language stale after PR #394/#396 and Packet 7.3 start | Docs follow-up |
| P2-2 | P2 | Duplicate `CODEX_CLOUD_INSTALL.md` rows in `AGENTS.md` Must-read table | Docs follow-up |
| P2-3 | P2 | `OPERATOR_BRIDGE_V1.md` top status conflicts with later #249 confirmation | Docs follow-up |
| P2-4 | P2 | AAP wording is Cursor-centric despite Codex Cloud now operating under identical constraints | Policy/docs follow-up |
| P3-1 | P3 | Basename-only shorthand references create false positives for automated scanners | Optional docs-lint cleanup |
| P3-2 | P3 | Placeholder artifact paths are intentionally absent | No immediate action |
| P3-3 | P3 | Future internal-agent roadmap wording is acceptable but watch before new proposals | No immediate action |

## Missing files referenced from must-read tables

No missing files were found in the `AGENTS.md` Must-read table path check. The audit script extracted backticked repo paths from `AGENTS.md` and verified each concrete path exists on disk.

## Codex / Cursor / server execution posture consistency

Confirmed consistent across the inspected docs, subject to stale activation state noted above:

- Codex Cloud is an L2 cloud executor, not L1 and not L3.
- Cursor remains the primary L1 in-repo executor.
- `corpflow-exec-01-u69678` remains L3 operator-driven box hands.
- No Codex CLI, daemon, MCP server, or agent is authorized on `corpflow-exec-01-u69678`.
- No fourth execution layer is authorized.
- Codex does not have autonomous merge authority; Anton remains final merge authority.
- Codex must use `codex/*` branches and must not share branches with Cursor.

## Recommended follow-up PRs

1. **`docs(codex): update activation state after first Codex packet`**
   - Update `CODEX_UTILIZATION_PLAN_V1.md`, `CODEX_CLOUD_ACTIVATION_PACKET_V1.md`, `CODEX_CLOUD_INSTALL.md` if needed, and `WEEKEND_EXECUTION_QUEUE.md` to reflect merged PR #394/#396, Packet 7.2 activation completion, first `codex/*` branch/PR, and Packet 7.3 review state.

2. **`docs(agents): deduplicate Codex install must-read row`**
   - Collapse the two `CODEX_CLOUD_INSTALL.md` rows in `AGENTS.md` into one canonical row.

3. **`docs(bridge): align Operator Bridge status with issue 249`**
   - Update the top-level status in `OPERATOR_BRIDGE_V1.md` so it does not contradict the later #249 confirmation.

4. **`policy: clarify Codex Cloud is covered by AAP gates`**
   - If Anton wants the AAP itself to name Codex Cloud, amend actor wording while preserving all §3 hard gates and no-merge/no-secret/no-runtime boundaries.

5. **`docs(tooling): normalize or exempt internal doc reference patterns`**
   - Optional. Normalize basename-only references where useful and document exclusions for `<date>` / `<tenant>` template paths before introducing any automated link checker.

## Required explicit confirmations

- **No code/runtime/env/server changes were made.** This packet only created `artifacts/audits/2026-06-18-codex-docs-consistency.md`.
- **No Codex CLI/server-side install was attempted.** No commands were run against `corpflow-exec-01-u69678`; no SSH, Docker, n8n, restic, container, daemon, MCP, OpenAI key, or server/L3 operation was attempted.
- **No autonomous merge was attempted.** This work stops at commit/PR creation and awaits Anton review.
