# OpenHands work packet template (human-readable)

**Status:** DRAFT template. `config/openhands/work-packet.schema.json` (the machine-readable JSON Schema
counterpart named in `ops/openhands/README.md`'s file map) has **not yet been authored** — it is part of the
Phase 1 package's planned deliverables, not yet created. This doc defines the field set both artifacts must
agree on, so the schema (when authored) and this human template stay in lockstep. **Controlling issue:**
[#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743)

**Companion docs:**

- `docs/operations/OPENHANDS_OPERATING_CHARTER.md` § "Work packet contract" — the source of the required-field list below.
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — the operator-level packet standard this dispatch-level template is a narrower sibling of (that doc governs what Anton approves once; this doc governs what a single GitHub issue must contain for OpenHands to safely pick it up).
- `docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` § 2 — how a packet becomes "active."
- `docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md` § 5 — the usage-recording fields captured at completion.

---

## 1. How to use this template

Copy the block in § 3 into a GitHub issue (or an issue comment, if the issue itself predates OpenHands
adoption) when a piece of work is being made **eligible** for OpenHands to claim. Every field is required
unless marked optional — a packet missing a required field is not eligible for OpenHands to pick up (per the
Charter: *"A task is active only when there is a real run ID, branch, and current activity evidence. Comments
and labels alone do not constitute active work"* — this template is the precondition for reaching that state,
not a substitute for it).

## 2. Field reference (maps 1:1 onto the future `work-packet.schema.json`)

| Field | Type | Required | Description |
|---|---|---|---|
| `packet_id` | string | yes | Distinct from the parent issue number (Charter requirement). Stable identifier used in branch names, commit trailers, and evidence. |
| `parent_issue` | integer | yes | The GitHub issue number this packet serves. |
| `business_objective` | string | yes | One sentence, plain language — the outcome, not the steps. |
| `expected_value` | string | optional | Why this packet matters relative to other queued work. |
| `priority` | enum(`P0`,`P1`,`P2`) | yes | Matches the repo's existing priority-label convention. |
| `allowed_files` | array\<string\> | yes | Explicit glob(s) or paths OpenHands may touch. Anything outside this list is out of scope, even if "obviously needed." |
| `excluded_files` | array\<string\> | optional | Explicit denials, for cases where a broad `allowed_files` glob needs a carve-out. |
| `acceptance_tests` | array\<string\> | yes | Observable, testable conditions (yes/no, not vibes) — same discipline as `CORPFLOW_EXECUTION_PACKET_STANDARD.md` § 2.2. |
| `evidence_requirements` | array\<string\> | yes | What must be captured before the packet can be marked done (test output, screenshots, PR URL, etc.). |
| `max_attempts` | integer | yes | Hard ceiling before mandatory escalation to Cursor (Charter default: 2). |
| `model_tier` | enum(`low_cost`,`strong_coding`) | yes | Which OpenHands model tier this packet should route to, per `docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md`. |
| `spend_ceiling_usd` | number | optional | Per-packet spend ceiling, if tighter than the monthly ceiling justifies tracking individually. |
| `protected_gates` | array\<string\> | yes | Which Charter protected actions this packet must never touch (usually: all of them, restated explicitly rather than assumed). |
| `escalation_condition` | string | yes | The specific trigger for handing this packet to Cursor (beyond the default two-failure rule, if different). |
| `branch_naming` | string | yes | Must follow `openhands/<packet_id>-<short-slug>` (see `docs/operations/OPENHANDS_OPERATING_CHARTER.md`'s branch-prefix convention). |
| `expected_pr_boundary` | string | yes | What the resulting PR should and should not contain — the "no scope creep" boundary. |
| `real_client_data_permitted` | boolean | yes | Must be `false` unless a separate, explicit exception is recorded (default posture per issue #743's body). |
| `worker` | enum(`openhands`,`cursor`,`codex`) | yes | Which worker currently claims this packet — the collision-prevention field. |
| `run_id` | string | conditional | Required once the packet is `RUNNING` or later in the lifecycle; absent while `READY`/`RESERVED`. |
| `branch` | string | conditional | Required once `BRANCH_ACTIVE` or later. |
| `status` | enum (lifecycle states) | yes | One of `READY`, `RESERVED`, `RUNNING`, `BRANCH_ACTIVE`, `PR_OPEN`, `CI_OR_REVIEW`, `REPAIR`, `REVIEW_READY`, `DISPOSITIONED`, `COMPLETE`, `STALE`, `REQUEUED`, `ESCALATED` (per `docs/operations/OPENHANDS_IMPLEMENTATION_AND_OPERATIONS_RUNBOOK.md` § "Task lifecycle"). |
| `model_used` | string | conditional | Recorded at completion — provider/model name, never a key. |
| `attempts` | integer | conditional | Recorded at completion. |
| `approximate_cost_usd` | number | conditional | Recorded at completion, if the provider surfaces it. |
| `escalation_outcome` | string | conditional | Recorded only if escalated. |

## 3. Copy-paste template

```markdown
### OpenHands work packet: <short title>

- packet_id: <distinct-id, not the issue number>
- parent_issue: #<number>
- business_objective: <one sentence>
- expected_value: <optional — why this matters now>
- priority: P0 | P1 | P2
- allowed_files:
  - <path or glob>
- excluded_files:
  - <optional path or glob>
- acceptance_tests:
  - <observable yes/no condition>
- evidence_requirements:
  - <artifact required before COMPLETE>
- max_attempts: 2
- model_tier: low_cost | strong_coding
- spend_ceiling_usd: <optional>
- protected_gates:
  - no production deploy
  - no secret/env change
  - no DB/schema change
  - no DNS/firewall change
  - no payment/paid-tool activation
  - no external send (email/WhatsApp/SMS)
  - no public launch
  - no destructive cleanup
  - no auto-merge
- escalation_condition: <trigger, if different from the default two-failure rule>
- branch_naming: openhands/<packet_id>-<short-slug>
- expected_pr_boundary: <what the PR should and should not contain>
- real_client_data_permitted: false
- worker: openhands
- status: READY
```

## 4. What this template does NOT do

- It does not, by itself, authorize OpenHands to start work — installation remains gated per
  `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md`, and even once installed, dispatch still requires the
  collision check in `docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` § 2.
- It does not replace `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` for operator-level approval
  packets (installs, ADRs, carve-outs) — those remain Anton-approved-once packets; this template is for the
  individual GitHub-issue-level units of work an already-authorized OpenHands worker would pick up.
- It does not set `real_client_data_permitted: true` by default, ever — that requires its own explicit, separate
  exception recorded outside this template.

## 5. Change log

- **2026-08-04** — Initial template authored alongside the Phase 1 documentation set for #743. The companion
  `config/openhands/work-packet.schema.json` has not yet been authored — this doc is the field-set source of
  truth until it is.
