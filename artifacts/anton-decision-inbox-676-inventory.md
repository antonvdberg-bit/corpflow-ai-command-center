# Inventory evidence — Anton Decision Inbox / protected gates (#676)

**Captured:** 2026-07-29 (Cloud Agent, branch `cursor/dispatcher-issue-676-9b4f`)

**Method:** `gh label list`, `gh api` rulesets + environments, workflow file scan, docs grep. No secret values read or printed.

## Labels

- Present before change: `needs:anton` (and many unrelated labels).
- Missing before change: all nine `approval:*` reason labels.
- Remediation: auto-ensure via dispatch lifecycle label ensure + `DECISION_INBOX_LABELS`.

## Rulesets

- `main-protection` (id 14907391): active; PR required; required checks `cmp-delivery-files`, `test`, `vercel-env`; **required_approving_review_count: 0**; ref include observed as `refs/heads/"main"`.
- `Tech_Partner` (id 14726244): active on default branch; review count 0; required check `vercel-env`.

## Environments

- `Production`, `Preview` exist.
- Both: `protection_rules: []`, `can_admins_bypass: true`.

## Workflows of interest

| Workflow | Notes |
|----------|-------|
| `cmp-product-automerge.yml` | Only auto-merge surface; requires `CMP_AUTO_MERGE=true` + `cmp/*` + `client-approved` |
| `vercel-production-deploy-hook.yml` | Manual deploy hook; hardened in #676 packet |
| `protected-action-gates-verify.yml` | Synthetic verify (added) |
| No `pull_request_target` | Confirmed absent |

## Notification route

- Slack retired (#658).
- Telegram via n8n / control-loop / ops-alerts remains the exception path.
- Decision Inbox exception notify: design-only until activated (`docs/n8n/anton-decision-inbox-exception-notify.md`).

## Gap matrix

See `docs/operations/PROTECTED_ACTION_GATES_V1.md` §2–§3.

## Governance during capture

No production deploy, no env/secret changes, no DB/schema, no live sends, no auto-merge.
