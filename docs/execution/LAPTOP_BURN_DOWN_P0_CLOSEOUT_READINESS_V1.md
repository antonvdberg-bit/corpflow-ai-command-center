# Laptop Burn-down P0 close-out / cron-auth-normalization readiness v1

**Packet ID:** `Laptop-Burn-down-P0-Closeout-Readiness-1`

**Status:** Readiness findings — **no runtime change in this PR.**

**Verdict:** `FIRST BURN-DOWN IMPLEMENTATION PATH IDENTIFIED — AWAITING ANTON APPROVAL FOR ANY RUNTIME CHANGE`

**Owner:** Anton (approver). **Executor:** Cursor (readiness author).

**Captured:** 2026-06-18.

**Parent plan:** `docs/execution/LAPTOP_DEPENDENCY_BURN_DOWN_V1.md` §5.1–5.2

**Companion docs:**

- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`
- `docs/operations/FACTORY_CONTROL_LOOP.md`
- `docs/operations/OPERATOR_BRIDGE_DIGEST_V1.md`
- `lib/server/factory-master-auth.js` — `verifyFactoryMasterOrCronBearer` pattern

---

## 1. Executive summary

| Track | Readiness | Next step |
| ----- | --------- | --------- |
| **P0 factory-control-loop close-out** | **Mostly complete** — workflow live; last 3 scheduled runs **green** (2026-06-15 → 2026-06-17) | Anton confirms repo secrets via presence-only step in latest run log; post `#249` STATUS |
| **P1 Change Console smoke (GHA)** | **Blocked** — smoke script needs factory master today | **Approve Packet A** (auth-normalization) then Packet B (workflow) |
| **P1 Lux smokes** | **Not ready for prod schedule** — mutating or tenant-login bound | Defer; design read-only public GET subset later |
| **P2 PowerShell** | **Operator-only** | Port to `.mjs` when convenient; never schedule |

**This PR authorizes nothing on production.** It records findings and proposes the smallest safe auth-normalization path before any scheduled smoke workflow.

---

## 2. P0 close-out — `factory-control-loop`

### 2.1 What is already done

| Item | Evidence |
| ---- | -------- |
| Workflow on L2 | `.github/workflows/factory-control-loop.yml` — daily `0 6 * * *` UTC + `workflow_dispatch` |
| No `MASTER_ADMIN_KEY` | Uses `CORPFLOW_FACTORY_HEALTH_URL`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` only |
| Recent runs | GitHub Actions runs **success** on 2026-06-15, 2026-06-16, 2026-06-17 (workflow `factory-control-loop.yml`) |
| Read-only | Does not trigger deploy hook |

### 2.2 What Anton still verifies (operator close-out)

Open the **latest** green run → step **Show optional integration status** → confirm each line is **`configured`**, not **`SKIPPED`**:

| Repo secret | Enables |
| ----------- | ------- |
| `CORPFLOW_FACTORY_HEALTH_URL` | Factory health probe |
| `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` | Production SHA vs `origin/main` |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` | Failure alert (optional but recommended) |
| `VERCEL_TEAM_ID` | Only if project is team-scoped |

**First verification command (operator):**

```bash
gh run list --workflow=factory-control-loop.yml --limit 1 --json url,conclusion
```

Open the run URL → read presence-only step output.

**Rollback:** Disable workflow schedule in `.github/workflows/factory-control-loop.yml` (separate PR) or pause in GitHub Actions UI.

**Audit trail:** GHA run log + `factory-control-loop-report` artifact (7-day retention).

**P0 close-out verdict when secrets confirmed:** `COMPLETE` — laptop not required for daily drift detection.

---

## 3. Candidate status table (read-only / smoke migration)

