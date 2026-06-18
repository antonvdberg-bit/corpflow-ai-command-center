# Codex Cloud install — operator playbook (Packet 7.2)

**Audience:** Anton (operator). This is the click-by-click sequence for installing Codex Cloud as a second bounded Executor.
**Canonical protocol:** `docs/execution/DELIVERY_ACCELERATION_V1.md` (rules and constraints) and `docs/operations/OPERATOR_BRIDGE_V1.md` (coordination).
**Tracking packet:** Goal 7 / Packet 7.2 in `docs/execution/WEEKEND_EXECUTION_QUEUE.md`.
**Tracking issue:** Operator Bridge **#249**.

This runbook is procedural only — it does not change any policy. The rules in `DELIVERY_ACCELERATION_V1.md` and `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3 still bind every action below.

---

## 1. Pre-flight (no clicks yet)

Confirm out loud (or in #249) before opening any third-party UI:

- [ ] `docs/execution/DELIVERY_ACCELERATION_V1.md` is on `main`. Quick check: `gh pr view 252 --json mergeCommit` returns `031f12cc...`.
- [ ] Operator Bridge issue **#249** is `OPEN` and pinned. Quick check: `gh issue view 249 --json state,title`.
- [ ] No active `codex/*` branches on the remote (none should exist yet). Quick check: `git ls-remote --heads origin 'codex/*'` returns empty.
- [ ] AAP §3 hard gates remain unchanged. (Sanity scan of `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3.)

If any pre-flight item fails, **STOP** and post a `HOLDING` comment on #249 before continuing.

## 2. OpenAI entitlement (ChatGPT Plus first — preferred)

1. Sign in to Codex Cloud with **ChatGPT (Plus)** so cloud tasks and GitHub integration use subscription-included limits. See `docs/execution/CODEX_UTILIZATION_PLAN_V1.md` §6.
2. Treat Plus cloud-task limits as **scarce** — one Codex packet at a time during the evaluation week.
3. **Only if Plus limits block work and Anton approves API spend:** fall back to API key creation below.

### 2b. OpenAI API key (fallback — Anton dashboard only)

1. Sign in at `https://platform.openai.com/`.
2. Navigate: **API Keys → Create new secret key**.
3. **Naming convention:** `corpflow-codex-cloud-<YYYY-MM-DD>` (e.g. `corpflow-codex-cloud-2026-05-28`). Keeps audit trail clear.
4. **Scope (if offered):** least privilege — `model.use` only; no fine-tuning, no admin, no organization-wide scope unless Codex Cloud setup explicitly requires it.
5. **Spend cap (recommended):** set a monthly soft limit (e.g. USD 50) and hard limit (e.g. USD 200) until Codex Cloud's actual usage curve is known.
6. Copy the secret value.

### Where the value goes — and where it does NOT

| Allowed | Forbidden |
|---|---|
| Paste directly into Codex Cloud's own setup UI (once). | This repo (`.env*`, `artifacts/`, comments). |
| Anton's password manager (1Password, Bitwarden, Apple Keychain, etc.) for recovery. | GitHub Actions secrets. |
|  | Vercel env (Production / Preview / Development). |
|  | Infisical. |
|  | Chat, PR description, commit message, screenshot. |
|  | Any `corpflow-exec-01` shell history or file. |
|  | Cursor / agent input box. |

**AAP §3.2 binds:** no agent (including Cursor) ever sees this value. If anyone asks for it in chat, refuse and link to this section.

If you accidentally paste the value anywhere it shouldn't be: rotate the key immediately in the OpenAI dashboard, document the slip in `docs/runbooks/SECURITY_OR_INCIDENT.md`, post a `HOLDING` on #249.

## 3. Install the Codex Cloud GitHub App

1. Sign in to Codex Cloud and start the "Connect GitHub repository" flow.
2. When GitHub prompts for App installation, select **Only select repositories** → **`corpflow-ai-command-center`**. **Do not** install on the org or other repos.
3. **Configure least-privilege permissions** — match this table exactly (from `DELIVERY_ACCELERATION_V1.md` §4.1):

| Permission | Setting |
|---|---|
| Contents | Read + write |
| Pull requests | Read + write |
| Issues | Read + write |
| Metadata | Read (GitHub default) |
| Actions | **Denied** |
| Secrets | **Denied** |
| Environments | **Denied** |
| Administration | **Denied** |
| Webhooks (write) | **Denied** |
| Workflows (write) | **Denied** |

If GitHub's App permission model has renamed any item: the **principle** wins — Codex must only be able to read + write `codex/*` branches and PR/Issue surfaces. If unsure, deny and verify after install via a tiny test (step 6).

4. Confirm the install. GitHub will show the App listed under **Settings → Integrations → GitHub Apps** with the permission set you configured.

## 4. Record the Codex Cloud bot identity

After install, the GitHub App author identity becomes the user under which Codex Cloud commits and opens PRs. You'll see it on the first commit it pushes.

1. Open one trivial Codex Cloud "smoke" task (it just needs to push *anything* — a noop branch is fine). Codex Cloud will create the first `codex/*` branch.
2. Note the GitHub author of the resulting commit / PR. The username will look like `corpflow-codex-cloud[bot]` or similar (exact format determined by Codex Cloud).
3. Record the bot username in a follow-up docs-only PR that updates `docs/execution/DELIVERY_ACCELERATION_V1.md` §4.1 — change "the bot username Codex Cloud commits as" to the actual literal username. This is the small follow-up PR called out in the protocol.
4. Close the smoke PR without merge (or merge if it's already a useful docs change).

## 5. Branch protection sanity check

Codex Cloud must not be able to bypass the operator-merge gate. Verify on GitHub:

1. **Settings → Branches → Branch protection rules → `main`.**
2. Confirm: **"Restrict pushes that create matching branches"** OR **"Require a pull request before merging"** is enabled (whichever names your settings show).
3. Confirm the GitHub App identity from step 4 is **not** in any "Allow specified actors to bypass" list.
4. Confirm `cmp-product-automerge.yml` repo variable `CMP_AUTO_MERGE` is still off OR the workflow file's branch filter still says `cmp/*` only (it does not match `codex/*`).

If any of these fail, **STOP** and rotate / fix before letting Codex Cloud do real work.

## 6. First-packet smoke (low-risk, observable)

Choose one of the use cases from `docs/execution/DELIVERY_ACCELERATION_V1.md` §10 — **start with the lowest-risk option**. Recommended order:

1. **Docs consistency audit** (§10 item 3) — Codex reads `AGENTS.md` Must-read table, verifies each path exists, outputs `artifacts/audits/<date>-docs-consistency.md`. Read-only inspection + one artifact write. **Recommended first packet.**
2. **Broken-reference audit** (§10 item 4) — same shape; scans `docs/` for dead internal links.
3. **Queue summarization** (§10 item 9) — reads `WEEKEND_EXECUTION_QUEUE.md` + #249 comments, produces `artifacts/<date>-queue-summary.md`.

**Never** start with: test generation (item 2), prospect scoring (item 6), client report drafting (item 7), or anything else that touches client-facing data or commits to non-`artifacts/` paths.

### Draft the first packet

In `docs/execution/WEEKEND_EXECUTION_QUEUE.md`, add a sub-packet under Goal 7:

```
### Packet 7.3 — First Codex Cloud smoke (docs consistency audit)

- **Goal:** Codex Cloud produces artifacts/audits/<date>-docs-consistency.md verifying every path in AGENTS.md Must-read resolves on disk.
- **Owner:** Approver = Anton. Executor = Codex Cloud. Reviewer = Anton.
- **Allowed paths:** read everything; write only artifacts/audits/<date>-docs-consistency.md.
- **Forbidden paths:** anything outside artifacts/audits/ in this packet.
- **Branch:** `codex/docs-consistency-audit-v1` (or `codex/docs-consistency-audit-<date>` if date-stamped variant preferred)
- **STATUS posts:** to #249, with `**Executor:** Codex Cloud` header per OPERATOR_BRIDGE_V1.md §5.1.
- **Status:** APPROVED (or PENDING if you want a final review before Codex picks up).
```

Once approved, Codex Cloud claims and posts `IN_PROGRESS` to #249.

## 7. What to watch on the first run

- **First STATUS comment on #249** uses the `**Executor:** Codex Cloud` header. If it doesn't, the protocol's been bypassed — pause Codex and check Codex Cloud's config.
- **First PR opens against `main`** from a `codex/*` branch. If it opens against any other base, that's a red flag.
- **First diff stays inside `artifacts/audits/`**. If it touches anything else, request changes and don't merge.
- **CI runs the standard `test`, `vercel-env`, Agent CI** checks on Codex's PR. If checks behave differently for the GitHub App identity, post a `HOLDING` and investigate.
- **No secret values appear anywhere** in the PR description, commit messages, or `artifacts/` output. If they do, immediately rotate the affected secret and follow `docs/runbooks/SECURITY_OR_INCIDENT.md`.

## 8. Rollback

To disable Codex Cloud at any point — including mid-PR:

1. **GitHub:** Settings → Integrations → GitHub Apps → Codex Cloud → **Uninstall**. This revokes all repo access immediately.
2. **OpenAI:** dashboard → API Keys → revoke `corpflow-codex-cloud-<date>`.
3. Any open `codex/*` PR can be left open (visible audit trail) or closed without merge.
4. Post a `HOLDING` or `BLOCKED` comment on #249 explaining the rollback so the audit trail is unambiguous.
5. Cursor continues operating unchanged.

To revert the protocol entirely (if you want to remove the multi-executor model): single revert PR of merge commit `031f12cc` (PR #252). Cursor and Anton return to single-executor model. The Codex Cloud GitHub App uninstall in step 1 is a separate operation.

## 9. Decision record

Each material event in this install should land in `docs/decisions/JOURNAL.md` as a new `JE-YYYY-MM-DD-n` row (append-only, per `docs/decisions/README.md`). Recommended granularity:

| Trigger | Journal entry |
|---|---|
| Codex Cloud GitHub App installed | One row noting: install date, scoped to `corpflow-ai-command-center` only, permissions as `DELIVERY_ACCELERATION_V1.md` §4.1. Reversibility: uninstall via Settings → Integrations. |
| Bot username recorded into §4.1 | One row noting: PR number, before/after diff line. Reversibility: revert PR. |
| First Codex Cloud packet merged | One row noting: packet name, PR number, merge SHA, what was produced. Reversibility: revert PR. |

Avoid one journal row per Codex PR after the first; the chat history (`artifacts/chat_history.md`) is the right place for ongoing summaries.

## 10. References

- Protocol (rules + constraints): `docs/execution/DELIVERY_ACCELERATION_V1.md`
- **Codex utilization plan (Plus-first, evaluation rubric, first packet):** `docs/execution/CODEX_UTILIZATION_PLAN_V1.md`
- Operator Bridge architecture: `docs/operations/OPERATOR_BRIDGE_V1.md`
- Operator Bridge day-to-day runbook (STATUS posting): `docs/runbooks/OPERATOR_BRIDGE.md`
- What requires approval: `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3
- Migration-to-server checklist (applies when Codex Cloud workflows become repo-side automation): `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`
- Security incident response (if a secret leaks): `docs/runbooks/SECURITY_OR_INCIDENT.md`
- Decision journal format: `docs/decisions/README.md` and existing entries in `docs/decisions/JOURNAL.md`
