# Core pre-quotation estimation: ERPNext adapter input and implementation checklist v1

**Decision:** Core owns reusable pre-quote project costing and approval; ERPNext is a commercial-record/finance adapter, not the sole owner. CorpFlowAI, Business Admin Desk and other authorised subsidiaries/products reuse the same gate under tenant and brand separation. Support CEO pre-quote planning/cost gate merged via PR #1543. **Status:** researched ERPNext standard capability; live CorpFlowAI DocType/permissions NOT YET verified. No production data was modified.

## Bottom line
ERPNext standard Project/Task/Project Template is useful for planning and tracking; **actual** project labour cost is generated principally from submitted Timesheets with Activity Type and Activity Cost rates. A Project Estimated Cost is available, but ERPNext does not automatically create a complete defensible fixed-price quotation just by creating a Project. Estimate direct supplier/API/hosting, overhead allocation, contingency and profit **before** quotation in a linked cost worksheet or approved costed template. Do not confuse billing rates with labour cost.

## Shared test and rollout rule

Use #1504 as the **existing synthetic customer / transaction test programme**. Test Core-native reusable costing validation without real ERPNext postings; verify CorpFlowAI and BAD variants, incomplete-cost rejection and approved fixed-price templates, tenant isolation, and draft document rendering. A test Customer in the shared hosted ERPNext is not an accounting sandbox, even if marked TEST. **Exclusion from real customer, debtor, revenue, tax and project profitability reporting must be proven**, not assumed. The current safe default is deterministic fixtures / synthetic adapter; the next gate is read-only inspection of existing isolated test resources and report filters. Never create a synthetic production Journal Entry, Sales Invoice or Payment Entry to demonstrate the feature without precise data/config authorisation and accounting isolation assurance.

## Minimum input form (one record per contemplated quote)

| Field | Evidence / ERPNext location | Required at pre-quote |
| --- | --- | --- |
| Opportunity/Customer and contact | Qualified Opportunity; existing ERPNext quotation identity gate | Yes |
| Expected outcomes, acceptance and exclusions | Scope / deliverable / note link | Yes |
| Project title/type and proposed start/end | Project: name, type, expected dates; or non-posting estimate draft first | Yes |
| Project template / work breakdown | Project Template; Task descriptions, dependencies, milestones | Yes for bespoke; reusable template for catalogue |
| Task effort estimate | Task expected hours + role/executor, expected start/end | Yes |
| Activity type and hourly rate assumption | Activity Type; Activity Cost by Employee/Activity Type | Yes for human work, including CEO review |
| Other direct cost by service | Hosting, AI/API, subcontract, licences, transaction fees; recurrence/consumption | Yes, from evidence or labelled range |
| Cost basis and confidence | Currency/FX date, source, high/low usage and contingency | Yes |
| Gross contribution and quote price | Sum effort*cost rate + direct + risk reserve; price − estimated cost | Yes |
| Invoicing/payment plan | 50% deposit/50% milestone default when appropriate; client-specific terms | Yes |
| Approval / exception | CEO commercial PASS/REVISE/EXCEPTION APPROVED with date and source link | Yes before external release |
| Later actuals | Project-linked Timesheets/Expense Claims/Purchase costs/Sales transactions | Delivery phase, not a reason to postpone estimating |

## ERPNext object mapping and sequence

1. **Pre-sale:** Lead -> Opportunity. Verify Customer/Contact/Address identity required before external quotation under #1411/#1412. No arbitrary live Customer or Project creation merely for a speculative quote.
2. **Estimate:** Existing costed schedule/workbook or a safely created **internal Project** (only if permitted). Project standard fields include Project Name, Start/End, Project Type, Project Template and **Estimated Cost**. Tasks support **Expected Time**, dependencies and milestones. Document planned rate x hours + non-time costs + contingency; one top-level Estimated Cost alone lacks provenance.
3. **Cost rate setup check:** Activity Type represents work class. Activity Cost stores Employee-specific costing and billing rates; Timesheet pulls those rates against logged hours. For AI execution measure actual paid tools/API/compute separately; do **not** assume AI tools are Employees or that all cost types will automatically flow into Project total.
4. **Quotation:** Selling > Quotation, party, company, currency, price list/item/service, rates, validity, tax and payment terms. Link reviewed estimate/schedule privately and record gate PASS. No external send while gate incomplete.
5. **On acceptance:** Quotation -> Sales Order -> linked Project/Tasks. Record 50% deposit/payment evidence and final 50% at milestone according to agreed terms (do not imply deposit is revenue at receipt absent accounting determination). Progress through Timesheets/actual supplier costs and compare actual vs estimated.
6. **Reporting:** Project Costing/Project Profitability can use Timesheets, linked sales/purchase transactions and project budget/dimensions, but only when the underlying records are consistently tagged. Verify actual runtime report configuration before promising CEO live project margin.

## Proposed repeatable work-breakdown template for typical service build

Discovery and clarification -> Solution design/architecture -> Build/configuration -> Integration/data validation -> Quality/security/UAT -> Client review/adjustments -> Release/acceptance -> Hypercare/handover.

For each phase capture: deliverable, role/owner, hours, dependency, cost rate, external cost, acceptance and buffer. Small fixed-scope catalogue delivery can reuse an approved versioned template; unusual scope must receive a revised plan.

## Verification checklist before writing to ERPNext

- Read-only inspect live roles/permissions and metadata for Project, Task, Project Template, Activity Type, Activity Cost, Timesheet, Quotation, Sales Order, Project Costing/Profitability report.
- Inventory existing records and approved rate sources; avoid duplicates and fictional costing rates.
- Prove whether pre-sale internal projects can link to Opportunity/Quotation using native fields without custom changes. If not, retain estimate link in permitted existing references; do not add schema by default.
- Validate one **read-only sample** (or separately authorised synthetic non-production example) of cost rollup and estimate-vs-actual logic; note gaps for direct AI costs, non-employee contributions, FX, overheads.
- Confirm formal gate is documentary only until separately approved and verified in actual quotation release path. No promise of popup without implementation.
- Record readiness as VERIFIED, PARTIAL, or BLOCKED with exact access/permission/config gap.

## Sources (ERPNext official)
- Project: https://docs.frappe.io/erpnext/project
- Tasks: https://docs.frappe.io/erpnext/tasks
- Project Template: https://docs.frappe.io/erpnext/project-template
- Project Costing: https://docs.frappe.io/erpnext/project-costing
- Activity Cost: https://docs.frappe.io/erpnext/activity-cost
- Timesheet: https://docs.frappe.io/erpnext/timesheets
- Project Profitability: https://docs.frappe.io/erpnext/project-profitability
- Quotation: https://docs.frappe.io/erpnext/quotation

**Non-actions:** No live ERPNext record/schema/config mutation; no auto quote release, no external contact, no paid tools. PR #1543 pending Anton merge.