| Candidate route / script | Proposed L2 home | Current auth | `MASTER_ADMIN_KEY` today? | `CORPFLOW_CRON_SECRET` today? | Mutation risk | Ready for GHA schedule? |
| ------------------------ | ---------------- | ------------ | ------------------------- | ----------------------------- | ------------- | ----------------------- |
| `factory-control-loop.mjs` | GHA `factory-control-loop.yml` | Health URL + Vercel API | **No** | **N/A** | **None** | **Yes — live** |
| `factory-health-ping` (inline curl) | GHA `factory-health-ping.yml` | None (public health URL) | **No** | **N/A** | **None** | **Yes — live** |
| `GET /api/factory/cmp/ticket-summaries` | GHA `factory-cmp-drive.yml` | `verifyFactoryMasterOrCronBearer` | Optional | **Yes** | **Read-only GET** | **Yes — manual dispatch** |
| `POST /api/factory/cmp/push` | Same workflow | Cron Bearer | Optional | **Yes** | **Writes CMP/console** | **No** for read-only smoke goal |
| `GET /api/cmp/router?action=technical-lead-latest` | `smoke-change-console-technical-lead.mjs` | `requireDormantGate` → factory master or tenant session | **Yes** (or `SMOKE_COOKIE`) | **No** | **Read-only GET** | **No — blocked** |
| `GET /api/factory/technical-lead/audits` | Potential smoke target | `verifyFactoryMasterAuth` only | **Yes** | **No** | **Read-only GET** | **No — blocked** (auth) |
| `smoke-change-overflow.mjs` | GHA (future) | Tenant `LUX_SMOKE_USERNAME` / `PASSWORD` | **No** | **No** | **Read-only browser** | **Defer** — tenant creds in CI; Playwright weight |
| `smoke-lux-phase4c1-attachment-review.mjs` | Preview / manual | Tenant login | **No** | **No** | **High — POST mutations** | **No — forbidden for prod schedule** |
| PowerShell onboarding / schema / provision | Operator laptop | Factory master | **Yes** | **No** | **High** | **Never schedule** |

---

## 4. Per-candidate detail (P1 focus)

### 4.1 `smoke-change-console-technical-lead.mjs` (P1 — primary unblock)

| Field | Detail |
| ----- | ------ |
| **Script** | `scripts/smoke-change-console-technical-lead.mjs` |
| **Current auth** | `x-session-token` = `MASTER_ADMIN_KEY` / `ADMIN_PIN`, or `SMOKE_COOKIE` |
| **Proposed auth surface** | `Authorization: Bearer ${CORPFLOW_CRON_SECRET}` on a **factory** read-only route (see §5) |
| **Mutation risk** | **None** if limited to GET |
| **Audit trail** | GHA log; CMP route may emit `emitLogicFailure` on 403 only |
| **Rollback** | Revert auth change; disable workflow |
| **First verification** | `npm run smoke:change-technical-lead -- --ticket=<id>` locally with cron Bearer **after** Packet A deploy |

**Why CMP router is wrong surface for cron:** `verifyDormantGateCredentials` (`lib/cmp/router.js`) accepts admin session, factory master, or tenant JWT — **not** cron Bearer. Widening dormant gate globally would be over-broad.

### 4.2 `GET /api/factory/technical-lead/audits` (preferred normalization target)

| Field | Detail |
| ----- | ------ |
| **Route** | `GET /api/factory/technical-lead/audits?ticket_id=<id>&limit=1` |
| **Handler** | `lib/server/technical-lead-cron.js` → `handleTechnicalLeadAuditsList` |
| **Current auth** | `verifyFactoryMasterAuth` only |
| **Proposed auth** | `verifyFactoryMasterOrCronBearer` (same as `factory-cmp-ticket-summaries.js`) |
| **Mutation risk** | **None** — GET only |
| **Audit trail** | Standard factory API access; no new tables |
| **Rollback** | One-line auth revert in handler |
| **First verification** | `curl -sS -H "Authorization: Bearer $CORPFLOW_CRON_SECRET" "https://core.corpflowai.com/api/factory/technical-lead/audits?ticket_id=<id>&limit=1"` |

**Smoke script follow-up (Packet B):** Add optional `--factory-route` or env `SMOKE_USE_FACTORY_TL_AUDITS=1` so GHA never needs `MASTER_ADMIN_KEY`.

### 4.3 Alternative (not recommended first): widen `technical-lead-latest` CMP action

| Field | Detail |
| ----- | ------ |
| **Route** | `GET /api/cmp/router?action=technical-lead-latest&id=<id>` |
| **Proposed auth** | Add cron Bearer to `verifyDormantGateCredentials` for action `technical-lead-latest` only |
| **Risk** | Touches `lib/cmp/router.js` dormant gate — security-sensitive; broader blast radius than factory route |
| **Recommendation** | **Defer** unless factory route proves insufficient for Change Console smoke shape |

---

## 5. Proposed Packet A — minimal auth-normalization (runtime — **not in this PR**)

**Packet ID:** `Cron-Auth-Read-Only-Smoke-Normalization-1`

**Scope (if Anton approves):**

1. Change `handleTechnicalLeadAuditsList` auth from `verifyFactoryMasterAuth` → `verifyFactoryMasterOrCronBearer`.
2. Update handler docstring to document cron Bearer (mirror `factory-cmp-ticket-summaries.js`).
3. Add unit test in existing factory-auth test file if present.
4. **Do not** add GHA workflow in same PR (keep deploy + auth separate from schedule).

