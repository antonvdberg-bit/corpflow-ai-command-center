# Growth prospect import v1 (#1366)

This packet adds a bounded importer for the existing `GrowthSegment`, `GrowthCompany`,
`GrowthContact`, and `GrowthTouchpoint` models. It does not create a second CRM and it
does not send email, WhatsApp, SMS, calls, or direct messages.

## Data destinations

| Workbook field | Durable destination |
| --- | --- |
| Prospect | `GrowthCompany.name` |
| Why it fits / likely commercial pain | `GrowthCompany.fitHypothesis` |
| Decision-maker | `GrowthContact.fullName` + `decisionMakerConfirmed` |
| Best route | `GrowthContact.bestRouteOriginal` plus email/phone/WhatsApp fields |
| Score | `GrowthCompany.qualificationScore` |
| Progress | `GrowthCompany.lifecycleState` + `GrowthTouchpoint.result` |
| Source | `GrowthCompany.source` / `sourceUrl` and touchpoint `sourceUrl` |
| Segment / sector | Mauritius Lead Rescue segment + `GrowthCompany.sector` |

Route failures use `CONTACT_ROUTE_FAILED`; they are not converted to `NOT_FIT`.
Unknown decision-makers are stored explicitly as unconfirmed.

## Operator commands

The workbook stays on the operator’s local machine and is never committed:

```bash
npm run growth:prospects:import -- "/local/path/1st prospects.xlsx" \
  --tenant-id <tenant-id> --dry-run
```

The dry run is the default safe review mode and performs zero writes. It prints row
numbers, company names, lifecycle mapping, non-sensitive route channel labels, warnings,
and a field-loss report. Personal route values are suppressed.

After Anton separately approves the schema migration and real 20-row import:

```bash
npm run growth:prospects:import -- "/local/path/1st prospects.xlsx" \
  --tenant-id <tenant-id> --apply
```

The apply path updates an existing company/contact by tenant and identity, and
upserts the row touchpoint by company contact plus workbook row subject. Re-running
the same workbook therefore does not create duplicate companies, contacts, or import
touchpoints. It does not merge conflicting records automatically.

## Operator read surface

Authenticated growth pipeline sessions can query the highest-scoring prospects:

```text
GET /api/factory_router?__path=growth/prospects&tenant_id=<tenant-id>
GET /api/factory_router?__path=growth/prospects&tenant_id=<tenant-id>&lifecycle_state=ENGAGED
GET /api/factory_router?__path=growth/prospects&tenant_id=<tenant-id>&failed_routes=1
```

The response includes segment, company, contact, latest touchpoint, score, fit
hypothesis, lifecycle state, route result/failure reason, and source provenance.
Factory-admin access remains tenant-scoped by the explicit `tenant_id`.

## Synthetic coverage and verification

`fixtures/growth-prospects/mauritius-lead-rescue-synthetic.json` covers all requested
state patterns without real personal details: awaiting response, engaged, not fit,
failed WhatsApp, failed email/corrected route, uncontacted, diagnosis pending,
qualified, named and unconfirmed decision-makers, scores 8–12, and source present/absent.

```bash
node --test node-tests/growth-prospect-import.test.mjs
npx prisma validate
git diff --check
```

## Approval and rollback

Anton must separately approve both applying the migration and importing the real rows.
Before import, review the dry-run field-loss report and row-by-row mapping. Rollback is
the migration’s documented new-column rollback plus deletion of the explicitly imported
growth records/touchpoints identified by tenant and source; do not use a broad delete.

Exact approval sentence:

> I approve applying migration `20260929040000_growth_prospect_import_v1` and importing the verified 20 rows from `1st prospects.xlsx` into the specified tenant’s growth prospect models; no external outreach is authorised by this approval.

Promptfoo / AI eval: **NOT APPLICABLE** — this change adds deterministic prospect data
mapping and operator queries; it does not change AI behavior, prompts, drafting,
recommendations, escalation, or model-provider routing.
