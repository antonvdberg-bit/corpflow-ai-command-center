# Cursor test users — admin + generic tenant smoke (#696)

**Goal:** dedicated non-human test identities so Cursor can exercise authenticated CorpFlowAI and approved `corpflow_test` tenant workflows without using Anton’s personal account.

**Environment:** `corpflow_test` (CorpFlowAI-hosted). Not `client_production`.

**Approved credential model (Anton follow-up after #698):**

| Identity | Username | Scope |
|----------|----------|-------|
| Admin | `cursor-test-admin@corpflowai.com` | CorpFlowAI admin test access (`factory_master=false`) |
| Tenant smoke | `cursor-test-tenant@corpflowai.com` | Generic tenant automation identity — grant only approved test-tenant memberships as needed |

**Do not create** `cursor-test-lux@corpflowai.com` as a Lux-only account. That username is forbidden as a live provision target.

**Canonical tooling:**

| Script | npm | Purpose |
|--------|-----|---------|
| `scripts/provision-cursor-test-users.mjs` | `npm run provision:cursor-test-users` | Upsert both identities into existing `auth_users` (+ approved memberships) |
| `scripts/verify-cursor-test-users.mjs` | `npm run verify:cursor-test-users` | DB shape + live login/boundary evidence (no secrets in output) |
| `scripts/lib/cursor-test-users-spec.mjs` | — | Stable usernames, allowlist, metadata labels, runtime env names |

Related: Lux `/change` smoke — `docs/runbooks/CHANGE_CONSOLE_INSPECTION.md`. Tenancy — `docs/operations/TENANT_CLIENT_LOGIN.md`.

---

## 1. Identities (non-secret)

| Key | Username (`auth_users.username`) | Level | Primary `tenant_id` | `factory_master` | Memberships |
|-----|----------------------------------|-------|---------------------|------------------|-------------|
| admin | `cursor-test-admin@corpflowai.com` | `admin` | `null` | **`false`** | none (by design) |
| tenant | `cursor-test-tenant@corpflowai.com` | `tenant` | `luxe-maurice` (default) | `false` | only explicitly granted approved tenants; default grant: `luxe-maurice` |

Labels `TEST_ONLY`, `NON_HUMAN`, `CURSOR_AUTOMATION` are stored on each granted `user_tenant_memberships.notes` row. `auth_users` has no metadata column (schema change not authorized for #696); the admin identity is identified by its stable username + operator docs.

### Approved membership allowlist

Membership grants are **opt-in**, never “all tenants”:

- `luxe-maurice` (default)
- `cipc-desk` (when needed for active verification)
- future approved `corpflow_test` tenants only after allowlist update

Example:

```bash
npm run provision:cursor-test-users -- --only=tenant --tenants=luxe-maurice,cipc-desk --gen-password
```

Today’s login session scope still follows `auth_users.tenant_id` (primary). Additional memberships support the multi-tenant matrix / switch path; do not grant tenants that are not needed for the current verification.

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

### Tenant smoke (`cursor-test-tenant`)

- Session `typ=tenant`, primary `tenant_id` = granted primary (default `luxe-maurice`).
- Allowed: tenant `/change` dormant-gate CMP actions for granted tenants (queue, ticket get/update paths, concierge lead CRM on that tenant host).
- Denied: `requireFactoryMasterOnly` / factory APIs; tickets outside session tenant (`404` / `403`).
- Live outbound send is not exercised by the verify script; product gates still apply.
- Must remain unable to act as unrestricted Core admin.

### Admin (`cursor-test-admin`)

- Session `typ=admin`, `factory_master=false`.
- **Intended:** authenticated admin/operator smoke on Core (`corpflow_test`) without promoting a second factory master.
- **DB-gated APIs** that require `auth_users.factory_master=true` (e.g. `GET /api/factory/operator-activity`, `GET /api/membership/list`) **deny** this user — verify script asserts that.
- **Inseparable today:** `verifyFactoryMasterAuth()` accepts any `typ=admin` session. Payment / some factory routes that only check that helper remain reachable in-code. Cursor and operators **must not** use this identity for billing, payment, secret/env management, user deletion, production deploy, or external send without a separate Anton approval. Tightening `verifyFactoryMasterAuth` to require `factory_master` is a **future** security change (out of scope for #696; do not broaden privileges here).

---

## 4. Secure runtime variable names

Documented in `.env.template` (placeholders only):

| Variable | Identity | Notes |
|----------|----------|-------|
| `CURSOR_TEST_ADMIN_USERNAME` | admin username | preferred |
| `CURSOR_TEST_ADMIN_PASSWORD` | admin password | preferred |
| `CURSOR_TEST_ADMIN_LOGIN_BASE_URL` | optional; default `https://core.corpflowai.com` | |
| `TENANT_SMOKE_USERNAME` | tenant smoke username | **preferred** (`cursor-test-tenant@corpflowai.com`) |
| `TENANT_SMOKE_PASSWORD` | tenant smoke password | **preferred** |
| `TENANT_SMOKE_TENANT_ID` | optional; default `luxe-maurice` | primary tenant for probes |
| `TENANT_SMOKE_BASE_URL` | optional; default `https://lux.corpflowai.com` | host for live probes |
| `LUX_SMOKE_USERNAME` | temporary alias | map to **generic** `cursor-test-tenant@corpflowai.com` |
| `LUX_SMOKE_PASSWORD` | temporary alias | same password as `TENANT_SMOKE_PASSWORD` |
| `LUX_SMOKE_TENANT_ID` / `LUX_SMOKE_BASE_URL` | temporary aliases | Lux `/change` smoke scripts still read these |

**Do not** put these on Vercel project env for the web app. They belong on the operator machine / CI runner / Cursor protected runtime that executes smoke scripts.

Legacy smoke username `lux-smoke@corpflowai.com` remains valid if already provisioned for older workflows. New #696 canonical tenant smoke user is `cursor-test-tenant@corpflowai.com`.

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
# TENANT_SMOKE_USERNAME=cursor-test-tenant@corpflowai.com
# TENANT_SMOKE_PASSWORD=...
# Optional temporary aliases for existing Lux smoke scripts:
# LUX_SMOKE_USERNAME=cursor-test-tenant@corpflowai.com
# LUX_SMOKE_PASSWORD=...   # same value

# 5) Verify (prints CURSOR TEST ACCESS READY packet; never prints passwords):
npm run verify:cursor-test-users -- --db-shape --live --packet
```

Disable when not testing:

```powershell
npm run provision:cursor-test-users -- --disable
# later:
npm run provision:cursor-test-users -- --enable
```

If a legacy `cursor-test-lux@corpflowai.com` row was created by the pre-alignment tooling, disable or delete it after the generic tenant user is live — do not keep it as the Cursor smoke identity.

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

### Tenant smoke

| Check | Expected |
|-------|----------|
| Login at `https://lux.corpflowai.com/change` path via `/login` (when Lux membership granted) | `level=tenant`, primary tenant in approved allowlist |
| View Lux synthetic / concierge leads | `concierge-leads-list` succeeds on Lux host |
| Stage / notes / qualification / shortlist | allowed via existing tenant CMP actions (manual or follow-on smoke) |
| Other tenant / Core admin | denied (unless that other tenant was explicitly granted — still not Core admin) |
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
  tenant.username=cursor-test-tenant@corpflowai.com
  tenant.id=<cuid>
  tenant.level=tenant
  tenant.primary_tenant_id=luxe-maurice
  tenant.membership.tenants=luxe-maurice
  tenant.membership.notes_marked=true
  metadata_labels=TEST_ONLY,NON_HUMAN,CURSOR_AUTOMATION
  forbidden_usernames=cursor-test-lux@corpflowai.com

Assigned roles / memberships:
  admin: level=admin, factory_master=false
  tenant: level=tenant, membership.role=member (approved grants only)

Proof of successful login:
  - [PASS] live.admin.login
  - [PASS] live.tenant.login

Authorization boundary test results:
  - [PASS] live.admin.operator_activity_denied_without_factory_master
  - [PASS] live.tenant.core_admin_denied
  - [PASS] live.tenant.cross_tenant_ticket_denied

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

## 8. What tooling PRs ship vs what remains protected

| In PR (safe) | Protected follow-up (Anton / operator) |
|--------------|----------------------------------------|
| Spec module, provision + verify scripts | Run provision against Production Postgres |
| Runbook + `.env.template` **names** | Store passwords in secret store / Cursor runtime |
| Dry-run + unit tests | Live `--db-shape --live` evidence on corpflow_test |
| Honest privilege documentation | Optional later: tighten `verifyFactoryMasterAuth` to require `factory_master` |

Until the protected follow-up is done, the packet verdict remains **NOT READY**.
