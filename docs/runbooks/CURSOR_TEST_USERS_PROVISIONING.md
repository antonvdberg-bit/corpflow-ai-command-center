# Cursor test users — admin + generic tenant smoke (#696)

**Goal:** prepare the existing Cursor provision/verify tooling for two dedicated non-human test identities without creating credentials, writing secrets, or mutating a database.

**Environment:** `corpflow_test` only. Not `client_production`.

## Approved identities

| Purpose | Username | Level | Membership |
|---|---|---|---|
| Admin/operator smoke | `cursor-test-admin@corpflowai.com` | `admin`, `factory_master=false` | none |
| Generic tenant smoke | `cursor-test-tenant@corpflowai.com` | `tenant` | only explicitly approved `corpflow_test` tenants |

The former live target `cursor-test-lux@corpflowai.com` must not be created. The generic tenant smoke identity may initially receive membership to `luxe-maurice` for Lux verification. Additional memberships, including a future CIPC Desk test tenant, require explicit approval. It must never receive automatic access to every tenant.

The current scripts retain the internal key `lux` temporarily to avoid a broad refactor of already-merged tooling. That key is an implementation compatibility detail only; the canonical username is `cursor-test-tenant@corpflowai.com`.

## Runtime variable names

Preferred variables:

```text
CURSOR_TEST_ADMIN_USERNAME
CURSOR_TEST_ADMIN_PASSWORD
TENANT_SMOKE_USERNAME
TENANT_SMOKE_PASSWORD
TENANT_SMOKE_TENANT_ID
TENANT_SMOKE_BASE_URL
CURSOR_TEST_ADMIN_LOGIN_BASE_URL
```

Temporary deprecated aliases, only where an older caller still requires them:

```text
LUX_SMOKE_USERNAME -> TENANT_SMOKE_USERNAME
LUX_SMOKE_PASSWORD -> TENANT_SMOKE_PASSWORD
LUX_SMOKE_TENANT_ID -> TENANT_SMOKE_TENANT_ID
LUX_SMOKE_BASE_URL -> TENANT_SMOKE_BASE_URL
```

A deprecated `LUX_SMOKE_*` alias must point to `cursor-test-tenant@corpflowai.com`; it must never imply or provision a Lux-only user. New configuration must use `TENANT_SMOKE_*`.

Do not place these values in GitHub, chat, screenshots, artifacts, or the web application's Vercel environment. Password values belong only in an approved secret store or protected test runtime after Anton authorises the protected handoff.

## Tooling

| Script | Purpose |
|---|---|
| `scripts/provision-cursor-test-users.mjs` | Dry-run or protected upsert through the existing `auth_users` and tenant-membership model |
| `scripts/verify-cursor-test-users.mjs` | Verify DB shape, login and authorization boundaries without printing secrets |
| `scripts/lib/cursor-test-users-spec.mjs` | Canonical usernames, runtime names, labels and packet formatting |

The provisioning plan now resolves to:

```text
cursor-test-admin@corpflowai.com
cursor-test-tenant@corpflowai.com
```

For the initial Lux test, the generic tenant identity may be granted only the approved `luxe-maurice` membership. Membership notes remain marked `TEST_ONLY | NON_HUMAN | CURSOR_AUTOMATION`.

## Safety rules

- No live provisioning from a PR or agent path.
- No password generation during implementation or review.
- No secret, Vercel environment, Production Neon, schema, deployment, messaging, payment, or external-send mutation.
- Reuse only `auth_users` and the existing tenant membership model.
- Keep admin `factory_master=false`.
- Never broaden the tenant identity beyond explicitly approved test tenants.
- Protected actions stop with `ANTON UNLOCK REQUIRED`.

## Safe pre-handoff checks

```powershell
npm run provision:cursor-test-users -- --dry-run
node --test node-tests/cursor-test-users-spec.test.mjs
npm run verify:cursor-test-users -- --packet
```

Expected dry-run identities:

```text
admin.username=cursor-test-admin@corpflowai.com
tenant.username=cursor-test-tenant@corpflowai.com
tenant.membership_policy=approved_corpflow_test_tenants_only
```

The unit test deliberately rejects `cursor-test-lux@corpflowai.com` as the canonical live target.

## Protected handoff — not authorised by this implementation slice

Only after explicit Anton approval, an operator on a secure machine may:

1. Provide `POSTGRES_URL` through the approved secure channel.
2. Run `npm run provision:cursor-test-users -- --gen-password`.
3. Store the two generated credentials only in the approved secret store/protected runtime using `CURSOR_TEST_ADMIN_*` and `TENANT_SMOKE_*`.
4. Run `npm run verify:cursor-test-users -- --db-shape --live --packet`.
5. Post only the non-secret result packet on #696.

Until that approval is given:

```text
ANTON UNLOCK REQUIRED
Final verdict: READY FOR PROTECTED HANDOFF
```

## Required non-secret status packet

```text
CURSOR TEST ACCESS ALIGNMENT

admin.username=cursor-test-admin@corpflowai.com
tenant.username=cursor-test-tenant@corpflowai.com
tenant.initial_approved_membership=luxe-maurice
tenant.membership_policy=approved_corpflow_test_tenants_only
former_lux_only_target_live=false
preferred_runtime_vars=CURSOR_TEST_ADMIN_*,TENANT_SMOKE_*
legacy_aliases=LUX_SMOKE_* deprecated compatibility only
live_provisioning=not_performed
secrets_written=false
database_mutation=false

Final verdict: READY FOR PROTECTED HANDOFF
```
