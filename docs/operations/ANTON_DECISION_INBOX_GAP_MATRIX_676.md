# Anton Decision Inbox — gap matrix (issue #676)

**Date:** 2026-07-29  
**Inventory commit basis:** `27ad57185da1f4ea0019075c5ed3b9114f73ad7a` (+ this PR)  
**Verdict legend:** DONE (in this PR or already true) · PARTIAL · GAP (needs Anton settings or follow-up) · N/A

| # | Required control | Before | After this PR | Residual |
|---|------------------|--------|---------------|----------|
| A1 | Central GitHub query for `needs:anton` | Label existed; no canonical query/docs | Canonical query + `ANTON_DECISION_INBOX_V1.md` | Bookmark Issues filter (Search API weak on colon labels) |
| A2 | `approval:*` reason labels (9) | Missing | Vocabulary + create defaults in code; workflows can ensure | First ensure run on `main` after merge creates labels |
| A3 | Structured decision packet | Operator review handoff only | `corpflow.anton_decision_packet.v1` + tests | Agents must post packets in practice |
| A4 | Durable approval marker | Checkpoints / Bridge comments only | `corpflow.protected_approval.v1` scoped verifier | Humans must use the marker format |
| A5 | Inbox clears when resolved | Manual label remove | Documented + `isActiveInboxItem` helper | Optional automation to strip label on close (follow-up) |
| B1 | Exception-only Telegram | Operator checkpoints exist; no Decision Inbox dedupe | `anton-decision-notify.js` policy + tests | Wire n8n consumer to call policy (no new platform) |
| B2 | Dedupe / non-blank / link required | Partial in ops-notification-policy | Fingerprint + suppress in Decision Inbox notifier | Persist fingerprints in n8n |
| C1 | No auto-merge for agent PRs | CMP auto-merge is `cmp/*` only | Explicit agent-branch block + workflow guard | Confirm `CMP_AUTO_MERGE` stays off unless intended |
| C2 | Protected `main` + required checks | Rulesets `main-protection` + `Tech_Partner` active; **review count = 0** | Documented | **Anton:** set required approving reviews ≥ 1 |
| C3 | GitHub Environments + required reviewers | `Production` / `Preview` exist; **no protection rules** | Deploy hook job uses `environment: Production` | **Anton:** add required reviewers on Production |
| C4 | Workflow permission minimisation | Mixed | Deploy hook remains read-only contents; gate script local | Broader audit of all workflows = follow-up |
| C5 | Untrusted PR secrets isolation | Convention | Helper + tests; no `pull_request_target` secrets path added | Keep avoiding `pull_request_target` for prod secrets |
| C6 | Deploy requires durable approval | Manual `workflow_dispatch` only | Environment + `check-protected-action-gate.mjs` | Env reviewers still Anton settings |
| C7 | DB/schema separate + blocked | Migrate step inside `test.yml` if `POSTGRES_URL` set | Gate defaults db-schema disabled; docs warn | **Anton:** ensure CI `POSTGRES_URL` is not production |
| C8 | External-send/payment default disabled | No dedicated GHA; AAP prompt gates | Gate default-disabled + tests | Keep no live send workflows |
| C9 | Labels alone ≠ approval | Not encoded | Explicit reject in `evaluateProtectedApproval` | — |
| C10 | Approval audit fields | Partial | Gate `audit` object (approver, action, SHA, env, timestamp, result) | Persist to Actions log / issue comment on real runs |
| D1 | Approval semantics | Prompt-level | Encoded in verifier | — |
| E1 | Lux / CIPC Desk adoption | Scattered | Playbook + tenant login + AAP + Bridge cross-links | Cursor Cloud standing prompts outside repo if any |
| G1 | No second app/DB/paid platform | — | Docs-only + libraries | — |

## Dangerous surfaces noted in inventory

| Surface | Risk | Mitigation in this PR |
|---------|------|------------------------|
| `.github/workflows/cmp-product-automerge.yml` | Could squash-merge `cmp/*` when `CMP_AUTO_MERGE=true` + `client-approved` | Block agent branches; block when `needs:anton` present |
| `.github/workflows/vercel-production-deploy-hook.yml` | Anyone with Actions run rights could POST deploy hook | `environment: Production` + durable approval gate inputs |
| `.github/workflows/test.yml` Prisma migrate | If secret points at prod DB | Documented in operator settings packet — no migrate workflow added |
| Ruleset `main-protection` condition `refs/heads/"main"` | Possible mis-quoted ref | Flagged for Anton to verify in Settings → Rules |

## Acceptance evidence mapping

| Acceptance item | Evidence in this PR |
|-----------------|---------------------|
| 1 Central query | `ANTON_DECISION_INBOX_QUERY` + docs §3 |
| 2 Synthetic merge notify once / clear | `node-tests/anton-decision-notify.test.mjs` + inbox clear test |
| 3 Deploy blocked before approval | `protected-action-gates.test.mjs` + gate CLI + deploy workflow |
| 4 Production workflow without approval blocked | Same + synthetic workflow |
| 5 Agent PR cannot auto-merge | `evaluateAgentAutoMergeGate` + automerge workflow |
| 6 Untrusted PR no prod secrets | `evaluateUntrustedPrSecretsIsolation` tests |
| 7 DB/schema blocked | default-disabled gate tests |
| 8 Messaging/payment/external-send blocked | default-disabled gate tests |
| 9 Audit fields | gate `audit` assertions |
| 10 Telegram exception-only | notify module tests (wiring = n8n follow-up) |
| 11 Lux/CIPC docs updated | playbook + tenant login + AAP + Bridge |
| 12 No second platform | confirmed |
