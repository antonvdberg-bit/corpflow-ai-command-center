# Cloud-first agent execution migration (v1)

**Status:** Docs/plan only. **NO IMPLEMENTATION AUTHORIZED** beyond what existing packets already allow.
**Owner:** Anton (operator) for merges, secrets, DNS, billing, and operator-only actions.
**Created:** 2026-06-30.
**Implements:** GitHub issue [#485](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/485).
**Operates under:** [#493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/493) parallel execution board, **Lane D** (cloud-first / laptop dependency removal).
**Anchor sentinel:** `<!-- CLOUD_FIRST_AGENT_EXECUTION_MIGRATION_V1 -->`

<!-- CLOUD_FIRST_AGENT_EXECUTION_MIGRATION_V1 -->

## 0. TL;DR

Anton should act as **CEO/CIO decision-maker**, not as a manual copy/paste bridge between ChatGPT, Cursor, Codex, and GitHub. The default development flow moves to **durable cloud-side surfaces**:

| Surface | Role |
|---|---|
| **GitHub** (#249, issues, PRs, comments, Actions) | Durable work queue, handoff layer, evidence |
| **Cursor** (dispatcher + primary executor) | Repo/docs/code PRs; posts digests; never self-merges |
| **Codex Cloud** (research + bounded `codex/*` PRs when activated) | Parallel executor; transfer-safe research; no PR ownership for medspa Sheet path |
| **Vercel Preview + CI** | Validation evidence (not laptop-only) |
| **n8n** | Internal **notify/remind/task** spine only — never auto-send outreach |

**#249 stays the command ledger.** This doc is the **migration epic design** for getting recurring work and handoffs off Anton's laptop — it does not replace #249.

## 1. Cloud-first operating model

```text
Anton (approver/merger)
    │ decisions + merges on #249
    ▼
GitHub (#249 + issues + PRs)  ←── durable queue + evidence (source of truth for coordination)
    │
    ├── Cursor (executor #1) ── branches docs/* chore/* feat/* fix/* refactor/*
    ├── Codex Cloud (executor #2) ── codex/* branches + transfer-safe research
    └── GitHub Actions / Vercel cron (L2 hands) ── read-only schedules

n8n (notify-only) ── watches #249 / Sheet status / digest freshness → Telegram/tasks
Anton laptop (L1) ── exceptions only: break-glass, secrets, physical actions, un-migrated smokes
```

**Principle:** if a job can run on **L2** (GitHub Actions, Vercel cron, n8n notify, Codex Cloud) without widening trust, it **should**. The laptop is for **judgment and gates**, not routine polling.

Canonical boundaries unchanged: `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §2/§3, `docs/execution/DELIVERY_ACCELERATION_V1.md`, `docs/operations/PARALLEL_EXECUTION_BOARD_V1.md`.

## 2. Revised responsibilities

| Actor | Cloud-first responsibility | Still laptop-bound (until migrated) |
|---|---|---|
| **Anton** | Approve packets on #249; merge PRs; place secrets in Infisical/Vercel/GitHub (operator UI); physical/bank actions | Break-glass factory API calls; initial Codex batch save to outbox (interim); Lux mutating smokes until preview-only split |
| **Cursor** | Dispatcher digests 2–3×/day; open PRs; run CI-equivalent checks via GHA; post STATUS/closure on #249; import Codex research into repo PRs | Local `npm test`/`build` when drafting (optional; GHA is authoritative) |
| **Codex Cloud** | Research packets; `codex/*` docs PRs when activated; transfer-safe CSV/manifest in **GitHub** (issue comment or PR body), not local-only branch/SHA | Cannot replace Anton for Sheet **Apply** step (human copies CSV into Sheet) |
| **ChatGPT** | Packet drafting **through Anton** → #249 decision comment | Never direct repo/CI |
| **n8n** | Notify: stale digest, approval queue depth, backup failure (when wired), email reply detected (when wired) | Must not: merge, deploy, send outreach, write production DB |

## 3. Migration buckets (assessment table)

Every recurring or handoff item lands in **exactly one** bucket:

| Bucket | Meaning | Examples |
|---|---|---|
| **1 — Cloud now** | Can run fully cloud-side today with no repo change | Factory control loop (GHA daily); Uptime Kuma probes; Vercel crons (CMP monitor, Technical Lead); dispatcher digests posted from Cursor to #249; Codex research pasted into GitHub issue/PR (transfer-safe) |
| **2 — Cloud with small change** | Needs a bounded packet (docs/process or thin auth route) | Change Console **read-only** smoke on GHA (`CORPFLOW_CRON_SECRET` auth — see `LAPTOP_DEPENDENCY_BURN_DOWN_V1.md` §5.2); email inbound poll on n8n (`EMAIL_AUTOMATION_INBOUND_OUTBOUND_WORKFLOW_V1.md`); heartbeat checker activation (#495 Stage 2); Codex outbox → **GitHub issue attachment / PR comment** path (§5) |
| **3 — Laptop today** | Depends on `C:\CorpFlow\...`, local `.env.local`, or `MASTER_ADMIN_KEY` | `C:\CorpFlow\codex-outbox\` drop + `codex-outbox-validate.mjs`; full Lux phase-4c1 **mutating** smoke; PowerShell factory mutation scripts; local preview smokes before GHA auth exists |
| **4 — Operator-only (stay)** | Secrets, billing, DNS, merges, outreach approval, tenant identity, production promote | All AAP §3 gates; merge every PR; Sheet **Apply Validated Queue** + outreach send; bank visit; Vercel env edits |

### 3.1 Detailed rows (issue #485 ask list)

| Item | Bucket | Cloud target | Notes |
|---|---|---|---|
| Factory control loop | **1** | GHA `factory-control-loop.yml` | Already live — verify secrets on #249 (`LAPTOP_BURN_DOWN` §4.1) |
| Dispatcher / parallel board | **1** | #249 + #493 digests | Active (`PARALLEL_EXECUTION_BOARD_V1.md`) |
| Technical Lead cron | **1** | Vercel `/api/cron/technical-lead` | Read-only observer |
| Heartbeat checker (#495) | **2** | n8n schedule + GitHub read API | Stage 0/1 on `main`; Stage 2 Anton-gated |
| Email inbound replies (#486) | **2** | n8n Gmail poll + Telegram | Design on `main`; pilot packet separate |
| Change Console smoke | **2** | GHA after cron-auth packet | Blocked on `MASTER_ADMIN_KEY` today |
| Codex local outbox | **3 → 2** | GitHub issue/PR comment + `artifacts/` import PR | See §5 — eliminates Anton-as-courier for file bytes |
| US Medspa Sheet workflow (#467) | **2** | Codex CSV → GitHub → Cursor import PR → Anton Sheet apply | See §6 — Anton applies Sheet, not courier for bytes |
| Product A buyer surfaces | **2** | PR + Vercel Preview URL in PR + production smoke after merge | See §7 — evidence on GitHub, not laptop screenshots only |
| Codex Cloud activation | **2** | Codex Cloud L2 executor | `CODEX_CLOUD_ACTIVATION_PACKET_V1.md` — reduces L1 drafting load |
| Lux mutating attachment smoke | **3** | Preview-only GHA or read-only public GET smoke | **Do not** schedule mutating prod smoke |
| PowerShell tenant/bootstrap scripts | **4** | Stay operator-only | Port to `.mjs` for convenience optional; never scheduled |

## 4. What proceeds without Anton vs what needs Anton

### 4.1 Pre-approved (AAP §2 + parallel board §6)

- Read repo, issues, PRs, public production URLs.
- Docs/code on approved branches; open PRs (Cursor or Codex `codex/*`).
- `npm test` / `npm run build` / CI; Preview deploys; evidence in PR.
- Codex transfer-safe research; dispatcher digests; STATUS on #249.
- n8n **notify** workflows (inactive templates until credentials confirmed).

### 4.2 Hard-gated (AAP §3 — unchanged)

- **Every merge.** Production deploy/promote/rollback.
- **Every secret/env** (Vercel, GitHub, Neon, n8n, Telegram, Meta/WhatsApp, Gmail OAuth).
- DNS, billing, payment, destructive DB, tenant migration, auth/security logic.
- **First send** of email/WhatsApp/SMS; **all outreach** (human-approved only).
- L3 box actions without named packet; new self-hosted tool/container.
- Governance file edits without explicit approval naming the file.
- Parked forward-secret rotation — **do not reopen.**

## 5. Codex outbox — migrate off `C:\CorpFlow\codex-outbox\`

**Today:** `docs/operations/CODEX_OUTBOX_LOCAL_V1.md` — Anton saves Codex batches to `C:\CorpFlow\codex-outbox\medspa-audits\incoming\`; Cursor runs `scripts/codex-outbox-validate.mjs` locally.

**Problem:** Anton is the courier for file bytes; batches can be lost if not saved; local-only paths are invisible to Codex Cloud and #249.

**Cloud-first target (bucket 2):**

```text
Codex → transfer-safe content in GitHub (pick one):
  A) Issue comment on #249 or a dedicated Codex-return issue (CSV + manifest in fenced blocks)
  B) PR comment on an open import PR
  C) artifacts/ path via Cursor PR (preferred for large CSV)

Cursor → run validator logic (same rules as codex-outbox-validate.mjs) in CI or locally once
  → open import PR if needed
  → STATUS on #249 with verdict VALID/INVALID

Anton → Sheet Apply only (human step — unchanged)
```

**Server drop** (`/srv/corpflowai/codex-outbox/` on exec-01) remains **deferred** — requires ADR + §5.3 gate (`CODEX_OUTBOX_LOCAL_V1.md` §1). GitHub handoff achieves the same **without** new L3 credential.

**First slice:** document Codex prompt template requiring paste into #249 with `CODEX_TASK_REGISTER_V1.md` task ID; Cursor validates and moves to processed/rejected **in repo** (`artifacts/codex-imports/`) instead of `C:\CorpFlow\`.

## 6. US Medspa workflow (#467) without Anton as courier

Per `docs/marketing/US_MEDSPA_REVENUE_MACHINE_SHEET_AUDIT_WORKFLOW_V0.md` + `CODEX_INTEGRATION_CONTRACT_V1.md`:

1. **Codex** returns `Audit Update Queue` CSV + manifest (transfer-safe) → posted on #249 or imported via Cursor PR (`CODEX_TASK_REGISTER` row → `IMPORTED`).
2. **Cursor** validates against contract §5; opens docs/import PR or attaches to `artifacts/`; posts digest.
3. **Anton** reviews PR + runs Sheet **Apply Validated Queue** (human-only — not automation).
4. **Anton** approves outreach rows in Sheet before any send (`marketing-automation-arm.md` §8).
5. **n8n** may remind on `approval_status = Pending` — **must not** send.

Anton is **not** the pipe for moving CSV bytes from Codex's workspace to Cursor; GitHub is.

## 7. Product A work — PR + Preview evidence

Task 2 / Product A market-readiness should default to:

- One packet → one branch → one PR (lane-tagged).
- **CI green** on PR (authoritative; not only laptop `npm test`).
- **Vercel Preview URL** recorded in PR body + #249 STATUS for buyer-facing surfaces.
- **Production verification** only after Anton merge — Delivery Reality Audit on real hostname (`delivery-reality.mdc`).
- Beauty-layer / marketing changes: governed rollout plan + preview smoke where required (`CORPFLOW_BEAUTY_LAYER_ROLLOUT_PLAN_V1.md`).

No Product A progress should rely on "only on Anton's laptop" without a linked PR.

## 8. #249 vs #485 — queue ownership

| Surface | Role |
|---|---|
| **#249** | **Command ledger** — operator decisions, STATUS, digests, approval queue (keep) |
| **#493** | Parallel execution board epic — lane movement, WIP, throughput |
| **#485 (this doc)** | **Migration epic design** — bucket table, outbox handoff, cloud-first model (pointer doc; not a second ledger) |
| **`WEEKEND_EXECUTION_QUEUE.md`** | Packet-level Definition of Done + evidence |

Do **not** fork coordination into a third live queue. #485 closes when the bucket-2 items have packets and laptop recurring checks trend to zero.

## 9. n8n — notify vs must not

| n8n **may** | n8n **must not** |
|---|---|
| Watch #249 / digest freshness (#495 heartbeat) | Merge PRs or deploy |
| Remind Anton: approval queue, Sheet rows pending | Send cold outreach or client email without approval |
| Notify: backup failure (future), email reply received (future pilot) | Write production Postgres |
| Create **tasks** for human follow-up | Auto-send WhatsApp/SMS |
| Forward `corpflow.automation.envelope.v1` (existing) | Rotate secrets or edit Vercel env |

## 10. Risk controls

- **No widening trust:** cloud migration does not add secrets to repo, CI logs, or digests.
- **No `MASTER_ADMIN_KEY` in new GHA jobs** — prefer `CORPFLOW_CRON_SECRET` read-only routes (`MIGRATION_TO_SERVER_CHECKLIST.md` §2.1).
- **No production mutating smokes on schedule** (Lux full smoke stays preview/manual).
- **WIP limits** (2 open PRs/executor) prevent cloud parallelism from becoming merge debt (`PARALLEL_EXECUTION_BOARD_V1.md` §4).
- **Transfer-safe Codex handoffs** — no local-only branch/SHA (`CODEX_INTEGRATION_CONTRACT_V1.md`).
- **Delivery reality** — Preview ≠ Production; customer-visible completion requires live verify.
- **Standing holds:** one app, one Postgres; no second app/DB; forward-secret rotation parked.

## 11. First implementation slice (separately authorized)

**Packet:** `Cloud-First-Codex-GitHub-Handoff-1` (docs/process + optional thin CI, no Sheet automation)

1. Add Codex prompt + register workflow: return CSV/manifest as **GitHub issue comment** on #249 (task ID in `CODEX_TASK_REGISTER_V1.md`).
2. Cursor validates (reuse `codex-outbox-validate.mjs` rules) → `artifacts/codex-imports/<task-id>/` via PR.
3. Post digest + `JE` row when first end-to-end path completes without `C:\CorpFlow\codex-outbox\` in the loop.
4. **Parallel:** `Laptop-Burn-down-P0-Control-Loop-Closeout-1` (verify GHA secrets — may already be done).

**Not in first slice:** server codex_drop SFTP, Codex Cloud GitHub App install (separate activation packet), email inbound pilot, heartbeat Stage 2.

## 12. Cross-references

- `docs/execution/LAPTOP_DEPENDENCY_BURN_DOWN_V1.md` — P0–P2 burn-down queue.
- `docs/execution/DELIVERY_ACCELERATION_V1.md` — multi-executor protocol.
- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` — gate for any off-laptop job.
- `docs/operations/CODEX_OUTBOX_LOCAL_V1.md` — current L1 outbox (to be superseded for handoff bytes).
- `docs/operations/CODEX_TASK_REGISTER_V1.md` — Codex task tracking.
- `docs/operations/PARALLEL_EXECUTION_BOARD_V1.md` — lanes + WIP.
- `docs/operations/OPERATOR_BRIDGE_V1.md` — #249 protocol.
- `docs/operations/EMAIL_AUTOMATION_INBOUND_OUTBOUND_WORKFLOW_V1.md` — email off laptop (#486).
- `docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md` — throughput heartbeat (#495).

## 13. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs/plan only.
- **Implementation:** none. No runtime, env, secrets, DB, deploy.
- **Verdict:** PARTIAL by design — migration model + bucket table documented; implementation packets are separate + gated.
