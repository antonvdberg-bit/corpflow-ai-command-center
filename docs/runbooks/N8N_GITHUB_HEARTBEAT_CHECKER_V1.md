# n8n GitHub Heartbeat Checker v1 — runbook (exception-only / #684)

**Status:** Template + policy updated for **Anton-required exception-only** paging ([#684](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/684)). Live n8n must be updated **in place** per `docs/runbooks/N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684.md`.
**Owner:** Anton (operator) for live n8n apply when Cursor lacks instance access; Cursor for repo policy/template/tests.
**Created:** 2026-06-30 · **Updated:** 2026-07-30 (#684).
**Implements:** [#495](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/495) Stage 0/1; supersedes WIP/digest Telegram paging from [#658](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/658) for this workflow.
**Anchor sentinel:** `<!-- N8N_GITHUB_HEARTBEAT_CHECKER_V1 -->`

<!-- N8N_GITHUB_HEARTBEAT_CHECKER_V1 -->

## 0. What this is (and is not)

A scheduled, **internal** notifier that watches CorpFlowAI GitHub state and **alerts only when Anton is genuinely required now**. It exists to stop silent stalls on protected decisions — not to remind Anton that PRs exist.

It is **not** a customer-facing surface, not an outreach tool, and not an autonomous executor. It never merges, deploys, sends customer messages, writes the DB, or executes code.

**#684 hard rule:** Do **not** create a second notifier workflow. Change the existing live heartbeat/notifier **in place**.

| Stage | What | Authorization |
|---|---|---|
| **0/1** | Docs + secret-free template + policy helpers | repo PR |
| **Live apply** | Disable open-PR/WIP branch on the active n8n workflow; enable Anton-required path | secure n8n access (see live-apply runbook) |
| **Evidence** | Synthetic executions 1–7 + confirmation hourly open-PR alert stopped | after live apply |

## 1. Sources (read-only)

| # | Source | Used for |
|---|---|---|
| 1 | Open issues/PRs with `needs:anton` + `### ANTON DECISION PACKET` | **Telegram** when Anton required |
| 2 | Recovery / supervisor failure signals (when supplied) | **Telegram** only if recovery failed and Anton required |
| 3 | Open PRs | **Log only** — never page for existence, routine review, or WIP cap alone |
| 4 | Dispatcher digest on #493/#249 | **Log only** — stale digest does not page without Anton |

**Environment note (#679):** `corpflow_test` publish is never an exception by itself.

## 2. When Telegram may fire

Allowed instant alerts:

- explicit protected-action approval needed (`needs:anton` + decision packet);
- exact merge/review decision that cannot proceed autonomously;
- material blocker after autonomous recovery failed;
- failed workflow requiring operator intervention;
- client deadline/escalation requiring Anton;
- security, data, cost, or delivery risk requiring immediate decision.

Must **not** alert merely because:

- a PR is open / ready for routine review;
- CI is running or green;
- a branch or commit exists / work is active;
- a CorpFlowAI `corpflow_test` publish occurred;
- nothing changed;
- open PR count exceeds a generic WIP cap without a real Anton decision.

## 3. Severity / paging matrix

| Condition | Severity | Pages Telegram? |
|---|---|---|
| `needs:anton` + valid decision packet | error | **yes** (once per fingerprint) |
| Recovery failed, Anton required | error | **yes** (once per fingerprint) |
| Recoverable failure, auto-recovered | info | **no** |
| Open-PR count over WIP cap | warning | **no** (#684) |
| Dispatcher digest stale | warning | **no** (#684) |
| Open PR / green CI / active work | info | **no** |
| Everything healthy | info | **no** (silent success) |

Canonical code: `lib/server/ops-notification-policy.js` (`evaluateGithubHeartbeatSignals`, `shouldPageHeartbeatAlert`, `filterHeartbeatAlertsByFingerprintDedupe`).

## 4. Telegram message contract (#684)

Send **only** when `Anton required: yes`:

```text
ANTON DECISION INBOX
Anton required: yes
Workstream: <workstream>
Issue/PR: <#n or PR #n>
Link: <https://github.com/... direct link>
Why needed now: <one line>
Exact action: <exact required action>
Recommendation: <recommendation>
Consequence of delay: <consequence>
Urgency: <P0|P1|…>
```

Helpers: `formatExceptionNotifyMessage` in `lib/server/anton-decision-inbox.js`.

## 5. Dedupe / noise-control

- **Dedupe key:** `kind` × `issue/PR` × `decision type` × `SHA/evidence` × `blocker state` (fingerprint).
- Unchanged fingerprints **do not** re-alert when the hour rolls (fixes the hourly open-PR heartbeat).
- Changed SHA, decision type, or blocker state → new fingerprint → one new alert.
- Resolution is silent (no “recovered” ping in v1).
- **Schedule:** every **15 minutes** as a backstop (near-instant); webhook optional later. Prefer quieter over spam.

## 6. Fallback manual check (no n8n)

1. `gh issue list --state open --label needs:anton` — any item without durable approval?
2. Confirm each has `### ANTON DECISION PACKET` and is not resolved.
3. Ignore open PR count / WIP for Telegram purposes.
4. If a protected decision is waiting, that is the only page-worthy case.

## 7. Live apply

See **`docs/runbooks/N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684.md`** for workflow name/id confirmation, before/after rules, synthetic tests 1–7, and evidence block.

## 8. Boundaries

- Internal monitoring only — no customer/prospect/client-facing messages.
- No WhatsApp/SMS/email runtime. No payment. No external outreach.
- No production DB/schema changes. No new paid tool.
- No secrets in repo/docs/logs; no `.env.template` edits for this change.
- No second notifier workflow.

## 9. Cross-references

- `docs/runbooks/N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684.md` — live in-place apply + evidence.
- `docs/n8n/templates/github-heartbeat-checker.template.json` — secret-free template (same workflow identity).
- `docs/n8n/anton-decision-inbox-exception-notify.md` — Decision Inbox notify contract.
- `docs/operations/ANTON_DECISION_INBOX_V1.md` — inbox labels + packets.
- `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md` — Telegram path.
- `docs/operations/SLACK_TELEGRAM_DEPENDENCY_AUDIT_658.md` — exception-only audit (updated for #684).

## 10. Status block

- **Repo:** policy + template + unit synthetic matrix for #684.
- **Live n8n:** apply via live-apply runbook; until evidence filled, hourly open-PR stop is **PARTIAL**.
- **Verdict:** PARTIAL until live synthetic 1–7 + confirmation hourly open-PR alert has stopped.
