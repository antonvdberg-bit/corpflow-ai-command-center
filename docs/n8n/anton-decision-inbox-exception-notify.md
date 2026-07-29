# Anton Decision Inbox — exception-only Telegram notify (n8n design)

**Status:** Design + inactive contract for [#676](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/676). **Not live.** Activation requires explicit Anton approval after the Decision Inbox PR merges.

**Route:** Existing approved non-Slack path — **n8n → Telegram** (same family as `corpflow.ops_alert.v1` / operator checkpoints). Do not reintroduce Slack.

**Canonical inbox:** `docs/operations/ANTON_DECISION_INBOX_V1.md`

## 1. When to notify

| Event | Notify? |
|-------|---------|
| New open item with `needs:anton` + decision packet | Yes (once) |
| Material change to decision packet / approval type / target SHA | Yes (new fingerprint) |
| Approval deadline / escalation threshold reached | Yes |
| Previously approved protected action failed; new decision needed | Yes |
| Routine GitHub comments, CI progress, label noise | **No** |
| Unchanged re-scan of same fingerprint | **No** |
| Blank / incomplete message | **No** |

## 2. Deduplication

Fingerprint:

```text
needs_anton|<issue_or_pr>|<approval_type>|<evidence_fingerprint>
```

Helpers in `lib/server/anton-decision-inbox.js`:

- `buildExceptionNotifyFingerprint`
- `shouldSendExceptionNotification`
- `formatExceptionNotifyMessage`

Persist fingerprints in n8n static data / Data Store (or equivalent). Suppress until fingerprint changes. Rate-limit bursts (recommend ≤ 1 alert per fingerprint per 15 minutes even if logic bugs).

## 3. Message shape (required fields)

```text
ANTON DECISION INBOX
Project: <project_workstream>
Issue/PR: <#n or PR #n>
Action: <exact action required>
Urgency: <P0|P1|…>
Link: <https://github.com/... direct link>
```

**Forbidden:** secrets, tokens, private client data, payment card data, full env dumps.

## 4. Suggested n8n flow (inactive until approved)

1. **Trigger:** schedule (e.g. every 15–30 min) **or** GitHub webhook for `issues`/`pull_request` labelled `needs:anton` (prefer webhook + schedule backstop).
2. **Fetch** open issues/PRs with `needs:anton` (Issues API + client-side label filter for colon labels).
3. **Parse** latest `### ANTON DECISION PACKET`; skip if missing required fields.
4. **Skip** if `### ANTON DECISION RESOLVED` present for that approval type, or label removed.
5. **Build fingerprint**; if seen → exit silent.
6. **Format message**; if invalid/blank → exit silent (optionally log internally).
7. **Send Telegram** via existing bot/chat secrets already used for ops alerts.
8. **Store fingerprint**.

Do **not** create a new paid SaaS. Do **not** store secrets in the workflow JSON committed to git.

## 5. Activation gate

Before enabling in production n8n:

1. Decision Inbox docs + helpers merged.
2. Anton durable approval for notifier activation (treat as `approval:production` or ops change — operator packet).
3. One synthetic issue: appears once, notifies once, clears after resolution, no repeat.

## 6. Cross-references

- Telegram posture: `docs/operations/SLACK_TELEGRAM_DEPENDENCY_AUDIT_658.md`
- Wiring packet: `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md`
- Forward recipe: `docs/n8n/automation-forward-recipe.md`
