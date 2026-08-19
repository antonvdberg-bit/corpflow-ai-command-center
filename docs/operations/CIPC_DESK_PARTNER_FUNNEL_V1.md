# CIPC Desk — Partner funnel v1

**Status:** Conversion landing for accounting / advisory firms (**#986**). Parent campaign **#984** / coordination **#640**.  
**Tenant / working name:** `cipc-desk` / CIPC Desk (internal working name — the buyer-facing page leads with capacity, not the desk name).  
**Environment:** `corpflow_test` only. **Not a public launch.**  
**Verdict:** Ordinary implementation of a tenant-gated commercial page. Public launch, indexing, pricing publication, live email/WhatsApp/SMS send, and `client_production` remain blocked until Anton approves that exact step.

<!-- CIPC_DESK_PARTNER_FUNNEL_V1 -->

## Business outcome

Give first-wave accounting, tax and advisory firms one conversion page for **fractional / white-label company-secretarial overflow**, without turning Sarah’s specialist-review pages into marketing surfaces.

## Standing test URL

After this change is merged and published to the CorpFlowAI test spine:

| Surface | URL |
|---|---|
| Partner funnel | https://cipc.corpflowai.com/partners |
| Optional alias | https://cipc-desk.corpflowai.com/partners |

Until merge/deploy, those paths correctly return **404**. That is expected. Do not treat 404 as a product defect before publish.

## What this page is

- Audience: owners/partners of South African accounting, tax and advisory firms.
- Primary CTA: **Discuss overflow / white-label support** (enquiry form).
- Secondary CTA: **See services we can handle**.
- Intake reuse: `POST /api/cipc-desk/email-intake` with subject cue `Partner overflow / white-label enquiry`.
- Existing ticket/service slug reused: `monthly-cipc-administration-support`.
- Confirmation tells the prospect they will hear back, usually within one business day, on the preferred channel.

## What this page is not

- Not a replacement for `/annual-returns` or `/beneficial-ownership` specialist review.
- Not a direct SME transactional landing (that remains `/`).
- Not a public launch, fee table, or guaranteed-outcome page.
- Not a new app, schema, CRM, auth, domain, or messaging runtime.

## Proof line still pending exact public wording

Buyer-facing copy includes:

> More than 15 years of company-secretarial and governance operations, including work inside a publicly listed South African company.

Exact public wording remains **subject to factual confirmation** before any public use. The content record marks `confirmation_status: pending_exact_public_wording`.

## Marketing QA note

Copy is aimed at first-wave #984 prospects (accounting/advisory firms first; specialist secretarial firms later). Language leads with **capacity behind the practice**, not commodity filings, job-seeking, or “CIPC clerk” framing.

Quality-gate target: **≥ 12/14**. Proof is **partial** until the experience line is confirmed and no client logos/testimonials are approved.

## Protected actions still requiring approval

- Public launch / indexing / client-facing announcement.
- Publishing a fee table or partner price list.
- Live email, WhatsApp, SMS, or external outreach.
- `client_production` promotion.

Ordinary merge to `main` publishes to `corpflow_test` only. That is not `client_production`.