**Explicitly out of scope:**

- No `MASTER_ADMIN_KEY` in GitHub Actions secrets.
- No DB writes, tenant mutation, Vercel env writes, billing, n8n, restic, containers, L3.
- No change to `POST /api/factory/cmp/push` or cron routes that mutate.

**Security review:** Required per `docs/operations/SECURITY_REVIEW_CHECKLIST.md` (auth boundary change on `api/`).

**Migration checklist:** §2.1 prefer cron secret in CI; §2.3 read-only; §2.7 disable = revert auth line.

---

## 6. Proposed Packet B — Change Console smoke GHA (after Packet A deployed)

**Packet ID:** `Laptop-Burn-down-P1-Change-Console-Smoke-GHA-1`

| Field | Detail |
| ----- | ------ |
| **Workflow** | New `.github/workflows/smoke-change-console-technical-lead.yml` |
| **Trigger** | `workflow_dispatch` first; schedule only after green manual runs |
| **Secrets (names only)** | `CORPFLOW_CORE_BASE_URL`, `CORPFLOW_CRON_SECRET`, `CMP_SMOKE_CHANGE_TICKET_ID` |
| **`MASTER_ADMIN_KEY`?** | **Forbidden** |
| **Mutation risk** | **None** — GET only |
| **Depends on** | Packet A live on Production |

**Not authorized by this readiness PR.**

---

## 7. Routes already cron-capable (reference)

These already accept `Authorization: Bearer ${CORPFLOW_CRON_SECRET}` — use as patterns, not all are read-only:

| Route | Method | Read-only? |
| ----- | ------ | ---------- |
| `/api/factory/cmp/ticket-summaries` | GET | **Yes** |
| `/api/factory/cmp/push` | POST | **No** |
| `/api/cron/technical-lead` | GET/POST | **No** (runs observer, DB writes) |
| `/api/cmp/overseer-sweep-cron` | GET/POST | **No** |
| `/api/cmp/stuck-self-repair-cron` | GET/POST | **No** |
| `/api/cron/cmp-monitor` | GET/POST | Mixed — monitor only |
| `/api/cron/billing-sentinel` | GET/POST | Billing reads |

**Do not** schedule mutating cron routes as "smokes."

---

## 8. GitHub Actions secrets inventory (burn-down relevant)

| Secret | Used by | Required for P0 close-out? |
| ------ | ------- | -------------------------- |
| `CORPFLOW_FACTORY_HEALTH_URL` | control-loop, health-ping | **Recommended** |
| `VERCEL_TOKEN` | control-loop | **Recommended** |
| `VERCEL_PROJECT_ID` | control-loop | **Recommended** |
| `VERCEL_TEAM_ID` | control-loop | If team project |
| `TELEGRAM_BOT_TOKEN` | control-loop alert | Optional |
| `TELEGRAM_ALERT_CHAT_ID` | control-loop alert | Optional |
| `CORPFLOW_CRON_SECRET` | factory-cmp-drive; **future** smoke | Packet B |
| `CORPFLOW_CORE_BASE_URL` | factory-cmp-drive; **future** smoke | Packet B |
| `CMP_FACTORY_DRIVE_TICKET_IDS` | factory-cmp-drive | N/A for smoke |
| `CMP_SMOKE_CHANGE_TICKET_ID` | **future** Packet B | Not yet |

**Never add:** `MASTER_ADMIN_KEY`, `ADMIN_PIN`, `POSTGRES_URL`, tenant passwords to GHA.

---

## 9. Operator decision (Anton)

Choose one path:

| Option | Action | Runtime change? |
| ------ | ------ | --------------- |
| **A — P0 only** | Verify control-loop secrets + `#249` STATUS; stop | **No** |
| **B — P0 + Packet A** | Above, then approve Cursor PR for factory TL audits cron auth | **Yes** — minimal auth |
| **C — Full P1** | B, then Packet B workflow after Production deploy of A | **Yes** — auth + GHA |

**Recommended:** **Option B** — P0 operator verification can happen in parallel with Packet A review.

---

## 10. Holds (unchanged)

- No autonomous merge.
- No `MASTER_ADMIN_KEY` in CI unless explicitly approved and documented (default: **forbidden**).
- No DB writes / tenant mutation / Vercel env / billing / n8n / restic / containers / L3 from burn-down packets.
- No scheduled smokes in this readiness PR.

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-18 | P0 close-out findings + cron-auth normalization proposal for P1 smoke. |
