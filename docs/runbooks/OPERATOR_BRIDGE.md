# Operator Bridge — day-to-day runbook

**Purpose:** Thin operator-facing companion to `docs/operations/OPERATOR_BRIDGE_V1.md`. Covers "how do I post a status comment right now?" for Cursor, Codex Cloud, and Anton. The full architecture, hold rules, and guardrails live in `OPERATOR_BRIDGE_V1.md` — this runbook does not duplicate them.

**Coordination issue:** **GitHub issue #249** — `Operator Bridge — Active Work Queue`.

## 1. Quick map

| You are | You post | Schema |
|---|---|---|
| Cursor or Codex Cloud (executor) | Status update on every state transition | `OPERATOR_BRIDGE_V1.md` §5.1 |
| Anton (operator) | Decision: approve / hold / reject / escalate | `OPERATOR_BRIDGE_V1.md` §5.2 |
| Cursor or Codex Cloud (after merge) | Closure note + mirror to `artifacts/chat_history.md` | `OPERATOR_BRIDGE_V1.md` §5.3 |

## 2. When an executor must post

Post a STATUS comment to #249 at every one of these moments:

1. **Packet claim** — `APPROVED → IN_PROGRESS`. Identify which executor is claiming.
2. **Awaiting operator** — pre-merge or any AAP §3 gate hit (secrets, DNS, billing, etc.).
3. **Blocked** — anything in `OPERATOR_BRIDGE_V1.md` §6 HOLD rules.
4. **Evidence captured** — when `npm test` / `npm run build` / live probes are done and recorded in the PR.
5. **PR merged** — closure note per §5.3.

If unsure whether to post: **post.** Silence is worse than redundancy on #249.

## 3. Required header field (Delivery Acceleration v1)

Every status comment must start with the executor identity. This is the only addition this runbook makes to the `OPERATOR_BRIDGE_V1.md` schemas:

```
**Executor:** Cursor | Codex Cloud | Internal agent
```

Place it directly under the `### Cursor status — <timestamp>` line in §5.1, or directly under `### Closure — <timestamp>` in §5.3.

## 4. Branch prefix at a glance

| Executor | Branch namespace | Owner field on the packet |
|---|---|---|
| Cursor | `docs/*`, `chore/*`, `feat/*`, `fix/*`, `refactor/*` | `Owner: Executor = Cursor` |
| Codex Cloud | `codex/docs-*`, `codex/chore-*`, `codex/feat-*`, `codex/fix-*`, `codex/refactor-*` | `Owner: Executor = Codex Cloud` |
| Internal agent (future, phase 1+) | `internal-agent/*` (created via a future `policy:` PR) | `Owner: Executor = Internal agent` |

Never commit to a branch whose prefix does not match your executor identity. If the packet's `Owner: Executor` field names someone else, **HOLD** and ask Anton for re-assignment.

## 5. What never appears in a status comment

Carried from `OPERATOR_BRIDGE_V1.md` §9 and `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` §2.5. If you cannot describe the state without breaking these, post the status only and link evidence:

- Secret values, factory master key, Vercel / GitHub / OpenAI tokens.
- Reset codes, password hashes.
- Full session cookies, full `Authorization` headers, full `x-corpflow-*-secret` headers.
- Full request / response bodies that contain PII.
- Tenant data (rows, IDs not already publicly known, billing balances).
- Anything that looks redacted but an outsider could de-redact.

When in doubt, name the **shape** of the evidence and link the `artifacts/` file; do not paste the content.

## 6. Five concrete examples

### 6.1 Cursor claiming a docs-only packet

```
### Cursor status — 2026-05-28 04:50 UTC

**Executor:** Cursor
**Packet:** Delivery Acceleration v1 — protocol
**State:** IN_PROGRESS
**Branch / PR:** docs/delivery-acceleration-v1-protocol (PR pending)
**Files changed:** 5 (new + edit, docs only)
**Sentinels present:** OPERATOR_BRIDGE_V1_ANCHOR
**Checks:** running (npm test, npm run build)
**Next operator click:** none (working)
**Blocker (if any):** none
**Evidence:** PR will be opened when checks green
```

### 6.2 Codex Cloud claiming a docs-consistency audit

```
### Cursor status — 2026-06-XX HH:MM UTC

**Executor:** Codex Cloud
**Packet:** Docs consistency audit (AGENTS.md must-read table vs files on disk)
**State:** IN_PROGRESS
**Branch / PR:** codex/docs-consistency-audit (PR pending)
**Files changed:** 1 (artifacts/audits/<date>-docs-consistency.md)
**Sentinels present:** none required (read-only audit)
**Checks:** running
**Next operator click:** none (working)
**Blocker (if any):** none
**Evidence:** report saved at artifacts/audits/<date>-docs-consistency.md
```

### 6.3 Executor hitting an AAP §3 gate

```
### Cursor status — 2026-06-XX HH:MM UTC

**Executor:** Cursor
**Packet:** <packet name>
**State:** AWAITING_OPERATOR
**Branch / PR:** <PR URL>
**Files changed:** <count>
**Sentinels present:** <list>
**Checks:** green
**Next operator click:** rotate <env var name> in Vercel Production
**Blocker (if any):** value drift detected on <env name>; cannot proceed without operator action per AAP §3.2
**Evidence:** diagnostic JSON at artifacts/diagnostics/<date>-<env-name>.json
```

### 6.4 Anton approving a packet

```
### Operator decision — 2026-06-XX HH:MM UTC

**Source:** Anton
**Decision:** approve Docs consistency audit
**Scope:** read repo + write artifacts/audits/<date>-docs-consistency.md only
**Constraints:** no other paths; no secrets; no tenant data; one PR, single Executor = Codex Cloud
**Operator-only steps Anton will take:** merge the PR when Cursor reports green
**Definition of done:** report exists on main, AGENTS.md is unchanged by this packet
**Verification required:** Codex Cloud posts the closure note with the merge SHA
```

### 6.5 Closure mirror

```
### Closure — 2026-06-XX HH:MM UTC

**Executor:** Codex Cloud
**PR:** #<n>
**Merge SHA:** <full sha>
**Merged at:** <iso>
**Live verification:** n/a — docs-only
**Delivery Reality Audit verdict:** COMPLETE
**Sentinel(s) on main:** <list>
```

Mirror to `artifacts/chat_history.md` in the same PR or a tiny follow-up.

## 7. If something is wrong

- If `main` disagrees with #249, `main` wins. Update the issue, do not invent state.
- If a STATUS comment leaked any forbidden content, post a follow-up comment marking it: `### Redaction notice — <timestamp>` naming what was leaked (by shape, not value) so Anton can decide on rotation. Do **not** delete history — that destroys the audit trail.
- If two executors look like they claimed the same packet, both must HOLD and wait for Anton's `Operator decision` re-assigning ownership.

## 8. References

- Bridge architecture, schemas, hold rules, guardrails: `docs/operations/OPERATOR_BRIDGE_V1.md`
- Delivery Acceleration v1 protocol (multi-executor model + Codex Cloud posture): `docs/execution/DELIVERY_ACCELERATION_V1.md`
- Packet structure: `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
- What requires approval: `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- Live verification rules: `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc`
