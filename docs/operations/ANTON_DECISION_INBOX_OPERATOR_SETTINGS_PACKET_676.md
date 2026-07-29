# Operator decision packet — repository settings for Decision Inbox (#676)

**Status:** AWAITING_OPERATOR (settings only — not applied by Cursor)  
**Date:** 2026-07-29  
**Executor:** Cursor (docs/code PR only)  
**ANTON ACTION:** Apply the repository settings below in GitHub (and confirm Vercel/CI secrets posture). Do **not** treat merge of the code PR as completing these settings.

---

## Anton decision packet

**Project / workstream:** CorpFlowAI control plane / Decision Inbox (#676)  
**Business outcome:** Protected consequential actions cannot run without Anton’s durable approval; Anton has one inbox.  
**Exact decision required:** Approve and apply the repository-setting changes listed in § Recommended clicks (or reject/defer with notes).  
**Recommended decision:** Approve settings A–E below after the code PR is merged (or in parallel).  
**Consequence of approve:** Production Environment requires your review; agent PRs stay non-auto-merge; deploy hook cannot fire silently.  
**Consequence of reject/defer:** In-repo gates still block without durable markers, but GitHub Environment / branch review gaps remain (admin bypass / review count 0).  
**Evidence links:** Gap matrix `docs/operations/ANTON_DECISION_INBOX_GAP_MATRIX_676.md`; this PR; issue #676.  
**Expiry / urgency:** P0 — before treating autonomous delivery as default across Lux / CIPC Desk.

---

## Recommended clicks (GitHub UI)

### A. Create / verify Decision Inbox labels

If not already created by workflow ensure on `main`:

- `needs:anton` (exists)
- `approval:merge`, `approval:deploy`, `approval:production`, `approval:db-schema`, `approval:env-secrets`, `approval:external-send`, `approval:payment`, `approval:paid-tool`, `approval:public-launch`

### B. Production Environment protection

**Settings → Environments → Production**

1. Add **Required reviewers:** Anton (`antonvdberg-bit`) — at least one.
2. Optionally restrict deployment branches to `main` only.
3. Leave `Preview` without production secrets.

### C. Branch ruleset / protection

**Settings → Rules → `main-protection` (and `Tech_Partner`)**

1. Verify the branch include pattern actually matches `main` (inventory saw `refs/heads/"main"` with quotes — confirm this is intentional/effective).
2. Set **Required approving review count** to **≥ 1** (today: **0**).
3. Keep required checks: `test`, `vercel-env`, `cmp-delivery-files` (as today).
4. Do **not** grant bots bypass for production merges.

### D. Variables / auto-merge

1. Confirm repo variable `CMP_AUTO_MERGE` is **not** `true` unless you explicitly want CMP product auto-merge for `cmp/*` + `client-approved` only.
2. Agent branches (`cursor/*`, `codex/*`) remain blocked by code regardless.

### E. Secrets posture

1. Confirm CI `POSTGRES_URL` (if set for Agent CI) is **not** the production Neon URL — migrate deploy in `test.yml` must never hit prod.
2. Do not grant untrusted/fork PR workflows production secrets (no new `pull_request_target` with prod secrets).
3. `VERCEL_DEPLOY_HOOK_URL` remains an Actions secret; deploy workflow now also requires Environment approval + durable marker.

### F. n8n exception notifier (after code merge)

1. Keep using existing `CORPFLOW_AUTOMATION_FORWARD_URL` → Telegram path.
2. Add / adjust a thin workflow that evaluates `corpflow.anton_decision_notify.v1` policy (dedupe fingerprints) — **do not** mirror all GitHub events.
3. No Slack. No paid notifier platform.

---

## Explicit non-actions for Cursor (this packet)

- No production deployment.
- No env/secret value changes.
- No DB/schema changes.
- No live messaging, payments, outreach, or public launch.
- No auto-merge of this PR.

---

## After settings applied

Record on issue #676 or #249:

```text
### Protected approval — <ISO time>

**Approver:** Anton
**Decision:** approve
**Action:** production
**Issue:** #676
**PR:** #<this PR>
**Target SHA:** <merge SHA>
**Environment:** production
**Valid until:** none
**Source:** github

<!-- corpflow.protected_approval.v1 {"schema":"corpflow.protected_approval.v1","approver":"Anton","decision":"approve","action":"production","issueNumber":676,"prNumber":null,"targetSha":"<sha>","environment":"production","validUntil":null,"recordedAt":"<ISO>","source":"github"} -->
```

Only use that marker when authorizing a **specific** protected action — not as a blanket unlock for all future work.
