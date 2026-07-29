# Anton Decision Inbox — operator settings packet (repository UI)

**Status:** Decision packet for Anton. **Cannot be completed by Cursor code alone.**

**Issue:** [#676](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/676)

**Related PR:** this packet ships with the Decision Inbox implementation PR (docs + helpers + gate hardening).

---

### ANTON DECISION PACKET

- project_workstream: CorpFlowAI operations / Decision Inbox + protected-action gates
- business_outcome: Anton has one inbox for genuine decisions, and agents cannot independently perform protected consequential actions
- exact_decision_required: Apply the repository-setting rows below (or explicitly defer with reason). Separately merge the implementation PR when CI is green — merge is `approval:merge`, not automatic from this packet alone.
- recommended_decision: Approve settings A–E now; defer n8n live activation (F) until after merge + one synthetic notify dry-run
- consequence_of_approve: Ruleset / Environment / variable posture matches #676 enforcement layers; inbox labels usable; deploy hook can require Environment approval
- consequence_of_reject_or_defer: Repo helpers and docs still land on merge, but Environment reviewers and human review-count gaps remain — enforcement stays PARTIAL
- evidence_links: docs/operations/PROTECTED_ACTION_GATES_V1.md inventory; docs/operations/ANTON_DECISION_INBOX_V1.md
- urgency_or_expiry: P0 — before making autonomous delivery the default across Lux, CIPC Desk, and future projects
- approval_type: approval:production
- issue_or_pr: #676
- target_sha: n/a (settings are repository configuration, not a commit)
- target_environment: Production (GitHub Environment + branch rules)

---

## Settings Anton owns (checkboxes)

### A. Branch protection / rulesets

- [ ] Confirm ruleset `main-protection` targets **`refs/heads/main`** (API previously showed a quoted `refs/heads/"main"` filter — fix if still wrong).
- [ ] Set **required approving review count ≥ 1** for merges to `main` (human merge authority). Agents must not satisfy this as the sole reviewer for their own PRs.
- [ ] Keep required status checks: `test`, `vercel-env`, `cmp-delivery-files` (adjust only intentionally).
- [ ] Keep **no force-push** / no deletion on `main`.

### B. GitHub Environments

- [ ] On Environment **Production**: add **required reviewers** (Anton); optionally disable admin bypass.
- [ ] Optionally restrict Production deploy branches to `main`.
- [ ] Leave **Preview** without production secrets.

### C. Auto-merge

- [ ] Confirm repo variable **`CMP_AUTO_MERGE` is unset or not `true`**.
- [ ] Do **not** extend `.github/workflows/cmp-product-automerge.yml` to `cursor/*` or `codex/*`.

### D. Labels

- [ ] After the next dispatcher/CI label-ensure run on `main`, confirm all ten Decision Inbox labels exist (`needs:anton` + nine `approval:*`). If ensure cannot run yet, create them once from the names in `ANTON_DECISION_INBOX_V1.md` §2.

### E. Secrets isolation

- [ ] Confirm fork / untrusted PRs do not receive production Actions secrets.
- [ ] Do **not** introduce `pull_request_target` workflows that checkout untrusted code with secrets.

### F. n8n exception notifier (separate activation)

- [ ] After merge: implement/activate `docs/n8n/anton-decision-inbox-exception-notify.md` against the existing Telegram route.
- [ ] Dry-run one synthetic `needs:anton` alert; confirm single nonblank Telegram with GitHub link; resolve item; confirm no repeat.

---

## Durable approval template (when Anton approves settings)

Post on #676 (and optionally #249):

```text
### ANTON DURABLE APPROVAL

- approver: Anton
- approval_type: approval:production
- issue_or_pr: #676
- target_sha: n/a
- target_environment: Production
- valid_until: session
- decision: approve
- recorded_at: <ISO-8601>
- notes: Approved repository settings A–E from ANTON_DECISION_INBOX_OPERATOR_SETTINGS_PACKET
```

---

## Explicit non-actions for Cursor

- Do not merge this PR.
- Do not deploy production.
- Do not change env/secret **values**.
- Do not run live n8n activation without F approved.
- Do not enable `CMP_AUTO_MERGE`.
