# CIPC Desk — Direct-SME buyer funnel v1

**Status:** Conversion landing for company owners / directors (**#1183**). Parents **#640**, **#984**, **#987**, **#989**. Complements partner funnel **#986** / **#1126**. Supersedes paused execution vehicle **#1152** for implementation capacity only; preserve #1152 history as evidence.
**Tenant / working name:** `cipc-desk` / CIPC Desk (internal working name).
**Environment:** `corpflow_test` only. **Not a public launch.**
**Verdict:** Smallest buyer-facing current-main slice on the existing tenant shell, service catalogue, email-intake contract, and #987 response controls. Public launch, indexing, unapproved fees, live email/WhatsApp/SMS send, payment, filing, and `client_production` remain blocked.

<!-- CIPC_DESK_DIRECT_SME_FUNNEL_V1 -->

## Business outcome

A direct SME can understand the available company-secretarial / CIPC help, choose a suitable standard request, and reach a safe enquiry next step **without entering Serah’s specialist-review workspace**.

Target journey:

```text
CIPC tenant → /company → standard service choice → scope/limitations
  → one primary enquiry CTA → validation/confirmation
  → operator follow-up remains approval-gated
```

## Standing test URL

After this change is merged and published to the CorpFlowAI test spine:

| Surface | URL |
|---|---|
| Direct-SME buyer funnel | https://cipc.corpflowai.com/company |
| Optional alias | https://cipc-desk.corpflowai.com/company |
| Tenant door (SME primary CTA) | https://cipc.corpflowai.com/ |
| Partner funnel (distinct) | https://cipc.corpflowai.com/partners |
| Acceptance proof (no record/send) | https://cipc.corpflowai.com/company?proof=1 |

Until merge/deploy, those new paths correctly return **404**. That is expected.

## What this page is

- Audience: South African company owners and directors who need help for **their own company**.
- Primary CTA: **Request company-secretarial help** (enquiry form).
- Secondary CTA: **See standard services**.
- Catalogue: annual returns, beneficial ownership, director changes, company amendments, registered-address change, private-company registration, statutory records / document retrieval.
- Intake reuse (non-proof): `POST /api/cipc-desk/email-intake` with subject cue `Direct SME company-secretarial enquiry`, `source=direct_sme_web`, `client_path=/company`.
- Acceptance: `?proof=1` confirms locally with the synthetic fixture. **No database write, send, payment, or filing.**

## What this page is not

- Not Serah’s specialist-review workspace (`/annual-returns`, `/director-changes`, `/beneficial-ownership` stay internal / noindex).
- Not the accounting-practice partner offer (`/partners`).
- Not a public launch, fee table, or guaranteed-outcome page.
- Not a new app, schema, CRM, auth, domain, or messaging runtime.
- Not authorised to publish #989 test bands as public prices.

## Trust boundaries (buyer-visible)

- Independent support — not CIPC, not a government channel, and not a law firm.
- No CIPC affiliation or endorsement.
- Filing outcomes, turnaround, and CIPC processing times are not guaranteed.
- Operator replies stay behind the existing #987 approve / reject / do-not-contact gate. Send remains blocked.

## Marketing QA note

Quality-gate target: **≥ 12/14**. Proof is **partial** until live client evidence is approved. Validation asset is the `/company` form + confirmation itself.

## Protected actions still requiring approval

- Public launch / indexing / client-facing announcement.
- Publishing a fee table or direct-SME price list.
- Live email, WhatsApp, SMS, or external outreach.
- Payment, CIPC filing/submission, schema, secrets, or `client_production`.

Ordinary merge to `main` publishes to `corpflow_test` only. That is not `client_production`.
