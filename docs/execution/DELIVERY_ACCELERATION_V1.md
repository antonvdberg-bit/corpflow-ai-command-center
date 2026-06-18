# Delivery Acceleration v1 — multi-executor protocol (Cursor + Codex Cloud + internal agent)

**Status:** Protocol documentation only. No automation, no installs, no runtime change.
**Owner:** Anton (operator / approver / merger).
**Drafted:** 2026-05-28. **Updated:** 2026-06-18 — utilization posture refined in `docs/execution/CODEX_UTILIZATION_PLAN_V1.md`.
**Companion:** `docs/operations/OPERATOR_BRIDGE_V1.md` (bridge architecture, message schemas, hold rules).
**Coordination issue:** **GitHub issue #249** — `Operator Bridge — Active Work Queue`.

---

## 1. Purpose

This protocol lets a second bounded in-repo executor (Codex Cloud) work in parallel with Cursor, and reserves a phased role for a future internal CorpFlow agent, **without** relaxing any §3 hard gate, any forbidden surface, or the operator-owned merge rule.

It supplements (and does **not** replace) the canonical execution rules:

- `.cursor/rules/delivery-reality.mdc`
- `.cursor/rules/predeploy-decision-checks.mdc`
- `.cursor/rules/commit-push-doc-constraints.mdc`
- `.cursor/rules/security-sensitive-changes.mdc`
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
- `docs/execution/WEEKEND_EXECUTION_QUEUE.md`
- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`
- `docs/operations/OPERATOR_BRIDGE_V1.md`

If any of those conflict with this doc, **those rules win.**

## 2. Why a second executor

Today Cursor is the only in-repo coding agent. While Cursor works one packet (e.g. the AI Lead Rescue commercial-readiness flow), every other approved packet sits `PENDING` in the weekend queue. Adding a second bounded executor unblocks parallel docs and non-runtime work without changing the merge boundary.

Acceleration **does not** come from removing the pre-merge gate. It comes from:

1. **More parallel branches** under the existing namespaces.
2. **Tighter packet structure** (one Executor per packet, no shared branch).
3. **A single coordination surface** (Operator Bridge issue #249).
4. **A future internal read-only agent** that watches and reports.

Anton stays the merge / secrets / DNS / billing / tenant-identity / auth / outbound-comms authority for every executor.

## 3. Actor model

| Actor | Role | Scope (what they own) | Forbidden (what they never do) |
|---|---|---|---|
| **Anton** | Approver / Merger / Operator | Approves packets. Merges PRs. Owns secrets, DNS, billing, tenant identity, auth logic, outbound client comms. Final verdict authority. | n/a — Anton is the top authority. |
| **ChatGPT (planning author)** | Strategy / packet drafting | Drafts packets, decision text, marketing/offer direction. Delivered **through Anton** into the repo. | Direct repo writes. CI access. Direct merges. Any autonomous loop with Cursor or Codex that bypasses Anton. |
| **Cursor (executor #1)** | Primary in-repo coding agent | Everything in `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §2: read repo, edit `docs/`/`artifacts/`, branches under `docs/* / chore/* / feat/* / fix/* / refactor/*`, tests, builds, preview deploys, PRs, evidence. | Everything in policy §3: production deploy, secret values, DNS, billing, destructive DB, tenant migration, auth/security logic, client-facing email, real client-data writes. **Never merges its own PRs.** |
| **Codex Cloud (executor #2)** | Second in-repo coding agent (bounded) | Identical §2 latitude to Cursor, with mandatory branch-prefix `codex/*` (see §5). Posts to Operator Bridge #249 at every state transition. | Identical §3 restrictions to Cursor. Additionally cannot touch `lib/server/`, `lib/cmp/`, `api/`, `middleware.*`, `prisma/`, `.env*`, `.github/workflows/`, `vercel.json` in v1 (tightened by this protocol; can be loosened only by a `policy:` PR per AAP §6). **Never merges its own PRs.** |
| **CorpFlow internal agent (future, phase 1+)** | Read-only auditor / report generator | Read repo + `technical_lead_audits` + public production URLs; writes findings into `artifacts/` and Operator Bridge #249. No DB writes. No secrets. No tenant data. | Repo writes. Any client-facing send. Any secret access. Any tenant data mutation. |

**Single sentence:** Anton owns the gates; ChatGPT designs the work; Cursor and Codex Cloud execute approved packets in parallel under identical §3 constraints; the future internal agent watches; everything posts to Operator Bridge #249; only Anton merges.

## 4. Codex Cloud — runtime posture

Anton's runtime decision (recorded in `docs/decisions/JOURNAL.md` JE-2026-05-28-2): **Codex Cloud (hosted worker)**, not Codex CLI on the laptop.

### 4.1 GitHub App permissions (least privilege)

When Anton installs the Codex Cloud GitHub App on this repo, the installation must be scoped as follows. The App is installed on **this repo only**, never org-wide.

| Permission | Setting | Reason |
|---|---|---|
| Contents | Read + write, **non-`main` branches only** | Needed to push `codex/*` branches. `main` write must remain Anton-only. |
| Pull requests | Read + write | Needed to open PRs and respond to review comments. |
| Issues | Read + write | Needed to post STATUS comments to Operator Bridge issue #249. |
| Metadata | Read | GitHub-required default. |
| Actions | **Denied** | Codex must not read workflow secrets or trigger workflows beyond what PR-open already triggers. |
| Secrets | **Denied** | Codex must not read repo secrets (AAP §3.2). |
| Environments | **Denied** | No Production / Preview env access. |
| Administration | **Denied** | No repo settings, branch protections, or default-branch changes. |
| Webhooks (write) | **Denied** | No new webhooks. |
| Workflows (write) | **Denied** | No `.github/workflows/*` writes in v1. |

If GitHub's App permission model changes the names above, the principle wins: **read + write to non-`main` branches and PR/Issue surfaces only**.

### 4.2 OpenAI entitlement (ChatGPT Plus first)

**Preferred (2026-06-18):** Anton signs in to Codex Cloud with **ChatGPT Plus** so cloud tasks and GitHub integration consume subscription-included limits. See `docs/execution/CODEX_UTILIZATION_PLAN_V1.md` §6.

**Fallback:** Anton creates an OpenAI API key in his own dashboard **only if** Plus limits are insufficient and Anton explicitly approves API spend. Per OpenAI docs, API-key-only Codex paths do **not** include cloud/GitHub features — unsuitable as the primary CorpFlow Cloud executor path.

Regardless of path:

- Credentials are entered only in Codex Cloud's own setup UI (or ChatGPT sign-in flow).
- Values never appear in this repo, in `.env*`, in GitHub Actions secrets, in Vercel env, in `artifacts/`, in chat, or in any PR description.

### 4.3 Codex Cloud as an operational surface

Codex Cloud runs in OpenAI's infrastructure, not on Anton's laptop and not on `corpflow-exec-01`. This is acceptable for v1 because:

- Codex Cloud holds **no production credentials** (no `MASTER_ADMIN_KEY`, no `POSTGRES_URL`, no Vercel token, no Telegram token, no Stripe key).
- The GitHub App is least-privilege per §4.1.
- All work product is observable in PRs and in Operator Bridge #249.
- Anton can disable Codex Cloud at any time by uninstalling the GitHub App from this repo (rollback path).

Codex-Cloud-as-a-process is **not** a Migration-to-Server Checklist item because the process runs outside CorpFlow infrastructure. Future packets that wire Codex Cloud into our own automation (e.g. CI workflows, n8n flows) will trigger that checklist.

## 5. Branch and PR discipline

| Rule | Detail |
|---|---|
| **Branch prefixes** | Cursor: `docs/*`, `chore/*`, `feat/*`, `fix/*`, `refactor/*`. Codex Cloud: `codex/docs-*`, `codex/chore-*`, `codex/feat-*`, `codex/fix-*`, `codex/refactor-*`. |
| **One executor per branch** | A `codex/*` branch may only be authored by Codex Cloud. Non-`codex/*` branches may only be authored by Cursor (or Anton). The packet's `Owner: Executor` line is binding. |
| **One author per PR** | For the life of the packet, only the named Executor commits to the PR branch. No mixed-author branches. |
| **No shared working branch** | Two executors must never work on the same branch simultaneously. |
| **No direct push to `main`** | Both executors are forbidden from pushing to `main` (AAP §2.3). |
| **No force-push to shared branches** | Includes `main`, release branches, and any branch the other executor created. |
| **No autonomous merges** | Cursor and Codex Cloud both stop at `AWAITING_APPROVAL (pre-merge)` even with green CI. Anton merges. |
| **Auto-merge surface unchanged** | `.github/workflows/cmp-product-automerge.yml` remains the **only** auto-merge surface, off by default, scoped to `cmp/*` branches + `client-approved` label + `Agent CI` green + repo var `CMP_AUTO_MERGE=true`, squash only. Codex does **not** get auto-merge in v1. |

## 6. Packet ownership and claim

`docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` §2.10 already names a single `Owner: Executor` per packet. Under Delivery Acceleration v1, this field becomes binding for executor selection:

- A packet's `Owner: Executor` line names exactly one of: `Cursor`, `Codex Cloud`, `Internal agent`.
- The named Executor claims by transitioning `APPROVED → IN_PROGRESS` and posting a STATUS comment to Operator Bridge #249 per `OPERATOR_BRIDGE_V1.md` §5.1.
- The non-owning executor must not commit to the packet's branch, open a PR for it, or transition its state.
- Re-assigning a packet to a different executor requires Anton to update the `Owner: Executor` line and post an `Operator decision` comment to #249 per `OPERATOR_BRIDGE_V1.md` §5.2.

## 7. STATUS posting to Operator Bridge #249

Both executors and the future internal agent use the existing schemas in `OPERATOR_BRIDGE_V1.md` §5.1 (`Cursor status`) and §5.3 (closure). Delivery Acceleration v1 adds one required header field to every status post:

```
**Executor:** Cursor | Codex Cloud | Internal agent
```

This makes packet-collision visible immediately and makes the audit trail unambiguous across executors.

Post at every state transition: `APPROVED → IN_PROGRESS`, `IN_PROGRESS → AWAITING_APPROVAL`, `BLOCKED`, evidence captured, merge confirmed.

**Forbidden in any STATUS comment** (carried verbatim from `OPERATOR_BRIDGE_V1.md` §9 and Migration Checklist §2.5):

- Secret values, factory master key, Vercel / GitHub / OpenAI tokens.
- Reset codes, password hashes.
- Full session cookies, full `Authorization` headers, full `x-corpflow-*-secret` headers.
- Full request / response bodies that contain PII.
- Tenant data (rows, IDs not already publicly known, billing balances).
- Any redacted-looking string that an outsider could de-redact.

When in doubt, post the **status only** and link evidence in `artifacts/` rather than pasting content.

## 8. Hard limits (unchanged from policy)

These are non-negotiable for Cursor, Codex Cloud, the future internal agent, and any other executor:

- **No secrets** — no value paste, no env-write, no credential broadening (AAP §3.2).
- **No env changes** — GitHub Actions, Vercel (Prod / Preview / Dev), Infisical, non-template `.env*` files (§3.2).
- **No DNS** — registrar, Vercel domain mappings, `tenant_hostnames`, traffic splits, `CORPFLOW_FACTORY_HEALTH_URL` (§3.3).
- **No DB / schema writes** — no `DROP` / `TRUNCATE` / destructive update, no `prisma migrate reset`, no `db push --accept-data-loss`, no bulk backfills "even when obviously correct" (§3.5).
- **No `tenant_id` changes** — read-only outside an explicit approved migration packet (§3.6).
- **No analytics / Plausible / Search Console changes** — runtime install Anton-gated; no tracking on `/change`, `/admin`, factory routes, or any auth / reset URL.
- **No Telegram behavior changes** — `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID`, alert routing logic, `lib/server/ops-alerts.js` behavior (§3.2 + §3.8).
- **No Vercel settings changes** — env, domains, deployments, promotion, project settings, cron schedule edits beyond the Hobby-cron guard.
- **No GitHub settings changes** — Actions secrets / variables, repo settings, branch protections, default-branch rules, third-party Actions un-pinning.
- **No payment gateway changes** — Stripe config / products / prices / webhooks / restricted keys; tenant wallet balances; billing-exempt flags; token credits; invoice / charge / refund code paths (§3.4).
- **No autonomous merges** — pre-merge gate is Anton-only.
- **No shared branch between executors** — `codex/*` is Codex-only; non-`codex/*` is Cursor- or Anton-only.

## 9. Internal CorpFlow agent — phased roadmap

Each phase is a separate packet, separate approval, separate `policy:` PR if it broadens AAP §2 / §3 scope.

| Phase | Capability | Allowed inputs | Allowed outputs | Approval gates |
|---|---|---|---|---|
| **0** | Readiness audit (this protocol) | Read repo + run as Cursor packet | This doc + runbook + bridge update | Pre-merge. |
| **1** | Read-only repo auditor | Public repo + `technical_lead_audits` + anonymous public production URLs | Findings into `artifacts/audits/` + STATUS comments on #249 | Pre-merge. **No DB writes, no secrets, no tenant data.** If hosted on `corpflow-exec-01`, additionally satisfies Migration-to-Server Checklist + `MONITORING_ARCHITECTURE.md` §11.3 amendment. |
| **2** | Operator Bridge summarizer | Read #249 comments | Daily digest comment on #249 | Pre-merge. No new credentials. |
| **3** | Lead Rescue prospect scoring assistant | Public prospect signals + offline data | Writes scores to a new `lead_rescue_scores` table | `policy:` PR (new DB write surface). No outbound comms. |
| **4** | PR-drafting assistant | Read repo | PRs against `docs/*` only at first, then `chore/*` / `refactor/*` | `policy:` PR amending AAP §2 to add `internal-agent/*` branch namespace and the third executor name. |
| **5** | Client-facing AI modules | Per-module specification | Per-module surface | Each module is a separate packet. Mandatory: outbound comms gate (§3.8), Brand & Conversion Doctrine review, real-tenant rollout via `luxe-maurice` first per JE-2026-04-10-1. |

## 10. Immediate safe use cases (Codex Cloud first packets)

All of these sit inside existing AAP §2 latitude and require no further policy amendment beyond this protocol PR:

1. **PR review comments** — read-only, no approval / merge authority.
2. **Test generation** — new tests under `core/engine/tests/` or `node-tests/`; PR-only.
3. **Docs consistency audit** — cross-reference `AGENTS.md` Must-read table vs files on disk; output to `artifacts/audits/<date>-docs-consistency.md`.
4. **Broken-reference audit** — scan `docs/` for dead internal links / dead file paths / missing anchors.
5. **Lead Rescue article outlines** — under `docs/marketing/drafts/`; Brand & Conversion Doctrine applies before any live publishing.
6. **Prospect scoring sheet drafts** — read-only synthesis into `artifacts/lead-rescue/<date>-scoring-draft.csv` (no PII, no live outreach).
7. **Client report drafts** — text drafts only into `artifacts/client-reports/<tenant>/<date>.md`; Anton reviews before any send.
8. **Landing page copy variants** — into `docs/marketing/copy-variants/`; doctrine review at PR time.
9. **Queue summarization** — read `WEEKEND_EXECUTION_QUEUE.md` + #249; produce a daily one-pager into `artifacts/`.
10. **Delivery checklist generation** — per-packet checklist (DoD bullets + Delivery Reality Audit shell) into the packet itself or `artifacts/`.

## 11. Onboarding Codex Cloud (operator steps, not in this PR)

When Anton is ready to install Codex Cloud, the operator steps are:

1. **Confirm Operator Bridge issue #249 exists** in this repo (already confirmed 2026-05-28).
2. **Create the OpenAI API key** in Anton's own OpenAI dashboard. Do not paste the value anywhere outside Codex Cloud's setup UI.
3. **Install the Codex Cloud GitHub App** on **this repo only**, with the least-privilege permission set in §4.1.
4. **Record the Codex Cloud bot's GitHub username** (the identity that authors commits and PRs) in a follow-up doc-only PR that updates this file's §4.1 with the actual bot username.
5. **Anton drafts the first Codex Cloud packet** in `WEEKEND_EXECUTION_QUEUE.md` with `Owner: Executor = Codex Cloud`. Codex picks it up and posts the first `IN_PROGRESS` STATUS to #249.
6. **First packet should be from §10** (a low-risk docs-only use case) — not a runtime or `lib/server/` change.

This sequence requires **no new repo secret**, **no new workflow file**, and **no change to `main`** at install time. The protocol doc is sufficient.

## 12. Rollback

To disable Codex Cloud at any time:

1. Anton uninstalls the Codex Cloud GitHub App from this repo via GitHub settings.
2. Codex Cloud loses all write access to `codex/*` branches and to issue #249.
3. Any open `codex/*` PR remains visible; Anton can close it without merge.
4. Cursor continues operating unchanged.

To revert this protocol entirely:

- Single revert PR of the merge commit removes the protocol doc, runbook companion, the `OPERATOR_BRIDGE_V1.md` Codex addition, the AGENTS rows, the queue entry, and the journal entry.
- No downstream runtime depends on this protocol — it is docs-only.

## 13. Cross-references

- **Codex Cloud activation packet (state + operator checklist + Packet 7.3):** `docs/execution/CODEX_CLOUD_ACTIVATION_PACKET_V1.md`
- **Codex utilization plan (June 2026 product sync, Plus-first, evaluation rubric):** `docs/execution/CODEX_UTILIZATION_PLAN_V1.md`
- Operator Bridge architecture and schemas: `docs/operations/OPERATOR_BRIDGE_V1.md`
- Operator Bridge day-to-day runbook: `docs/runbooks/OPERATOR_BRIDGE.md`
- Packet structure: `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
- What is allowed / what requires approval: `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- Migration of recurring work off the laptop: `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`
- Current queue: `docs/execution/WEEKEND_EXECUTION_QUEUE.md`
- Delivery reality: `.cursor/rules/delivery-reality.mdc`
- Predeploy / live verification: `.cursor/rules/predeploy-decision-checks.mdc`
- Brain vs hands: `docs/EXECUTION_BRAIN_VS_HANDS.md`
- Monitoring architecture (and `corpflow-exec-01` posture): `docs/operations/MONITORING_ARCHITECTURE.md` §11.3
- Decision record for this protocol: `docs/decisions/JOURNAL.md` JE-2026-05-28-2
