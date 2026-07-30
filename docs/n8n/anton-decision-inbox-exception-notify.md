# Anton Decision Inbox — exception-only Telegram notify (n8n)

**Status:** Contract + helpers live in repo; **wired into the existing GitHub Heartbeat Checker template** per [#684](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/684). Do **not** create a second notifier workflow. Live n8n must be updated in place — see `docs/runbooks/N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684.md`.

**Route:** Existing approved non-Slack path — **n8n → Telegram** (same family as `corpflow.ops_alert.v1` / operator checkpoints). Do not reintroduce Slack.

**Canonical inbox:** `docs/operations/ANTON_DECISION_INBOX_V1.md`

## 1. When to notify

| Event | Notify? |
|-------|---------|
| New open item with `needs:anton` + decision packet | Yes (once) |
| Material change to decision packet / approval type / target SHA | Yes (new fingerprint) |
| Approval deadline / escalation threshold reached | Yes |
| Previously approved protected action failed; new decision needed | Yes |
| Autonomous recovery failed and Anton is required | Yes |
| Routine GitHub comments, CI progress, label noise | **No** |
| Open PR / WIP cap alone / green CI / corpflow_test publish | **No** (#684) |
| Unchanged re-scan of same fingerprint (including next hour) | **No** |
| Blank / incomplete message | **No** |
| Recoverable failure that auto-recovered | **No** |

## 2. Deduplication

Fingerprint:

```text
needs_anton|<issue_or_pr>|<approval_type>|<evidence_fingerprint>|<blocker_state>
```

Helpers:

- `lib/server/anton-decision-inbox.js` — `buildExceptionNotifyFingerprint`, `shouldSendExceptionNotification`, `formatExceptionNotifyMessage`
- `lib/server/ops-notification-policy.js` — `buildHeartbeatAlertFingerprint`, `filterHeartbeatAlertsByFingerprintDedupe`, `shouldPageHeartbeatAlert`

Persist fingerprints in n8n static data (`exceptionFingerprints`). Suppress until fingerprint changes. **Do not** re-alert solely because an hour bucket rolled.

## 3. Message shape (required fields — #684)

```text
ANTON DECISION INBOX
Anton required: yes
Workstream: <project_workstream>
Issue/PR: <#n or PR #n>
Link: <https://github.com/... direct link>
Why needed now: <why>
Exact action: <exact action required>
Recommendation: <recommendation>
Consequence of delay: <consequence>
Urgency: <P0|P1|…>
```

**Forbidden:** secrets, tokens, private client data, payment card data, full env dumps.

## 4. n8n flow (same workflow as heartbeat — update in place)

1. **Trigger:** schedule every 15 minutes (backstop). Optional later: GitHub webhook for `needs:anton` labels.
2. **Fetch** open issues (filter `needs:anton` client-side for colon labels). Open PRs are fetched for **log only**.
3. **Parse** latest `### ANTON DECISION PACKET`; skip if missing required fields.
4. **Skip** if `### ANTON DECISION RESOLVED` present for that approval type, or label removed.
5. **Build fingerprint**; if seen → exit silent.
6. **Format message** with #684 contract; if invalid/blank → exit silent.
7. **Send Telegram** via existing bot/chat secrets already used for ops alerts.
8. **Store fingerprint**.

Template: `docs/n8n/templates/github-heartbeat-checker.template.json`.

## 5. Activation / live apply

1. Merge repo policy + template (#684 PR).
2. Apply in-place to the **existing** live heartbeat workflow (`N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684.md`).
3. Run synthetic matrix 1–7; confirm hourly open-PR alert has stopped.
4. No new paid SaaS. No secrets in committed JSON.

## 6. Cross-references

- Live apply: `docs/runbooks/N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684.md`
- Heartbeat runbook: `docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md`
- Telegram posture: `docs/operations/SLACK_TELEGRAM_DEPENDENCY_AUDIT_658.md`
- Wiring packet: `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md`
- Forward recipe: `docs/n8n/automation-forward-recipe.md`
