# Architecture & trust-boundary decisions (ADR-lite)

**Purpose:** Short, dated records when we change **tenancy, security boundaries, automation trust, billing, or cross-system contracts**. Keeps “why we did X” in-repo instead of only in chat.

## When to add an entry

- New bypass, secret, or auth path (factory vs tenant vs ingest).  
- Hostname / apex / DNS policy change affecting clients.  
- New external dependency that holds or processes client data (subprocessor).  
- Breaking API or CMP behavior visible to tenants.

## Filename convention

`YYYYMMDD-short-title.md` (e.g. `20260404-tenant-hostname-onboarding-policy.md`)

## Suggested template (copy into new file)

```markdown
# Title

**Date:** YYYY-MM-DD  
**Status:** proposed | accepted | superseded-by-LINK

## Context
What problem or constraint triggered this?

## Decision
What we chose (one paragraph).

## Consequences
- Positive: …
- Negative / follow-ups: …

## Links
- Related code paths: …
- Docs updated: …
```

## Index

| Date | Topic | File |
|------|--------|------|
| 2026-08-27 | Temporal real-production prove-or-remove pilot — current-main supervisor, 72-hour real-work activation prepared (#1130) | `20260827-temporal-real-production-pilot.md` |
| 2026-08-26 | ERPNext onboarding E — Projects / Support operational proof reuses #920 standard records (#1097) | `20260826-erpnext-projects-support-ops.md` |
| 2026-08-20 | ERPNext WP2 Lead → Opportunity → Customer lifecycle bridge — synthetic search-before-create (#1018) | `20260820-erpnext-sales-lifecycle-bridge.md` |
| 2026-08-19 | ERPNext WP1 Customer bridge — synthetic search-before-create (#1009) | `20260819-erpnext-customer-bridge.md` |
| 2026-08-16 | ERPNext business-critical due diligence — platform APPROVED WITH CONDITIONS; irreplaceable trust still gated on #956 (#959) | `docs/governance/erpnext/ERPNEXT_BUSINESS_CRITICAL_DUE_DILIGENCE_V1.md` (`JE-2026-08-16-1`) |
| 2026-08-14 | ERPNext/server backup, DR, security, repo continuity audit — business-critical use NOT PROVEN (#956) | `docs/operations/ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1.md` (audit; `JE-2026-08-14-3`) |
| 2026-08-14 | ERPNext Prestige foundation: standard CRM/project/support READY on synthetic hosted-test records (#920) | `20260814-erpnext-prestige-foundation.md` |
| 2026-08-13 | ERPNext Customer/Contact/Address = commercial client master (#880) | `20260813-erpnext-client-master.md` |
| 2026-08-13 | ERPNext commercial documents: standard Quotation/SI first; Currency Exchange is the USD gate (#882) | `20260813-erpnext-commercial-documents.md` |
| 2026-07-29 | CorpFlowAI-hosted surfaces = corpflow_test; client_production separate (#679) | `20260729-corpflow-test-vs-client-production.md` |
| 2026-06-29 | WhatsApp Tier 1/2/3 capability decision (planning only) | `20260629-whatsapp-tier1-tier2-capability.md` |
| — | *(add rows as you create files)* | — |
