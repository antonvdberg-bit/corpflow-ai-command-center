# Website Rescue tenant delivery progress v1

**Issue:** [#1151](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1151)
**Current-main landing:** [#1165](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1165) (replaces competing PR #1154)
**Parents:** [#654](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/654) · [#716](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/716) · [#1133](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1133) · [#1124](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1124) · [#1006](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1006)
**Reuses:** Tenant Workspace Requests & Progress · [#884](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/884) expose-for-review · `/change` · merged Website Rescue delivery record on shared Prospect detail
**Environment:** `corpflow_test` after merge/publish. This packet does not authorize `client_production`.
**No schema. No env/secrets. No deploy. No external send. No second project system.**

<!-- WEBSITE_RESCUE_TENANT_DELIVERY_PROGRESS_V1 -->

## 0. What is true when this slice is done

An authorised Website Rescue client sees one tenant-safe delivery-progress view inside the existing Tenant Workspace:

`Tenant Workspace → Requests & Progress → Website Rescue row → current delivery stage and next action → deliberately exposed preview (if any) → Service & change on /change`

The prospect `qualification_json.website_rescue_delivery` record remains the only delivery status. Tenant Workspace **projects** it. It does not copy it into a second ticket or project row.

## 1. Identity contract (existing, not invented)

| Identity | Already on current main | Tenant use |
| --- | --- | --- |
| Tenant | `leads.tenant_id` + authorised tenant session | Fail-closed filter. Missing tenant id is excluded. |
| Prospect / delivery | `leads.id` + `qualification_json.website_rescue_delivery` | Shown as the Requests & Progress `request_id` |
| Authorised client | commercial rail `financially_approved === true` on the same prospect | Required before any tenant slice is emitted |
| Review follow-up | existing `/change?from=tenant-workspace` | Canonical client change/review path |

No `lead_id` is written onto `cmp_tickets`. No tenant-writable copy of delivery state is created.

## 2. Tenant-safe fields

Shown to Tenant:

- Service name (`Website Rescue`)
- High-level delivery stage (client label, not operator state machine names)
- Client-visible blocker and next action
- Preview/review readiness
- Preview URL **only when** `evidence.preview.exposed_for_client_review === true`

Never shown to Tenant:

- Commercial notes, payment evidence, prices, quotation/invoice names
- Staff activity / operator notes
- Intake PII (working email/phone, hosting facts)
- Internal blockers (`MISSING_FINANCIAL_APPROVAL`, deploy/DNS simulation flags)
- Protected deploy/DNS controls or credentials
- Cross-tenant records
- Approve/reject controls on the Website Rescue record (`#884` stays on deliberately exposed **ticket** components)

## 3. Surfaces

| Route | Role |
| --- | --- |
| `/app/tenant` | Tenant Workspace. Website Rescue progress appears as a Requests & Progress row. Exact synthetic id: `syn-1151-wr-tenant-progress` (`?id=syn-1151-wr-tenant-progress`). |
| `/app/tenant?id=syn-716-wr-cleared` | Same projector on the existing Wren authorised client (onboarding stage). |
| `/change?from=tenant-workspace` | Canonical service/change and review follow-up. Navigation does not create a ticket. |
| `/app/prospects/[id]` | Staff-only shared Prospect detail. Full Website Rescue delivery record. Tenant session 403. |
| `/app/commercial`, `/app/delivery` | Staff-only. Tenant session fail-closed. |

A failed Requests & Progress load shows an error, not an empty “no work yet” panel, so a load failure cannot be mistaken for completion (#1201).

## 4. Explicit non-actions

- No schema / migration / env / secrets
- No copied `cmp_tickets` status model
- No new client portal or helpdesk
- No tenant mutation of Website Rescue delivery JSON
- No payment, external send, DNS, or client-production deploy
- `#884` ticket expose/review is unchanged

## 5. Verification

```bash
node --test \
  node-tests/website-rescue-tenant-progress.test.mjs \
  node-tests/tenant-client-journey-acceptance.test.mjs \
  node-tests/tenant-workspace-simplification.test.mjs \
  node-tests/app-slice1-handlers.test.mjs \
  node-tests/app-slice1-review.test.mjs \
  node-tests/website-rescue-delivery-prospect.test.mjs
```

Promptfoo / AI eval: **NOT APPLICABLE** — tenant-safe projection of an existing delivery record into Requests & Progress. No AI behaviour, prompts, drafting, model routing, tenancy-prompt handling, escalation, or protected-action AI handling changed.

## 6. corpflow_test URLs (after merge/publish)

- `https://core.corpflowai.com/app/tenant`
- `https://core.corpflowai.com/app/tenant?id=syn-1151-wr-tenant-progress` (fixture/proof path)
- `https://core.corpflowai.com/change?from=tenant-workspace`
- Staff-only (must 403 for tenant sessions): `https://core.corpflowai.com/app/prospects`, `/app/commercial`, `/app/delivery`
