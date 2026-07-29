# Anton Decision Inbox v1 — central operator decisions + protected-action gates

**Status:** Canonical (v1, 2026-07-29). Implements GitHub issue **#676**.
**Owner:** Anton (approvals / repo settings); Cursor (in-repo enforcement + docs); n8n (exception notifier after wiring).
**Anchor sentinel:** `<!-- ANTON_DECISION_INBOX_V1 -->`

<!-- ANTON_DECISION_INBOX_V1 -->

## 1. Business outcome

Anton can step away from individual workstreams and still see **every genuine decision** that requires CEO/operator authority in **one GitHub inbox**, while Cursor, Codex, GitHub Actions, n8n, and project workstreams remain **technically unable** to perform protected consequential actions without a durable, scoped approval.

## 2. Source of truth (no second control plane)

| Layer | Where | Role |
|-------|-------|------|
| **Active Decision Inbox** | GitHub issues/PRs with `needs:anton` + `approval:*` | Queryable list of open decisions |
| **Human-readable coordination** | Operator Bridge **#249** | STATUS / Operator decision comments (reuse — do not invent a second app) |
| **Durable approval marker** | Structured comment `corpflow.protected_approval.v1` on the issue/PR | Authoritative approval (labels alone never authorize) |
| **Exception notifier** | Existing n8n → Telegram forward (`corpflow.ops_alert.v1`) | Thin alerts only — not a mirror of GitHub |

**Do not** introduce a second app, second database, or paid platform for this inbox.

## 3. Labels

| Label | Meaning |
|-------|---------|
| `needs:anton` | Item is in the active Decision Inbox |
| `approval:merge` | Decision: merge to protected branch |
| `approval:deploy` | Decision: production deploy |
| `approval:production` | Decision: other production mutation |
| `approval:db-schema` | Decision: DB/schema migration |
| `approval:env-secrets` | Decision: env or secrets change |
| `approval:external-send` | Decision: live email / WhatsApp / SMS / outreach |
| `approval:payment` | Decision: payment action |
| `approval:paid-tool` | Decision: paid vendor/tool activation |
| `approval:public-launch` | Decision: public client-facing launch |

**Rules:**

1. Every item requiring Anton carries `needs:anton` **plus one or more** `approval:*` reason labels.
2. Labels **route** work into the inbox; they **do not** constitute protected approval.
3. Removing `needs:anton` (or closing the issue) clears the item from the active inbox.
4. Workflows auto-create missing labels when they have `issues: write` (same pattern as dispatch lifecycle labels).

### Active inbox query

```text
is:open label:"needs:anton" -label:dispatch:blocked
```

GitHub Issues UI → Labels → `needs:anton`, or bookmark the filtered issues list for this repo. Prefer the Issues label filter over Search API for colon labels.

Canonical constants + helpers: `lib/server/anton-decision-inbox.js`.

## 4. Decision packet (required on every inbox item)

Agents / ChatGPT must post a structured packet (markdown + machine HTML comment):

- project / workstream
- business outcome
- exact decision required
- recommended decision
- consequence of approve
- consequence of reject/defer
- evidence links
- expiry / urgency (if any)
- action (`merge` | `deploy` | `production` | `db-schema` | `env-secrets` | `external-send` | `payment` | `paid-tool` | `public-launch`)
- issue/PR, environment, target SHA when relevant

Format helpers: `formatDecisionPacketMarkdown` / `buildDecisionPacket`.

## 5. What counts as approval

**Only:**

1. Anton explicitly approves on the GitHub decision surface (issue/PR) with a durable `corpflow.protected_approval.v1` marker; **or**
2. Anton explicitly approves in the controlling ChatGPT workstream **and** ChatGPT (or Anton) records that same durable marker on GitHub **before** the protected action runs.

**Do not count as approval:** silence; old approvals; client approval alone; green CI; mergeable PR; a label applied by automation; an agent recommendation.

Approvals are scoped to: exact action, exact issue/PR, exact commit SHA (when relevant), exact environment, and optional `validUntil`.

## 6. Exception-only notification

Use the existing approved non-Slack path (n8n → Telegram via `CORPFLOW_AUTOMATION_FORWARD_URL` / `corpflow.ops_alert.v1`).

Notify **only** when:

- a new `needs:anton` item appears;
- the requested decision **materially** changes;
- an approval deadline / escalation threshold is reached;
- a previously approved action **fails** and needs a new decision.

Policy module: `lib/server/anton-decision-notify.js` (dedupe by issue/PR + approval type + evidence fingerprint; suppress blanks and unchanged repeats).

Each alert includes: project/workstream, issue or PR number, exact action, urgency, direct GitHub link — **no secrets or private client data**.

## 7. Enforceable protected-action gates

Library: `lib/server/protected-action-gates.js`  
CLI: `scripts/check-protected-action-gate.mjs`

| Control | In-repo enforcement |
|---------|---------------------|
| No agent auto-merge | `evaluateAgentAutoMergeGate` — `cursor/*`, `codex/*`, `internal-agent/*` always blocked; `cmp-product-automerge.yml` hardened |
| Deploy / production | Deploy hook uses GitHub Environment `Production` + durable approval check |
| DB/schema, external-send, payment, paid-tool, public-launch | Default-disabled until `workflowEnabled=true` **and** durable approval |
| Labels bypass | Explicitly rejected by `evaluateProtectedApproval` |
| Secrets isolation | `evaluateUntrustedPrSecretsIsolation` — fork / `pull_request_target` never get production secrets |
| Audit | Gate audit records approver, action, SHA, environment, timestamp, result |

Repository settings that **cannot** be applied from code alone (required reviewers on Environments, branch ruleset review count, etc.) are listed in `docs/operations/ANTON_DECISION_INBOX_OPERATOR_SETTINGS_PACKET_676.md`.

## 8. Workstream adoption (Lux, CIPC Desk, future)

Project control prompts and operating docs must:

1. Route genuine operator decisions to this Decision Inbox (`needs:anton` + `approval:*` + packet).
2. **Not** ask Anton to monitor every project workstream.
3. Continue safe autonomous work while **unrelated** approvals are pending.
4. Never perform protected actions merely because implementation and CI are complete.

See:

- `docs/CORPFLOW_OPERATING_PLAYBOOK.md` § Cursor execution rules
- `docs/operations/TENANT_CLIENT_LOGIN.md` (Lux + CIPC Desk)
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- `docs/runbooks/OPERATOR_BRIDGE.md`

## 9. Related docs

- Gap matrix: `docs/operations/ANTON_DECISION_INBOX_GAP_MATRIX_676.md`
- Operator settings packet: `docs/operations/ANTON_DECISION_INBOX_OPERATOR_SETTINGS_PACKET_676.md`
- Operator Bridge: `docs/operations/OPERATOR_BRIDGE_V1.md` / `docs/runbooks/OPERATOR_BRIDGE.md`
- Dispatch lifecycle (`needs:anton` claim block): `docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md`
