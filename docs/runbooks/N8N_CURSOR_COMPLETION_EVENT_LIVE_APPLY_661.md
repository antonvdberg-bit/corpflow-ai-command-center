# n8n live apply — Cursor completion event notifier (#661)

**Status:** Repo contract + gate helpers ready. **Live n8n in-place update requires Anton approval.**  
**Controller:** [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661)  
**Reuse:** Existing exception-only heartbeat / Decision Inbox workflow — **do not create a second notifier.**  
**Anchor:** `<!-- N8N_CURSOR_COMPLETION_EVENT_LIVE_APPLY_661 -->`

<!-- N8N_CURSOR_COMPLETION_EVENT_LIVE_APPLY_661 -->

## 1. Target workflow (single control plane)

| Field | Value |
|-------|--------|
| **Canonical template name** | `CorpFlowAI — GitHub Heartbeat Checker (TEMPLATE, INACTIVE, SECRET-FREE)` |
| **Expected live name** | `CorpFlowAI — GitHub Heartbeat Checker` (same activated copy as #684 / #495 / #658) |
| **Workflow id** | **Confirm in n8n UI** (Workflows → open the active heartbeat/notifier → copy id). Not stored in repo. |
| **Node to modify** | **`Evaluate Anton-required exceptions`** (Code node) — extend input parsing; keep Telegram only when `should_alert === true` |
| **Rule** | **Update this workflow in place.** Do **not** create another workflow / second control plane. |

Related live-apply runbook for the same workflow: `docs/runbooks/N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684.md`.

## 2. Event contract (repo → GitHub → n8n)

Durable GitHub issue comment marker:

```text
corpflow.cursor_completion_event.v1
```

Human header: `CURSOR COMPLETION EVENT`

Relevant fields (JSON in HTML comment):

| Field | Use |
|-------|-----|
| `source_issue` | Issue key |
| `executor` | `cursor` (future: codex) |
| `agent_run_id` / `cursor_agent_id` | Attempt / run |
| `status` | RUNNING / COMPLETED / FAILED / STALE |
| `branch` | Branch name |
| `pr` / `pr_url` | PR number / URL |
| `sha` | Head SHA |
| `ci_check_result` | Checks summary |
| `blocker` | Named blocker |
| `next_action` | Exact next step |
| `anton_required` | boolean |
| `notify` | Repo hint (`true` when Anton or FAILED/STALE) |
| `fingerprint` | Dedupe key |

Repo gate helper (mirror in n8n Code node):

- `lib/server/cursor-agent-lifecycle.js` → `shouldNotifyCursorCompletionEvent()`
- Fingerprint: `buildCompletionFingerprint()` — source issue + executor + agent/run + terminal status + PR + SHA + CI + branch

## 3. Current vs proposed behaviour

| Signal | Current (#684 exception-only) | Proposed (same workflow + Cursor events) |
|--------|-------------------------------|------------------------------------------|
| RUNNING / PENDING | Silent | **Silent** |
| COMPLETED + `anton_required=no` | n/a | **Silent** by default (optional one-shot “delivery complete” only if Anton later enables a separate quiet info path — **not** in first apply) |
| COMPLETED + `anton_required=yes` | n/a | **One immediate Telegram** |
| FAILED after recovery exhausted | n/a | **One immediate Telegram** |
| STALE after automatic follow-up fails | n/a | **One immediate Telegram** |
| Unchanged fingerprint re-poll | Silent | **Silent** (no repeat) |
| Open PR / WIP alone | Silent | Silent (unchanged) |

## 4. Exact in-place change (when Anton approves)

1. Open live n8n → workflow in §1. Record **name + id**.
2. In **`Evaluate Anton-required exceptions`**, after existing `needs:anton` packet scan:
   - Fetch recent comments on claimed / operator-review issues (or parse comments already loaded if the workflow already lists issue comments).
   - Detect `<!-- corpflow.cursor_completion_event.v1 {...} -->`.
   - Parse JSON; apply `shouldNotifyCursorCompletionEvent` rules above.
   - Build fingerprint = event.`fingerprint` (or rebuild identically).
   - If seen in `staticData.exceptionFingerprints` → skip.
   - If should notify → append one alert with `anton: true`, workstream `cursor-control-loop`, link to issue/PR, why = status + blocker, exact action = `next_action`.
3. Keep Telegram node gated on `should_alert === true` / `alert_count > 0`.
4. **No new secrets.** Reuse existing Telegram env refs.
5. Save. Keep workflow **active**.
6. Run synthetic matrix (§5). Fill evidence (§6).

## 5. Synthetic test plan (before/after live apply)

Repo unit tests (authorised now):

```bash
node --test node-tests/cursor-agent-lifecycle.test.mjs
node --test node-tests/ops-notification-policy.test.mjs
```

| # | Scenario | Expected Telegram |
|---|----------|-------------------|
| 1 | RUNNING event | None |
| 2 | COMPLETED + anton_required=no | None |
| 3 | COMPLETED + anton_required=yes | One |
| 4 | FAILED (recovery exhausted) | One |
| 5 | STALE (follow-up failed) | One |
| 6 | Same fingerprint again | None |
| 7 | Changed SHA / PR / check state | One new |

## 6. Rollback

1. Revert the Code node to the pre-change `#684` evaluate script (or re-import from `docs/n8n/templates/github-heartbeat-checker.template.json` without Cursor completion parsing).
2. Clear any new fingerprint keys under `exceptionFingerprints` that start with `cursor_lifecycle|` if needed.
3. Save + keep workflow active (exception-only Decision Inbox path remains).
4. Repo remains the source of truth for events even if n8n is rolled back (comments still durable).

## 7. Evidence block (fill after Anton-approved live apply)

```text
n8n workflow name:
n8n workflow id:
Node modified: Evaluate Anton-required exceptions
Applied at (UTC):
Applied by:
Cursor completion path active: YES/NO
Synthetic matrix 1–7:
Rollback verified: YES/NO / not run
```

## 8. Stop condition

**READY — N8N LIVE CHANGE REQUIRES ANTON APPROVAL**

Do not edit the live n8n workflow until Anton explicitly approves this runtime change.
