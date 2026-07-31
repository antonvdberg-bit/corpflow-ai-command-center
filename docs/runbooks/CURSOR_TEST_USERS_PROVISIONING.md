# Cursor test users — admin + Lux tenant (#696)

**Goal:** dedicated non-human test identities so Cursor can exercise authenticated CorpFlowAI and Lux (`luxe-maurice`) workflows without using Anton’s personal account.

**Environment:** `corpflow_test` (CorpFlowAI-hosted). Not `client_production`.

**Canonical tooling:**

| Script | npm | Purpose |
|--------|-----|---------|
| `scripts/provision-cursor-test-users.mjs` | `npm run provision:cursor-test-users` | Upsert both identities into existing `auth_users` (+ Lux membership notes) |
| `scripts/verify-cursor-test-users.mjs` | `npm run verify:cursor-test-users` | DB shape + live login/boundary evidence (no secrets in output) |
| `scripts/lib/cursor-test-users-spec.mjs` | — | Stable usernames, metadata labels, runtime env names |

Related: Lux `/change` smoke — `docs/runbooks/CHANGE_CONSOLE_INSPECTION.md`. Tenancy — `docs/operations/TENANT_CLIENT_LOGIN.md`.

---

## 1. Identities (non-secret)

| Key | Username (`auth_users.username`) | Level | Tenant | `factory_master` | Membership |
|-----|----------------------------------|-------|--------|------------------|------------|
| admin | `cursor-test-admin@corpflowai.com` | `admin` | `null` | **`false`** | none (by design) |
| lux | `cursor-test-lux@corpflowai.com` | `tenant` | `luxe-maurice` | `false` | `role=member`, notes mark `TEST_ONLY \| NON_HUMAN \| CURSOR_AUTOMATION` |

