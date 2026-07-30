# n8n live apply — exception-only Anton alerts (#684)

**Status:** Repo policy + template ready. **Live n8n in-place update** is required to stop the hourly open-PR heartbeat.
**Issue:** [#684](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/684)
**Owner:** Cursor prepares apply-ready artifacts; **live n8n edit** requires secure n8n UI/API access (Anton only if Cursor cannot reach the instance).
**Anchor:** `<!-- N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684 -->`

<!-- N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684 -->

## 1. Target workflow (single control plane)

| Field | Value |
|-------|--------|
| **Canonical template name** | `CorpFlowAI — GitHub Heartbeat Checker (TEMPLATE, INACTIVE, SECRET-FREE)` |
| **Expected live name** | `CorpFlowAI — GitHub Heartbeat Checker` (or the activated copy of the #495/#658 heartbeat notifier) |
| **Workflow id** | **Confirm in n8n UI** (Workflows → open the active heartbeat/notifier → copy numeric/UUID id). Not stored in repo (instance-local). |
| **Rule** | **Update this workflow in place.** Do **not** create a second notifier / second control plane. |

If more than one workflow posts Telegram about open PRs / WIP / review decisions, **disable the open-PR/WIP branch** on each duplicate and keep **one** exception-only path.

## 2. Before / after rule summary

| Rule | Before (#658 WIP/digest paging) | After (#684) |
|------|----------------------------------|--------------|
| Open PR exists | Silent (good) | Silent |
| Open PR ready for routine review | Could surface via WIP / review noise | Silent |
| Open PR count > WIP cap (2) | **Telegram (hourly re-page)** | **Silent** (log only) |
| Green / running CI | Silent | Silent |
| corpflow_test publish | Silent (#679) | Silent |
| Dispatcher digest stale | Telegram (even with `Anton required: no`) | **Silent** (log only) |
| `needs:anton` + decision packet | Design-only / incomplete | **One immediate Telegram** |
| Same fingerprint 1h later | Re-alerted (hour bucket) | **No repeat** |
| Changed SHA / decision type / blocker | New page | One new alert |
| Recoverable failure, auto-recovered | n/a | Silent |
| Recovery failed, Anton required | n/a | One alert |
| Message contract | Heartbeat lines incl. anton yes/no | **Only when Anton required: yes** + workstream, link, why, exact action, recommendation, consequence |

## 3. In-place apply steps (n8n UI — no secrets in chat)

1. Open the live n8n instance (operator vault / known host — **do not paste URL/secrets into GitHub**).
2. Locate the active heartbeat/notifier workflow (§1). Record **name + id** in the evidence block below (names/ids only).
3. **Disable** any branch / IF path that pages on:
   - open PR count / WIP cap;
   - “PR needs review”;
   - digest stale with `Anton required: no`;
   - hour-bucket re-send of unchanged state.
4. Replace the evaluate Code node with the logic from `docs/n8n/templates/github-heartbeat-checker.template.json` node **Evaluate Anton-required exceptions** (or re-import nodes from that template into the **same** workflow).
5. Ensure Telegram node only runs when `should_alert === true` / `alert_count > 0` and message text includes `Anton required: yes`.
6. Keep existing Telegram env refs (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID`) — **no new secrets, no repo `.env` edits**.
7. Save. Keep workflow **active** (exception path stays live; open-PR branch is off).
8. Run synthetic executions (§4). Paste outcomes into §5 (no tokens, no chat ids, no message bodies containing secrets).

## 4. Synthetic execution checklist (required)

Run against the **updated live workflow** (manual execute / pinned test data). Repo unit tests mirror the same matrix:

```bash
node --test node-tests/ops-notification-policy.test.mjs
node --test node-tests/anton-decision-inbox.test.mjs
```

| # | Scenario | Expected Telegram |
|---|----------|-------------------|
| 1 | Open PR only | **None** |
| 2 | Green CI / healthy | **None** |
| 3 | `needs:anton` protected approval + packet | **One** immediate |
| 4 | Same unchanged fingerprint ~1h later | **None** (no repeat) |
| 5 | Changed SHA or new decision type | **One** new |
| 6 | Recoverable failure, autonomous recovery | **None** |
| 7 | Failed recovery requiring Anton | **One** |

## 5. Evidence block (fill after live apply)

```text
n8n workflow name:
n8n workflow id:
Applied at (UTC):
Applied by:
Open-PR/WIP branch disabled: YES/NO
Exception-only Anton path active: YES/NO
Synthetic 1–7 results:
Hourly open-PR alert stopped (observation window): YES/NO / PENDING
Repo unit tests: PASS/FAIL (attach command output summary)
Secrets written to repo/chat: NO
Second notifier created: NO
```

## 6. Access gate

- This Cloud Agent environment has **no n8n API credentials** and must not invent them.
- **ANTON ACTION:** only if secure n8n access is required and Cursor cannot reach the instance. Paste apply is ~10 minutes using §3 + the template JSON.
- Until §5 is filled with live execution evidence, delivery verdict for the **live alert stop** remains **PARTIAL** even if the PR merges.

## 7. Cross-references

- Template: `docs/n8n/templates/github-heartbeat-checker.template.json`
- Policy: `lib/server/ops-notification-policy.js`
- Message helpers: `lib/server/anton-decision-inbox.js`
- Design: `docs/n8n/anton-decision-inbox-exception-notify.md`
- Heartbeat runbook: `docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md`
- Audit: `docs/operations/SLACK_TELEGRAM_DEPENDENCY_AUDIT_658.md`
