# ERPNext is the commercial client master

**Date:** 2026-08-13  
**Status:** accepted for commercial identity on ERPNext sandbox/test (#880)  
**Issue:** [#880](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/880)

## Context

CorpFlowAI had three places that could look like a company record: ERPNext Customer, Postgres/intake leads, and Company Master (#765). #880 requires one commercial identity that can flow into quotation, invoice, payment evidence and delivery handoff without later re-keying.

## Decision

**ERPNext Customer + Contact + Address** is the authoritative **commercial** master for client/company onboarding.

- Company Master remains the **evidence and asset** hub (logos, certificates, publication/approval). It must not hold a second billing name/email/address as source of truth. It may store a pointer to the ERPNext Customer name.
- CorpFlowAI #715 / #716 records remain the **delivery** store (process, pages, gates, evidence). They store a pointer to the ERPNext Customer name.
- Secrets stay in **approved secure channels** only.

Standard ERPNext objects are sufficient. No custom field or custom DocType is authorized by this decision.

## Consequences

- Positive: one billing identity for quote-to-cash; Lead Rescue and Website Rescue share the same Customer shape.
- Negative / follow-ups: operators must search-before-create because ERPNext does not unique-constrain customer name or contact email. USD selling Price List and Payment Terms remain #882. Items remain #881.
- Company Master plan language that said ERPNext “consumes Company Master identity” is narrowed: ERPNext consumes **pointers and approved assets**, not a competing legal-name register.

## Links

- Canonical mapping: `docs/erpnext/ERPNEXT_CLIENT_MASTER_V1.md`
- Machine contract: `config/erpnext-client-master.v1.json`
- Company Master plan: `docs/company-master/COMPANY_MASTER_V1_BUILD_PLAN.md`
