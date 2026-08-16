# N8N SLACK LIVE INTERROGATION — #658 (refresh during exception-route run)

**Status:** refreshed live inventory during `EXCEPTION_ROUTE_VALIDATION_2026-08-17`  
**Cursor cloud run ID:** `bc-f9563604-6164-4415-8390-e897c0211c86`  
**n8n MCP status:** PASS

## What was inspected

All MCP-accessible workflows (9), all credentials (7), historical Slack WF `6RkDerWf2Xj5EfCY`, Slack credential type query, executions after 2026-07-03 where queryable.

## Slack-related workflow inventory

| workflow name / ID | active/published | trigger/source | Slack node/action | destination | parallel notification/action | last relevant execution | classification |
|---|---|---|---|---|---|---|---|
| `CorpFlowAI — GitHub to Slack Dispatcher v1` / `6RkDerWf2Xj5EfCY` | **ARCHIVED** (MCP: cannot access) | historically webhook/GitHub→Slack (prior evidence) | historically 3× send-message | historically `#corpflow-alerts`, `#corpflow-control`, `#corpflow-dispatch` | GitHub remains durable SoT; Telegram is exception route | none queryable (archived) | **RETIRED / INACTIVE** |

No other accessible workflow contains Slack nodes, Slack webhooks, Slack credential refs, or channel refs to `corpflow-dispatch` / `corpflow-alerts` / `corpflow-control`.

## Execution evidence after 2026-07-03

- Archived Slack WF: query returns archived/cannot-access; no post-2026-07-03 Slack executions visible via MCP.
- Exception-route validation runs `6861`/`6862` on `cPgzIQIm4ztU8sQQ`: **0 Slack nodes**.

## Credential-reference evidence

- Slack credentials present: **NO**
- Telegram credential present: `Telegram account` / `telegramApi` / `FR3tMaFXtAHXsjW7` (used by exception route; not Slack)

## Slack read-path present

**NO**

## Unique dependencies found

**NO**

## Revenue/client/tenant/production dependency found

**NO** (Slack)

## What Slack actually does today

Nothing operational in live n8n: Slack dispatcher archived; Slack credentials absent; active exception alerting is Telegram + GitHub durable records.

## What would break if Slack were removed

Nothing additional in n8n beyond already-archived Slack dispatcher cleanup. Operator exception paging depends on Telegram (`cPgzIQIm4ztU8sQQ` and related monitors), not Slack.

## Safe removal sequence

1. Confirm archived Slack WF remains archived (done).
2. Confirm Slack credentials remain absent (done).
3. Optional Anton-approved cleanup of any residual archived Slack WF / docs pointers — separate protected action.
4. Keep Telegram exception path + GitHub SoT.

## Rollback

Re-import/reactivate archived Slack dispatcher + recreate Slack OAuth credential only if Anton explicitly re-authorizes Slack (not recommended).

## Protected action required next

**YES** — for exception-route exactly-once proof only (see `EXCEPTION_ROUTE_VALIDATION_2026-08-17.md`), not for Slack dependency.

## Exact next protected action, if any

Prove duplicate suppression on the live HTTP production webhook path for `cPgzIQIm4ztU8sQQ` (MCP path failed to demonstrate staticData dedupe).

---

`N8N SLACK DEPENDENCY PROOF COMPLETE — NO UNIQUE N8N DEPENDENCY FOUND`
