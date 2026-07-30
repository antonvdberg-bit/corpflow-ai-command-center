# Cursor test access v1 — dedicated admin + Lux tenant identities (#696)

**Status:** Tooling landed in-repo. **Live provisioning and secret handoff remain a protected operator action** (`approval:env-secrets` / production DB write).  
**Environment:** `corpflow_test` (CorpFlowAI-hosted surfaces).  
**Anchor:** `<!-- CURSOR_TEST_ACCESS_V1 -->`

<!-- CURSOR_TEST_ACCESS_V1 -->

## 1. Objective

Provision two non-human, test-only `auth_users` rows so Cursor can exercise authenticated CorpFlowAI admin and Lux tenant workflows **without using Anton's personal account**.

| Handle | Username (`auth_users.username`) | Level | Scope |
|--------|----------------------------------|-------|--------|
| `cursor-test-admin` | `cursor-test-admin@corpflowai.com` | `admin` | Core / factory **session** surfaces; `factory_master=false` |
| `cursor-test-lux` | `cursor-test-lux@corpflowai.com` | `tenant` | `luxe-maurice` only (`https://lux.corpflowai.com`) |

Labels (no schema change — encoded in membership notes + automation audit payload):

`TEST_ONLY` · `NON_HUMAN` · `CURSOR_AUTOMATION`

## 2. Trust model

- Reuses existing Postgres `auth_users` + `user_tenant_memberships` (same as `scripts/provision-tenant-test-access.mjs`).
- **No** second auth system, **no** schema migration, **no** parallel user store.
- Passwords are generated with `--gen-password`, printed **once** to the operator terminal, then stored only in the approved password manager / Cursor protected runtime secrets.
- **Never** put passwords, reset links, tokens, cookies, or session material in GitHub, PR bodies, issue comments, chat, logs, screenshots, or `artifacts/`.
- Rotation: re-run provision with `--apply --gen-password` (overwrites hash/salt).
- Disable when idle: `--apply --disable` (sets `enabled=false`).
- Audit: provision writes `automation_events.event_type = ops.cursor_test_access.provisioned.v1` with **non-secret** identity metadata.

### Least privilege notes

| Identity | Intended bound |
|----------|----------------|
| Admin | `level=admin`, **`factory_master=false`**, `tenant_id=null`. Does **not** receive membership expansion to every tenant. |
| Admin (inseparable today) | Any `typ=admin` session still satisfies `verifyFactoryMasterAuth` (cookie path). Payment, deploy, env/secret writes, and live external send remain behind **separate** protected gates / secrets (`PROTECTED_ACTION_GATES_V1`, Vercel, n8n). This PR does **not** broaden those gates. |
| Lux | `level=tenant`, `tenant_id=luxe-maurice`, membership notes labelled. Denied factory-only CMP actions and Core `auth-users` list. |

## 3. Operator provision (protected — Anton)

Requires `POSTGRES_URL` pointing at the **same Neon DB** as Vercel Production.

```powershell
# Dry-run (safe — default)
node scripts/provision-cursor-test-access.mjs

# Apply + generate passwords (copy wallet cards into password manager immediately)
node scripts/provision-cursor-test-access.mjs --apply --gen-password
```

Optional:

```powershell
node scripts/provision-cursor-test-access.mjs --apply --admin-only --gen-password
node scripts/provision-cursor-test-access.mjs --apply --lux-only --gen-password
node scripts/provision-cursor-test-access.mjs --apply --disable
node scripts/provision-cursor-test-access.mjs --apply --enable
```

## 4. Cursor / CI runtime variable names

Documented names only — **values are never committed**.

| Variable | Purpose |
|----------|---------|
| `CURSOR_TEST_ADMIN_USERNAME` | Admin login username |
| `CURSOR_TEST_ADMIN_PASSWORD` | Admin login password |
| `CURSOR_TEST_ADMIN_BASE_URL` | Optional; default `https://core.corpflowai.com` |
| `LUX_SMOKE_USERNAME` | Lux tenant login (set to `cursor-test-lux@corpflowai.com`) |
| `LUX_SMOKE_PASSWORD` | Lux tenant password |
| `LUX_SMOKE_TENANT_ID` | Optional; default `luxe-maurice` |
| `LUX_SMOKE_BASE_URL` | Optional; default `https://lux.corpflowai.com` |

Where to store values:

- Local operator: `.env.local` (gitignored)
- Cursor Cloud / agent protected secrets: same names
- GitHub Actions (if a workflow needs Lux smoke): repository secrets of the same names
- **Do not** put these on Vercel project env (scripts run from operator/CI machines)

Placeholders (empty values) are listed in `.env.template`.

## 5. Verify (after secret handoff)

```powershell
npm run verify:cursor-test-access
# Optional: exercise a notes_append on one Lux lead
npm run verify:cursor-test-access -- --allow-mutations
```

Writes non-secret summary to `artifacts/cursor-test-access/verify-result.json`.

