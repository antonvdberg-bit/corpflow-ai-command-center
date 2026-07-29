# Protected Action Gates v1 — enforceable controls + gap matrix

**Status:** Canonical companion to [#676](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/676) and `ANTON_DECISION_INBOX_V1.md`.

**Principle:** Prompts are advisory. **GitHub and runtime controls must be authoritative.**

**Anchor sentinel:** `<!-- PROTECTED_ACTION_GATES_V1 -->`

<!-- PROTECTED_ACTION_GATES_V1 -->

## 1. Protected actions (agents must not independently perform)

| Action | Decision Inbox reason label |
|--------|----------------------------|
| Production deployment | `approval:deploy` / `approval:production` |
| Production env or secret changes | `approval:env-secrets` |
| Database / schema migrations | `approval:db-schema` |
| Payment actions | `approval:payment` |
| Live WhatsApp / SMS / email send | `approval:external-send` |
| External outreach | `approval:external-send` |
| Paid vendor / tool activation | `approval:paid-tool` |
| Public client-facing launch | `approval:public-launch` |
| Merge to `main` (agent PRs) | `approval:merge` |

## 2. Inventory snapshot (2026-07-29)

| Control | Current state | Gap vs #676 |
|---------|---------------|-------------|
| Label `needs:anton` | Exists | — |
| Labels `approval:*` (9) | **Missing** before this packet | Auto-ensure via dispatcher / CI label ensure |
| Branch ruleset `main-protection` | PR required; checks `test`, `vercel-env`, `cmp-delivery-files`; **required_approving_review_count = 0** | Human review count still 0 — Anton settings packet |
| Ruleset branch filter | `refs/heads/"main"` (quoted) observed via API | Verify/fix filter to `refs/heads/main` — Anton settings |
| GitHub Environments `Production` / `Preview` | Exist; **no protection rules**; `can_admins_bypass: true` | Required reviewers — Anton settings |
| `cmp-product-automerge.yml` | Off unless `CMP_AUTO_MERGE=true`; `cmp/*` + `client-approved` only | Keep **off** for agent PRs; never enable for `cursor/*` / `codex/*` |
| `vercel-production-deploy-hook.yml` | Manual `workflow_dispatch`; secret hook; **no** durable-approval check; **no** environment gate | Hardened in this packet (env + approval gate); Environment reviewers still Anton settings |
| PR secrets exposure | No `pull_request_target` found; fork PRs skip when secrets unset | Document standard; keep no `pull_request_target` |
| DB/schema workflows | No dedicated migrate-prod workflow | Policy + synthetic block helpers; any future workflow must be separate + gated |
| External-send / payment workflows | Default disabled in policy; communications require approval | Synthetic gate helpers; live send remains off |
| Durable approval audit | Free-text #249 decisions | Structured `### ANTON DURABLE APPROVAL` + `buildApprovalAuditRecord()` |
| Exception notify for Decision Inbox | Telegram exists for monitors/checkpoints | Design doc only until n8n activation approved |
| Operator Bridge #249 | Live coordination | Reused — no second control plane |

## 3. Required enforcement layers (checklist)

| # | Requirement | Repo-enforced in this packet? | Anton UI / later? |
|---|-------------|-------------------------------|-------------------|
| 1 | No auto-merge for agent PRs | Yes — automerge limited to `cmp/*` + var off; CI supervisor forbids auto-merge | Keep `CMP_AUTO_MERGE` unset |
| 2 | Protected `main` + human merge authority | Partial — PR + checks required | Raise review count ≥ 1; fix ruleset ref if needed |
| 3 | Environments with required reviewers | Workflow references `environment: Production` on deploy hook | Add required reviewers; disable admin bypass if desired |
| 4 | Workflow permission minimisation | Deploy hook tightened to `contents: read` | Ongoing audit |
| 5 | Secrets isolation for untrusted/agent PRs | Documented; no `pull_request_target` | Confirm Actions secrets not exposed to forks |
| 6 | Deploy requires durable approval + env approval | Deploy hook checks durable approval marker input / fails closed without it | Environment approval in UI |
| 7 | DB/schema separate + blocked without approval | Synthetic gate + policy | No migrate-prod workflow without packet |
| 8 | External-send/payment default disabled | Synthetic gate + policy | No live send activation |
| 9 | No bypass by labels alone | `evaluateProtectedActionGate` ignores labels | — |
| 10 | Audit evidence | `buildApprovalAuditRecord` fields | Persist in issue comment / #249 |

## 4. Approval semantics (authoritative)

See `ANTON_DECISION_INBOX_V1.md` §4. Runtime / workflow code must call `evaluateProtectedActionGate()` (or equivalent) before protected effects.

**Labels never unlock.** Green CI never unlocks. Merge alone must not silently deploy protected surfaces unless current operator policy explicitly says so **and** durable approval + environment approval are present.

## 5. Synthetic verification (non-production)

Unit tests in `node-tests/anton-decision-inbox.test.mjs` prove:

1. Decision packet + durable approval parse;
2. Deploy / DB / external-send / payment **blocked** without durable approval;
3. Exception notify dedupe + nonblank + GitHub link;
4. Audit record fields;
5. #676-style doctrine issues are **not** false-positive `payment` gates for dispatch claim.

Dry-run workflow: `.github/workflows/protected-action-gates-verify.yml` (manual / PR check — **no** deploy, **no** secrets required for the synthetic job).

## 6. Explicit non-actions (this implementation)

- No production deployment.
- No env / secret value changes.
- No DB/schema migrations.
- No live messaging, payments, outreach, or public launch.
- No paid tools.
- No auto-merge enablement.
- No second app / database / paid platform.

## 7. Cross-references

- Decision Inbox: `docs/operations/ANTON_DECISION_INBOX_V1.md`
- Operator settings packet: `docs/operations/ANTON_DECISION_INBOX_OPERATOR_SETTINGS_PACKET.md`
- Autonomous policy: `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- Automerge workflow: `.github/workflows/cmp-product-automerge.yml`
- Deploy hook: `.github/workflows/vercel-production-deploy-hook.yml`