Labels `TEST_ONLY`, `NON_HUMAN`, `CURSOR_AUTOMATION` are stored on the Lux `user_tenant_memberships.notes` row. `auth_users` has no metadata column (schema change not authorized for #696); the admin identity is identified by its stable username + operator docs.

---

## 2. Security rules (non-negotiable)

- Never put passwords, reset links, tokens, cookies, or session material in GitHub, chat, PRs, screenshots, or `artifacts/`.
- Generate passwords only via `--gen-password` (wallet card printed once to the operator terminal).
- Store values only in the approved secret store and/or Cursor **protected agent runtime**.
- Reuse existing `auth_users` / membership tables — no second auth system.
- Rotate: re-run provision with `--gen-password` (overwrites hash/salt).
- Disable when idle: `npm run provision:cursor-test-users -- --disable`.
- No live email / WhatsApp / SMS / payment / production deploy from these identities without a separate Anton protected-action gate.

---

## 3. Privilege model (honest least privilege)

### Lux (`cursor-test-lux`)

- Session `typ=tenant`, `tenant_id=luxe-maurice`.
- Allowed: Lux `/change` dormant-gate CMP actions (queue, ticket get/update paths used by Change Console, concierge lead CRM on Lux host).
- Denied: `requireFactoryMasterOnly` / factory APIs; other tenants’ tickets (`404` / `403`).
- Live outbound send is not exercised by the verify script; product gates still apply.

### Admin (`cursor-test-admin`)

- Session `typ=admin`, `factory_master=false`.
- **Intended:** authenticated admin/operator smoke on Core (`corpflow_test`) without promoting a second factory master.
- **DB-gated APIs** that require `auth_users.factory_master=true` (e.g. `GET /api/factory/operator-activity`, `GET /api/membership/list`) **deny** this user — verify script asserts that.
- **Inseparable today:** `verifyFactoryMasterAuth()` accepts any `typ=admin` session. Payment / some factory routes that only check that helper remain reachable in-code. Cursor and operators **must not** use this identity for billing, payment, secret/env management, user deletion, production deploy, or external send without a separate Anton approval. Tightening `verifyFactoryMasterAuth` to require `factory_master` is a **future** security change (out of scope for #696; do not broaden privileges here).

---

## 4. Secure runtime variable names

Documented in `.env.template` (placeholders only):

| Variable | Identity |
|----------|----------|
| `CURSOR_TEST_ADMIN_USERNAME` | admin username |
| `CURSOR_TEST_ADMIN_PASSWORD` | admin password |
| `CURSOR_TEST_ADMIN_LOGIN_BASE_URL` | optional; default `https://core.corpflowai.com` |
| `LUX_SMOKE_USERNAME` | lux username (`cursor-test-lux@corpflowai.com`) |
| `LUX_SMOKE_PASSWORD` | lux password |
| `LUX_SMOKE_TENANT_ID` | default `luxe-maurice` |
| `LUX_SMOKE_BASE_URL` | default `https://lux.corpflowai.com` |

**Do not** put these on Vercel project env for the web app. They belong on the operator machine / CI runner / Cursor protected runtime that executes smoke scripts.

Legacy smoke username `lux-smoke@corpflowai.com` remains valid if already provisioned; new #696 canonical Lux test user is `cursor-test-lux@corpflowai.com`. Point `LUX_SMOKE_USERNAME` at the identity you provisioned.

---

## 5. Operator provision steps (protected — Anton / factory master machine)

These steps **write Postgres** and **handle secrets**. They are **not** performed by the Cloud Agent PR path when the dispatch gate is `secrets` / “no DB / no env”.

```powershell
# 1) On a secure operator machine (not in chat), set Production POSTGRES_URL once in the shell.
$env:POSTGRES_URL = "<from Vercel Production — never commit>"

# 2) Preview (optional):
npm run provision:cursor-test-users -- --dry-run

# 3) Create / rotate both users; copy wallet cards into 1Password / Bitwarden / Cursor protected runtime:
npm run provision:cursor-test-users -- --gen-password

# 4) Set local/runtime env (gitignored .env.local) — values from wallet cards only:
# CURSOR_TEST_ADMIN_USERNAME=cursor-test-admin@corpflowai.com
# CURSOR_TEST_ADMIN_PASSWORD=...
# LUX_SMOKE_USERNAME=cursor-test-lux@corpflowai.com
# LUX_SMOKE_PASSWORD=...

# 5) Verify (prints CURSOR TEST ACCESS READY packet; never prints passwords):
npm run verify:cursor-test-users -- --db-shape --live --packet
```

Disable when not testing:

```powershell
npm run provision:cursor-test-users -- --disable
# later:
npm run provision:cursor-test-users -- --enable
```

---

## 6. Verification expectations

### Admin

| Check | Expected |
|-------|----------|
| Login at Core `/login` (admin level) | `200`, `level=admin` |
| Reach admin/operator surfaces that need `typ=admin` | yes |
| `operator-activity` / `membership/list` without `factory_master` | `401`/`403` |
| Payment / deploy / secret / external-send | **not** exercised; require separate Anton gate |
| Audit | actions attributed to this `auth_users.id` where IM-7 actor fields are populated |

### Lux

| Check | Expected |
|-------|----------|
| Login at `https://lux.corpflowai.com/change` path via `/login` | `level=tenant`, `tenant_id=luxe-maurice` |
| View Lux synthetic / concierge leads | `concierge-leads-list` succeeds on Lux host |
| Stage / notes / qualification / shortlist | allowed via existing Lux tenant CMP actions (manual or follow-on smoke) |
| Other tenant / Core admin | denied |
| Live sends | not triggered by verify script |

---

## 7. `CURSOR TEST ACCESS READY` packet template

Paste after `npm run verify:cursor-test-users -- --db-shape --live --packet` succeeds. **Never** include passwords.

```text
CURSOR TEST ACCESS READY

Identities (non-secret):
  admin.username=cursor-test-admin@corpflowai.com
  admin.id=<cuid>
  admin.level=admin
  admin.factory_master=false
  lux.username=cursor-test-lux@corpflowai.com
  lux.id=<cuid>
  lux.level=tenant
  lux.tenant_id=luxe-maurice
  lux.membership.notes_marked=true
  metadata_labels=TEST_ONLY,NON_HUMAN,CURSOR_AUTOMATION

Assigned roles / memberships:
  admin: level=admin, factory_master=false
  lux: level=tenant, tenant_id=luxe-maurice, membership.role=member

Proof of successful login:
  - [PASS] live.admin.login
  - [PASS] live.lux.login

Authorization boundary test results:
  - [PASS] live.admin.operator_activity_denied_without_factory_master
  - [PASS] live.lux.core_admin_denied
  - [PASS] live.lux.cross_tenant_ticket_denied

Audit-log evidence:
  - actor_user_id on subsequent CMP writes; operator-activity inspection under factory_master session

Secure handoff still required:
  - none  (or list remaining secret-store placement if CI/Cursor runtime not yet seeded)

Final verdict: READY FOR CURSOR AUTHENTICATED TESTING
```

If provision or secret placement is still pending:

```text
Final verdict: NOT READY
```

---

## 8. What the #696 PR ships vs what remains protected

| In PR (safe) | Protected follow-up (Anton / operator) |
|--------------|----------------------------------------|
| Spec module, provision + verify scripts | Run provision against Production Postgres |
| Runbook + `.env.template` **names** | Store passwords in secret store / Cursor runtime |
| Dry-run + unit tests | Live `--db-shape --live` evidence on corpflow_test |
| Honest privilege documentation | Optional later: tighten `verifyFactoryMasterAuth` to require `factory_master` |

Until the protected follow-up is done, the packet verdict remains **NOT READY**.
