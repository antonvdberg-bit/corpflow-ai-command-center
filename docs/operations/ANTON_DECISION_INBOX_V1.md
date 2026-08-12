# Anton Decision Inbox v1 — central operator decision surface

**Status:** Canonical for issue [#676](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/676). Docs + repo helpers; repository-setting changes that cannot be applied from code are listed in `docs/operations/ANTON_DECISION_INBOX_OPERATOR_SETTINGS_PACKET.md`.

**Owner:** Anton (approvals); Cursor (implementation); ChatGPT (control design / consolidation); n8n (exception-only notify after approved activation).

**Source of truth:** GitHub issues/PRs with exact labels + structured comments. **Do not** create a second app, database, or paid control plane.

**Human-readable coordination surface:** reuse Operator Bridge **#249** for STATUS / decision chatter. The **active Decision Inbox** is the GitHub label query below — #249 is the narrative ledger, not a competing queue.

**Anchor sentinel:** `<!-- ANTON_DECISION_INBOX_V1 -->`

<!-- ANTON_DECISION_INBOX_V1 -->

## 1. Business outcome

Anton can leave individual workstreams alone and still see every genuine decision, approval, blocker, or escalation that requires CEO/operator authority — while agents remain **technically unable** to perform protected consequential actions without durable approval.

## 2. Labels (exact)

| Label | Role |
|-------|------|
| `needs:anton` | Item is in the active Decision Inbox |
| `approval:merge` | Reason: merge authority |
| `approval:deploy` | Reason: deploy authority |
| `approval:production` | Reason: production mutation |
| `approval:db-schema` | Reason: database/schema |
| `approval:env-secrets` | Reason: env / secrets |
| `approval:external-send` | Reason: live email / WhatsApp / SMS / outreach |
| `approval:payment` | Reason: payment / money movement |
| `approval:paid-tool` | Reason: paid vendor/tool activation |
| `approval:public-launch` | Reason: public client-facing launch |

**Rules**

1. Every item requiring Anton carries `needs:anton` **plus one or more** `approval:*` reason labels.
2. **Labels route work. Labels do not constitute protected approval.**
3. Lifecycle / dispatcher workflows may **ensure** these labels exist (auto-create). Anton should not need to create them manually in the GitHub UI.
4. When resolved, remove `needs:anton` (and the spent reason label when appropriate) so the item **disappears from the active inbox automatically**.

### Active inbox query

```text
repo:antonvdberg-bit/corpflow-ai-command-center is:open label:"needs:anton"
```

GitHub UI: Issues → label `needs:anton` (open). Prefer the Issues list + client-side label filter for colon labels; the Search API is unreliable for `label:needs:anton`.

Helper: `buildActiveDecisionInboxQuery()` in `lib/server/anton-decision-inbox.js`.

## 3. Structured decision packet (required)

Every `needs:anton` item must contain a comment (or issue body section) starting with:

```text
### ANTON DECISION PACKET
```

Required fields (key: value lines):

| Field | Meaning |
|-------|---------|
| `project_workstream` | Lux / CIPC Desk / ops / Lead Rescue / … |
| `business_outcome` | What becomes true for the business |
| `exact_decision_required` | The one decision Anton must make |
| `recommended_decision` | Agent/controller recommendation |
| `consequence_of_approve` | What happens if approved |
| `consequence_of_reject_or_defer` | What happens if rejected/deferred |
| `evidence_links` | PR, run, preview, audit links (no secrets) |
| `urgency_or_expiry` | P0 / deadline / `none` |
| `approval_type` | One of the `approval:*` labels |
| `issue_or_pr` | `#123` or `PR #456` |
| `target_sha` | Commit SHA when relevant, else `n/a` |
| `target_environment` | `Production` / `Preview` / `n/a` |

Format helper: `formatDecisionPacket()` / `parseDecisionPacket()`.

Optional pointer on #249: post a short STATUS that links to the issue/PR carrying the full packet — do **not** duplicate a second incomplete packet as the only record.

## 4. Durable approval (only this unlocks)

Only the following count as protected approval:

1. Anton explicitly posts a durable approval on the designated GitHub surface (the issue/PR, optionally mirrored on #249); or
2. Anton explicitly approves in the controlling ChatGPT workstream **and** ChatGPT records that approval durably in GitHub **before** the protected action runs.

Marker:

```text
### ANTON DURABLE APPROVAL
```

Required fields: `approver`, `approval_type`, `issue_or_pr`, `target_sha`, `target_environment`, `valid_until`, `decision` (`approve`), `recorded_at`.

**Do not count as approval:** silence; an old approval for a different SHA/env/action; client approval; green CI; mergeable PR; a label applied by automation; an agent recommendation.

Approvals are scoped to: exact action, exact issue/PR, exact commit SHA / deployment candidate where relevant, exact environment, and limited validity where appropriate.

**Active-task instruction (#896):** When Anton’s controlling issue/PR body already explicitly authorizes the exact consequential action for that work package, that instruction is sufficient for dispatcher claim eligibility for that gate. Do **not** require a second durable ceremony or Anton courier step. Ordinary reversible delivery work never waits on Decision Inbox merely because the task mentions a protected subject.

Helpers: `formatDurableApproval()`, `parseDurableApproval()`, `evaluateProtectedActionGate()`, `buildApprovalAuditRecord()`, `evaluateOperatorGateAuthorization()`.

### Resolution (clear inbox)

```text
### ANTON DECISION RESOLVED
```

Then remove `needs:anton` (and spent reason labels). Helper: `formatDecisionResolved()` / `isActiveDecisionInboxItem()`.

## 5. Exception-only notification

Use the existing approved non-Slack route (n8n → Telegram). Design: `docs/n8n/anton-decision-inbox-exception-notify.md`.

Notify **only** when:

- a new `needs:anton` item appears;
- the requested decision materially changes;
- an approval deadline / escalation threshold is reached;
- a previously approved action fails and needs a new decision.

Do **not** mirror normal GitHub activity. No blank messages. No repeated unchanged alerts. Deduplicate by issue/PR + approval type + evidence fingerprint (`buildExceptionNotifyFingerprint`, `shouldSendExceptionNotification`).

## 6. Workstream adoption (Lux, CIPC Desk, future)

Project control prompts and operating docs must:

- route genuine operator decisions to this Decision Inbox (`needs:anton` + reason label + packet);
- **not** ask Anton to monitor every project workstream;
- continue safe autonomous work while unrelated approvals are pending;
- never perform protected actions merely because implementation and CI are complete.

See also: `docs/operations/PROTECTED_ACTION_GATES_V1.md`, `docs/operations/CUSTOMER_THROUGHPUT_OPERATING_MANDATE_V1.md`, Lux / CIPC pointers in §8.

## 7. Relationship to Operator Bridge #249

| Surface | Role |
|---------|------|
| Label query `needs:anton` | **Active Decision Inbox** (machine + human scan) |
| Issue/PR comments | Durable packets + durable approvals + resolution |
| #249 | Human-readable STATUS / decision ledger (reuse; no second control plane) |

If #249 and an issue disagree on whether Anton must act, the **labelled open issue/PR with an unresolved packet** wins for inbox membership; update #249 to match.

## 8. Cross-references

- Protected gates enforcement: `docs/operations/PROTECTED_ACTION_GATES_V1.md`
- Operator settings packet (Anton-only UI): `docs/operations/ANTON_DECISION_INBOX_OPERATOR_SETTINGS_PACKET.md`
- Exception notify design: `docs/n8n/anton-decision-inbox-exception-notify.md`
- Operator Bridge: `docs/operations/OPERATOR_BRIDGE_V1.md`, `docs/runbooks/OPERATOR_BRIDGE.md`
- Dispatch lifecycle: `docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md`
- Autonomous policy: `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- Lux: `docs/operations/LUXE_AUTONOMY_PILOT_RUNBOOK.md`, `docs/LUX/LUX_DELIVERY_PROGRAMME.md`
- CIPC Desk: `docs/operations/TENANT_CLIENT_LOGIN.md` § CIPC Desk
- Code: `lib/server/anton-decision-inbox.js`
- Tests: `node-tests/anton-decision-inbox.test.mjs`
