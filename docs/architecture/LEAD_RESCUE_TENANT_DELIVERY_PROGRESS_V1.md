# Lead Rescue tenant delivery progress v1

**Issue:** [#1155](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1155)
**Current-main landing:** [#1165](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1165) (replaces competing PR #1157)
**Parents:** [#550](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/550) · [#715](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/715) · [#1124](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1124) · [#1006](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1006)
**Reuses:** Tenant Workspace / Requests & Progress · [#884](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/884) expose-for-review · canonical `/change` · `#715` Lead Rescue onboarding/delivery record
**Environment:** `corpflow_test` after merge/publish. This packet does not authorize `client_production`.
**No schema. No env/secrets. No deploy. No external send. No second CRM/portal. No live messaging.**

<!-- LEAD_RESCUE_TENANT_DELIVERY_PROGRESS_V1 -->

## 0. What is true when this slice is done

An authorised Lead Rescue client, signed into Tenant Workspace, can open **Requests & Progress** and see one tenant-safe row for their Lead Rescue setup:

- service name (**Lead Rescue**)
- high-level stage from the existing `#715` delivery record
- client-visible blocker and next action
- review/readiness on deliberately exposed evidence only
- Service & change still goes to `/change`

The `#715` delivery record remains the source of truth for `delivery_state`. This slice does not invent a second status model.

## 1. Identity join (fail-closed)

The `#715` onboarding/delivery JSON has **no** `tenant_id`. Marketing Lead Rescue intake `leads.tenantId` is the **intake tenant** (often shared `corpflowai`) and is **not** a safe client join.

This packet therefore binds only where existing Tenant request identity already exists:

| Side | Identity used |
| --- | --- |
| Tenant session / request row | existing `tenant_id` on the `cmp_tickets`-shaped request |
| Delivery record | named `#715` record id (`synthetic-lr-client-review` in the synthetic journey) |
| Join | explicit `console_json.lead_rescue_delivery.record_id` **plus** request `tenant_id` |

`bindLeadRescueDeliveryIdentity` returns `missing_tenant_id` or `missing_delivery_record_id` when either side is absent. Business name, email, and shared marketing-lead tenant are **not** used.

## 2. Tenant-safe fields (projected)

From the `#715` record, Tenant users see only:

- service name
- high-level stage / label
- client-visible blocker
- client next action
- review/readiness and deliberately exposed preview evidence

Not projected: operator notes, lead scoring/qualification, commercial/payment evidence, response rules, staff activity, messaging-runtime flags, credentials, or other-tenant records.

## 3. Surfaces

| Surface | Disposition |
| --- | --- |
| `/app/tenant` Requests & Progress | **REUSED** — extra Lead Rescue row/detail, not a new dashboard |
| `#884` review on `lead_rescue_preview` when `delivery_state=client_review` | **REUSED** |
| `/change?from=tenant-workspace` | **CANONICAL** — no live messaging |
| `/app/prospects`, `/app/commercial`, `/app/delivery` | **STAFF_ONLY_FAIL_CLOSED** |

Synthetic identifiers:

- Request: `syn_lr_delivery_corpflowai_001`
- Delivery record: `synthetic-lr-client-review`
- Tenant: `corpflowai`

## 4. Verification

```bash
node --test \
  node-tests/lead-rescue-tenant-delivery-progress.test.mjs \
  node-tests/tenant-client-journey-acceptance.test.mjs \
  node-tests/tenant-workspace-simplification.test.mjs \
  node-tests/app-slice1-progress-and-projection.test.mjs \
  node-tests/app-slice1-handlers.test.mjs \
  node-tests/app-slice3-review-persistence.test.mjs
```

Promptfoo / AI eval: **NOT APPLICABLE** — Tenant request projection and existing `#884` review only. No AI behaviour, prompts, drafting, model routing, tenancy-prompt handling, escalation, or protected-action AI handling changed.

## 5. corpflow_test URLs (after merge/publish)

- `https://core.corpflowai.com/app/tenant`
- `https://core.corpflowai.com/change?from=tenant-workspace`

Live tenant-session verification remains after merge/publish. This packet does not deploy.

Merged-journey client acceptance: [#1175](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1175) / `docs/architecture/LEAD_WEBSITE_RESCUE_TENANT_JOURNEY_ACCEPTANCE_V1.md`.

## 6. Explicit non-actions

- No production / client_production deploy
- No schema / env / secrets
- No payment, email, WhatsApp, SMS
- No new auth model or second project/helpdesk/CRM
- No factory/orchestration work
