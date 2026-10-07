## Context

CorpFlowAI runs ERPNext/Frappe v16 and has accumulated a parallel pre-sales estate in Postgres. The current Growth models and Prospect Operations work overlap materially with CRM functions. Frappe CRM stable v1.x supports Frappe/ERPNext v15/v16 and the official same-site integration creates ERPNext Customers/Quotations from Deals while ERPNext remains product/pricing authority.

ERPNext's legacy CRM workspace is not the long-term target. Frappe CRM v2.x is being developed for the future v17 stack. ERPNext v16 has a multi-year support window, so the architecture can be migrated deliberately without a forced major-version upgrade.

## Goals / Non-Goals

### Goals
- One authoritative Frappe commercial estate.
- Frappe CRM for pre-sales; ERPNext for transactions/ERP.
- Preserve commercial history while removing duplicate masters.
- Same-site native integration first.
- Keep CorpFlowAI only where it provides research/enrichment/execution value.
- Stage migration so revenue work continues.

### Non-Goals
- Immediate v17 upgrade.
- Big-bang deletion of Postgres CRM/prospect data.
- Building a custom CRM.
- Building a custom CRM↔ERP bridge before native integration is tested.
- Enabling live marketing/email/WhatsApp as part of migration definition.
- Paid hosting/provider changes.
- Rebuilding every operator UI before cutover.

## Decisions

### Decision 1: Same-site paired stack is the target
Install stable Frappe CRM alongside ERPNext on the same Frappe site where the current hosting topology permits it.

**Why:** the official integration is richest same-site and avoids introducing another database or integration boundary.

### Decision 2: Source of truth is split by lifecycle responsibility
- Frappe CRM owns Lead/Deal/pre-sales interaction state.
- ERPNext owns Customer/transaction/pricing/finance/project truth.
- CorpFlowAI owns research/enrichment/execution evidence, not a second CRM.

### Decision 3: Selected-prospect gate replaces reply-based admission
Unselected research candidates can remain transient CorpFlowAI research. Once CorpFlowAI deliberately selects a named party for active prospecting/nurture, create/reconcile a CRM Lead. A reply is not required.

### Decision 4: Existing ERPNext CRM records are preserved, not destructively migrated
Active ERPNext Leads/Opportunities are reconciled to CRM Lead/Deal and retained as historical evidence until decommission rules are separately approved.

### Decision 5: Current Postgres CRM-like tables enter maintenance mode
Do not expand GrowthCompany/GrowthContact/GrowthTouchpoint as commercial masters. During migration they remain source evidence and fallback only; after cutover their commercial write paths are disabled/retired or reduced to research staging.

### Decision 6: v16 first, v17 later
Use the supported v16 + CRM v1.x pairing first. Rehearse CRM v2.x + ERPNext v17 later on a clone when mature.

## Risks / Trade-offs

- **Hosting may not permit same-site app installation.** Mitigation: Phase 0 capability check; stop before custom integration or purchase.
- **Existing-customer linking behavior may not cover all real records.** Mitigation: sandbox proof with an existing Customer before production.
- **Duplicate contact/organization identities.** Mitigation: deterministic search-before-create and conflict queue.
- **Migration can lose activity context.** Mitigation: map only material history, preserve old records read-only, validate sample records before cutover.
- **Custom fields can create future upgrade debt.** Mitigation: standard fields/tags/notes first; minimal additions only after gap proof.
- **Email/WhatsApp automations could accidentally send.** Mitigation: keep outbound automations disabled through migration testing; activation is a separate protected action.
- **CorpFlowAI operator UX may be better than CRM for some tasks.** Mitigation: allow read-only/thin execution views over Frappe APIs where evidence justifies them, but do not duplicate masters.

## Migration Plan

1. Freeze duplicate CRM expansion and inventory current truth.
2. Prove Frappe CRM v1.x + ERPNext v16 on non-production same-site.
3. Configure minimum standard CRM model; prove any true field gaps.
4. Build deterministic dry-run reconciliation for Growth, Postgres leads, ERPNext Leads/Opportunities and existing Customers.
5. Pilot a small mixed cohort.
6. Obtain explicit production install/data-write approval.
7. Cut over new pre-sales authorship to Frappe CRM and downstream transactional authorship to ERPNext.
8. Deprecate duplicate CorpFlowAI commercial write paths only after observation/reconciliation proof.
9. Keep v16 stable; separately rehearse the future v17 pair.

## Rollback

Before production cutover, rollback is simply abandoning the non-production CRM pilot because existing production records remain untouched.

Production cutover requires a verified site backup/restore path first. No destructive deletion or table drop is included in the initial cutover. If cutover must be reversed, restore the supported site backup and reconcile any post-backup transactions before reopening normal operation.

## Open Questions

- Does the current ERPNext hosting/provider permit installation of Frappe CRM on the same production site without a paid plan/capacity change?
- What exact app/version combination is currently installed on production versus test?
- How does the native integration reconcile a CRM Deal with an already-existing ERPNext Customer in our version?
- Which current CorpFlowAI-only fields are genuinely required after standard CRM scoring/temperature/customization is tested?
- Which CorpFlowAI operator views remain valuable as thin views after Frappe CRM is live?
