# Pre-quotation project plan and costing gate — Core shared capability v1

**Decision owner:** Anton (CEO) · **Decision date:** 30 October 2026 · **Status:** CEO-approved shared Core policy. Documentation merger does not certify runtime enforcement.

## Mandatory question before every external client quotation

> **STOP — BEFORE WE QUOTE:** Have we prepared and reviewed a sufficiently detailed delivery plan, schedule, resource estimate, direct and recurring cost model, risk/contingency allowance, proposed margin and payment milestones? If not, the formal external quotation is **NOT READY TO RELEASE**.

**Ownership and reach:** This is a **Core-owned reusable commercial-delivery capability**, available to CorpFlowAI and subsidiary/product businesses including Business Admin Desk (BAD), with tenant/brand, data and access boundaries respected. ERPNext is the authoritative commercial/accounting system where applicable; it is not the owner of Core's reusable gate. The gate must not be implemented as a CorpFlowAI-only or BAD-only parallel system.

This is a **commercial readiness gate**, not a requirement to build a heavyweight project-management system. Applies to bespoke client builds and implementation work **before setting or communicating a binding external price**. Internal estimates may be drafted earlier. Standardised fixed-price catalogue items may use a previously approved and currently reviewed reusable costed delivery template rather than a new detailed plan for every identical sale.

## Minimum pre-quote evidence (one small estimate packet per opportunity)

1. **Commercial outcome and scope:** client need, deliverables, acceptance criteria, boundaries, assumptions, exclusions, dependencies, rework/support/warranty expectations.
2. **Work breakdown and timetable:** major phases/tasks, deliverables, estimated effort by role or executor, dependencies, milestone dates, realistic review/testing and contingency. Identify who executes each phase, including approved AI tooling and human review.
3. **Complete cost calculation:** labour/CEO time, subcontractors, AI/API usage, cloud/hosting, software/licences, transaction/card fees, onboarding, travel where relevant, security/compliance, support/hypercare, and ongoing monthly costs. Separate one-off build cost, recurring cost and pass-through costs. Use evidence or explicit ranges and confidence; never invent a verified quote cost.
4. **Commercial case:** selling price, cost estimate, gross contribution/margin, contingency, downside/high-cost scenario, validity/FX assumptions and why proposed discount is justified. Low confidence must not automatically mean a low quote.
5. **Cash and payment stages:** deposit target 50% and milestone/final 50% where contract-appropriate; timing and payment risk, supplier prepaid/usage needs, delivery-to-cash lag. For upfront card-paid catalogue offers, note full payment before fulfilment.
6. **Risk / approval:** scope uncertainty, third-party dependencies, acceptance blockers, IP/hosting arrangement, company/client data boundaries, client commitments, change-control path and actual delivery capacity.
7. **Evidence links:** reference a dated project schedule and cost workbook, ERPNext Opportunity / Quotation draft where available, and current approved reusable component costs. Keep confidential client data only in authorised private records.

## Release decision

A pre-quote reviewer (Anton or an explicitly delegated commercial approver) records **PASS**, **REVISE**, or **EXCEPTION APPROVED** with the date and links. A PASS requires a costed plan and defensible pricing: it does not mandate a specific project-management software module. A genuine emergency or very small fixed-scope request may use a proportionate one-page estimate; skipping the gate requires an explicit documented exception and residual risk.

**No external quote, proposal price, or commercial commitment may be released with gate status REVISE or missing.** The gate operates in addition to the established **ERPNext Customer + Contact + Address quotation identity/readiness rule**; it does not supersede engagement / opportunity admission, accounting, tax, document formatting or external-send approvals.

## Operating route — reuse, no platform build

- **Lead / Opportunity:** capture discovery and qualify in existing commercial workflow.
- **Estimate:** reuse native ERPNext Project / Task / estimated costing features if confirmed suitable; an existing private schedule and cost workbook is acceptable first. Do not create a second app or require ERPNext configuration just to pass the gate.
- **Quote:** link the reviewed estimate to the draft ERPNext quotation and record gate outcome **before external release**.
- **Accepted work:** carry planned effort/cost baseline into delivery work; compare actuals against baseline and capture estimating errors for the next quote.
- **Catalogue items:** maintain one approved pricing and delivery-cost model per product/version and revalidate when supplier/API costs, scope or FX materially change.

## Core synthetic testing and reporting separation

Reuse the existing controlled synthetic party and end-to-end acceptance programme in **GitHub #1504**, rather than creating new test identities or a second test system. Test the shared pre-quote decision rule across CorpFlowAI and BAD branded paths: valid bespoke quotation, invalid incomplete estimate (fail closed), approved repeatable catalogue offer, 50/50 milestones, client/tenant separation and correct quote document. Use deterministic fixtures and synthetic adapters first, then an authorised isolated/nonposting integration environment when available. A record named TEST in the current shared ERPNext production estate is **not** isolated: it may contaminate accounts, VAT, debtor balances or reports. Do not post a real GL entry or create shared production test parties solely for testing. Before any production-like synthetic transaction, verify independent test isolation, accounting nonposting behaviour, stable tags, report exclusion and cleanup/audit evidence. Current desired exclusion is an **acceptance criterion, not proven behaviour**. Follow #1504 gates and obtain exact scoped approval for any protected data/config changes.

## Verification and implementation boundary

This file is a mandatory **operator/agent documentation control once merged**, not proof of an automatic ERPNext UI pop-up or technical fail-closed validation. Before claiming a technical enforcement mechanism, separately verify current ERPNext Quotation/Opportunity support and existing CorpFlowAI quote-to-cash bridge. Implement only if repeated missed reviews justify bounded runtime work, with specific approval for production changes. Do not dispatch Cursor to write this document.

**First acceptance test:** For the next quotation, locate a costed scope/schedule/estimate, record review status, show the linked ERPNext draft and ensure the external-release decision is explicit. If missing, stop and report exact deficiency to Anton before a price goes out.

**Related durable work:** GitHub #1411 and #1412 (Commercial Engagement and quote identity gate), #1056 (quote-to-cash), #882 (commercial documents), and #1542 (management reporting). This gate adds **cost and delivery confidence**, not duplicated Customer identity checks.

**Protected actions:** No external quote/send, production ERPNext configuration/data mutation, repo merge or public release is authorised by this documentation change. Anton retains merge approval.
