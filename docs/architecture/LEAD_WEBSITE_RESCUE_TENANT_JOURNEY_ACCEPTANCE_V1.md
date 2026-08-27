# Lead + Website Rescue Tenant progress and review/change journey acceptance v1

**Issue:** [#1175](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1175)
**Sources on current `main`:** merged [#1169](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1169) (#1165) · [#1124](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1124) (#1120) · [#1077](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1077) (#1073)
**Environment:** `corpflow_test` Tenant Workspace. This packet does not authorize `client_production`.
**No schema. No env/secrets. No deploy. No external send. No factory/orchestration work. No new tenant model.**

<!-- LEAD_WEBSITE_RESCUE_TENANT_JOURNEY_ACCEPTANCE_V1 -->

## 0. What is true when this acceptance is done

A client can use the **already-merged** Tenant Workspace journey for Lead Rescue or Website Rescue:

`Tenant Workspace → Requests & Progress → client-safe stage and next action → deliberately exposed review evidence only → existing review action (Lead Rescue preview) or view-only exposed preview (Website Rescue) → Service & change on /change`

Internal Core / commercial / Prospect / Delivery detail stays fail-closed to Tenant sessions.

## 1. Exact routes

| Step | Route |
| --- | --- |
| Tenant Workspace | `/app/tenant` |
| Lead Rescue progress | `/app/tenant?id=syn_lr_delivery_corpflowai_001` |
| Website Rescue progress | `/app/tenant?id=syn-1151-wr-tenant-progress` |
| Service & change | `/change?from=tenant-workspace&tenant_id=corpflowai` |
| Return | `/app/tenant?from=change&tenant_id=corpflowai` |

Staff-only (Tenant session 403 on APIs; not tenant-operable pages): `/app/prospects`, `/app/commercial`, `/app/delivery`.

Synthetic identifiers (proof/local fixtures only):

- Tenant: `corpflowai`
- Lead Rescue request: `syn_lr_delivery_corpflowai_001`
- Lead Rescue delivery record: `synthetic-lr-client-review`
- Website Rescue request: `syn-1151-wr-tenant-progress`

## 2. Journey contract (unchanged systems)

1. One Tenant session lists **both** Lead Rescue and Website Rescue rows in Requests & Progress (plus existing ticket rows).
2. Stage and next action are client-safe labels. Operator notes, commercial/payment, scoring, credentials, GitHub/PR, and cross-tenant records are absent.
3. Lead Rescue preview is reviewable only when `exposed_for_client_review === true` (#884). Setup check stays view-only.
4. Website Rescue preview is a deliberately exposed **link** only. Ticket review APIs do not approve the Website Rescue delivery record.
5. `POST /api/app/component-review` persists on exposed ticket components. Navigation to `/change` does **not** create a ticket.
6. Staff Prospect, Commercial, and Delivery APIs stay fail-closed to Tenant sessions.

## 3. Verification

```bash
node --test node-tests/tenant-delivery-progress-review-change-acceptance.test.mjs
node scripts/tenant-delivery-progress-review-change-probe-evidence.mjs
# optional desktop/mobile screenshots (starts local Next unless NEXT_SKIP_SPAWN=1)
NEXT_PORT=3057 node scripts/tenant-delivery-progress-review-change-capture-screenshots.mjs
```

Also reuse:

```bash
node --test \
  node-tests/lead-rescue-tenant-delivery-progress.test.mjs \
  node-tests/website-rescue-tenant-progress.test.mjs \
  node-tests/tenant-client-journey-acceptance.test.mjs \
  node-tests/tenant-journey-continuity.test.mjs
```

Promptfoo / AI eval: **NOT APPLICABLE** — Tenant request projection, existing #884 review, and `/change` continuity only. No AI behaviour, prompts, drafting, model routing, tenancy-prompt handling, escalation, or protected-action AI handling changed.

## 4. corpflow_test URLs (already on current-main Production)

- `https://core.corpflowai.com/app/tenant`
- `https://lux.corpflowai.com/app/tenant`
- `https://core.corpflowai.com/change?from=tenant-workspace`
- `https://lux.corpflowai.com/change`

Authenticated synthetic progress uses proof/local fixtures. This packet does not log in as a live client or mutate production data.

## 5. Explicit non-actions

- No merge, deploy, secrets/env, schema/data mutation, external send, spend, or protected-action bypass
- No second client portal, CRM, or review system
- No factory / relay / orchestrator / watchdog work
- No replacement of `/change`