Also compatible with existing `npm run smoke:change-overflow` once `LUX_SMOKE_*` points at `cursor-test-lux`.

## 6. Secure handoff checklist (still required if not done)

1. Anton runs provision with `--apply --gen-password` against production Neon.
2. Anton stores both wallet cards in the approved vault (Cursor test entries).
3. Anton sets Cursor protected runtime secrets / local `.env.local` with the variable names in §4 (**no values in GitHub**).
4. Operator or Cursor runs `npm run verify:cursor-test-access` (and optionally `--allow-mutations`).
5. Fill the READY packet below with non-secret evidence and set the verdict.

## 7. CURSOR TEST ACCESS READY packet

Copy/fill on the issue after live provision + verify. **No secrets.**

```text
CURSOR TEST ACCESS READY

Issue: #696
Environment: corpflow_test

Identities (non-secret):
- Admin username: cursor-test-admin@corpflowai.com
  user_id: <from provision stdout / auth_users.id>
  level: admin
  factory_master: false
  tenant_id: (null)
  labels: TEST_ONLY | NON_HUMAN | CURSOR_AUTOMATION
- Lux username: cursor-test-lux@corpflowai.com
  user_id: <from provision stdout / auth_users.id>
  level: tenant
  tenant_id: luxe-maurice
  membership_notes: TEST_ONLY|NON_HUMAN|CURSOR_AUTOMATION|#696
  labels: TEST_ONLY | NON_HUMAN | CURSOR_AUTOMATION

Login proof (no secrets):
- Admin: POST https://core.corpflowai.com/api/auth/login → 200 level=admin source=postgres
  GET /api/auth/me → logged_in=true username=cursor-test-admin@corpflowai.com
- Lux: POST https://lux.corpflowai.com/api/auth/login → 200 level=tenant tenant_id=luxe-maurice
  GET /change → 200
  GET /api/auth/me → logged_in=true tenant_id=luxe-maurice

Authorization boundary results:
- Admin factory_master=false (confirmed in provision stdout)
- Admin cannot perform protected deploy/payment/env writes without separate Anton approval gates
- Lux denied factory provision-tenant-pin
- Lux denied Core /api/factory/auth-users/list
- Lux no live-send token/webhook leak on password-reset probe
- Lux concierge-leads-list / ticket-operator-queue: <pass/fail>
- Lux mutation (--allow-mutations): <pass/fail/skipped>

Audit-log evidence:
- automation_events.event_type=ops.cursor_test_access.provisioned.v1 present (no password fields)
- verify summary path: artifacts/cursor-test-access/verify-result.json (no secrets)

Secure handoff still required:
- [ ] / [x] Vault + Cursor runtime secrets populated for CURSOR_TEST_ADMIN_* and LUX_SMOKE_*

Final verdict: READY FOR CURSOR AUTHENTICATED TESTING / NOT READY
```

### Current packet status (this PR)

```text
CURSOR TEST ACCESS READY

Issue: #696
Environment: corpflow_test

Identities (non-secret):
- Admin username: cursor-test-admin@corpflowai.com
  user_id: (not provisioned in this agent run — POSTGRES_URL unset; DB write gated)
  level: admin (planned)
  factory_master: false (planned)
  tenant_id: (null)
  labels: TEST_ONLY | NON_HUMAN | CURSOR_AUTOMATION
- Lux username: cursor-test-lux@corpflowai.com
  user_id: (not provisioned in this agent run)
  level: tenant (planned)
  tenant_id: luxe-maurice
  membership_notes: TEST_ONLY|NON_HUMAN|CURSOR_AUTOMATION|#696
  labels: TEST_ONLY | NON_HUMAN | CURSOR_AUTOMATION

Login proof: NOT RUN (credentials not in agent environment by design)
Authorization boundary results: NOT RUN
Audit-log evidence: tooling writes event on --apply; not yet executed against production DB

Secure handoff still required:
- [x] Exact step: Anton runs `node scripts/provision-cursor-test-access.mjs --apply --gen-password`
      then stores wallet cards in vault and sets Cursor/.env.local vars (names in §4).
- [ ] Then run `npm run verify:cursor-test-access` and paste non-secret PASS lines into the packet.

Final verdict: NOT READY
```

## 8. Explicit non-actions

- No merge to `main` by the agent.
- No production deploy.
- No Vercel / GitHub secret value writes from the agent.
- No schema migrations.
- No client-facing email / WhatsApp / SMS / payment / outreach.
- No broadening of `factory_master` or env-bootstrap admin privileges.

## 9. Related

- Issue [#696](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/696)
- Related: #693, #695, #651
- `docs/runbooks/CHANGE_CONSOLE_INSPECTION.md` (Lux smoke path)
- `docs/operations/TENANT_CLIENT_LOGIN.md`
- `docs/operations/PROTECTED_ACTION_GATES_V1.md`
- `scripts/provision-tenant-test-access.mjs` (generic tenant provisioner; still valid)
- `scripts/provision-cursor-test-access.mjs` / `scripts/verify-cursor-test-access.mjs`
