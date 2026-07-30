# #684 synthetic evidence (repo unit matrix)

**Date:** 2026-07-30  
**Branch:** `cursor/dispatcher-issue-684-d12a`  
**Command:** `node --test node-tests/ops-notification-policy.test.mjs node-tests/anton-decision-inbox.test.mjs`  
**Result:** 32 pass / 0 fail

## Workflow identity (repo)

| Field | Value |
|-------|--------|
| Template / canonical name | `CorpFlowAI — GitHub Heartbeat Checker (TEMPLATE, INACTIVE, SECRET-FREE)` |
| Expected live name | `CorpFlowAI — GitHub Heartbeat Checker` |
| Live workflow id | **Confirm in n8n UI** — not available in this Cloud Agent environment (no n8n credentials) |

## Before → after (summary)

- **Before:** `wip_cap` + `digest_stale` paged Telegram; hour-bucket dedupe re-alerted unchanged state hourly.
- **After:** Telegram only when `Anton required: yes` (`needs:anton` / failed recovery); WIP + digest log-only; fingerprint dedupe (no hourly repeat).

## Synthetic matrix (repo)

| # | Scenario | Telegram | Evidence |
|---|----------|----------|----------|
| 1 | open PR only | none | `1. open PR only → no Telegram` PASS |
| 2 | green CI / healthy | none | `2. green CI / healthy state → no Telegram` PASS |
| 3 | `needs:anton` protected approval | one | `3. needs:anton protected approval → one immediate Telegram` PASS |
| 4 | same fingerprint +1h | none | `4. same unchanged condition one hour later → no repeat` PASS |
| 5 | changed SHA | one new | `5. changed SHA or new decision → one new alert` PASS |
| 6 | recoverable failure | none | `6. recoverable failure → autonomous recovery, no alert` PASS |
| 7 | failed recovery needing Anton | one | `7. failed recovery requiring Anton → one alert` PASS |

## Live n8n confirmation

| Check | Status |
|-------|--------|
| Open-PR/WIP branch disabled in live n8n | **PENDING** — requires secure n8n access (see `docs/runbooks/N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684.md`) |
| Exception-only path active in live n8n | **PENDING** |
| Hourly open-PR alert stopped (observation) | **PENDING** |

**Delivery Reality:** Repo synthetic matrix COMPLETE. Live hourly-alert stop PARTIAL until in-place n8n apply + §5 evidence filled. No second workflow created. No secrets in repo.
