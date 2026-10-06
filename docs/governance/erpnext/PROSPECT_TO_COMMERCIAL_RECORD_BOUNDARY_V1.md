# Prospect → ERPNext Commercial Record Boundary v1

**Status:** APPROVED — Anton approved the boundary verbatim on 2026-10-07. Merge and runtime/data changes remain separately protected.  
**Owner:** Anton van den Berg.  
**Decision purpose:** keep cold-prospect research/outreach out of ERPNext while preserving the complete commercial history from the first meaningful engagement through quotation, conversion and delivery.  
**Related:** #701, #721, #918, #1009, #1018, #1394, #1410, PR #1409.  
**External reference:** official ERPNext/Frappe documentation for Lead, Opportunity, Customer, Quotation and CRM Settings.

## 1. Executive rule

CorpFlowAI SHALL use a **Commercial Engagement Gate**.

Before the gate, a person/company is a **Cold Prospect** and remains in CorpFlowAI Prospect Operations / Postgres. It does not belong in ERPNext merely because we found it, researched it, enriched it, sent one-way outreach, or observed passive marketing signals.

At the gate, the party becomes an **Engaged Lead**. CorpFlowAI SHALL create/reconcile an ERPNext Lead and SHALL preserve the material history that explains how the relationship reached that point.

After the gate, ERPNext is the durable commercial interaction record. CorpFlowAI may continue to execute outreach, queues, scoring, drafting and operator workflows, but material commercial interactions and state changes must reconcile into ERPNext.

## 2. Why this boundary exists

Two failures must be avoided:

1. **CRM pollution:** scraped names, speculative targets, unanswered outreach, automated opens/clicks and low-quality research should not flood the durable CRM.
2. **Commercial amnesia:** once a prospect meaningfully engages, the history that led to qualification, scope, quotation and acceptance must not remain trapped only in WhatsApp, email, Postgres, notes or chat.

The boundary therefore follows **evidence of human commercial engagement**, not mere identification and not late-stage quotation.

## 3. Lifecycle and system ownership

| Stage | Business meaning | Durable home | Entry rule | Required next record |
|---|---|---|---|---|
| **0. Cold Prospect** | Target we may wish to approach; no meaningful two-way commercial engagement yet | CorpFlowAI Prospect Operations / Postgres | Research, enrichment, list building, one-way outreach, no substantive response | None in ERPNext |
| **1. Engaged Lead** | A real person/company has shown meaningful interest or entered a genuine two-way commercial conversation | **ERPNext Lead** + CorpFlowAI execution pointer | Commercial Engagement Gate passes | ERPNext Lead |
| **2. Qualified Opportunity** | There is a credible potential sale we are actively pursuing | **ERPNext Opportunity** linked to Lead/Customer | Need/desired outcome + fit + identifiable buying path + agreed next commercial step | ERPNext Opportunity |
| **3. Quote-ready Customer** | We are preparing a formal external quotation/proposal and have sufficient party information for a professional commercial document | **ERPNext Customer + Contact + Address** | Quote-readiness gate passes | ERPNext Customer/Contact/Address before external quote |
| **4. Client** | Commercial commitment has been accepted under the engagement terms | ERPNext Customer + accepted commercial record + Project | Accepted quotation/order/contract/payment condition as applicable | Project/delivery handoff |

### Existing customers

A new piece of work for an existing Customer does **not** create a new Lead. Create/reconcile a new Opportunity against the existing Customer and retain the interaction on that commercial relationship.

## 4. Commercial Engagement Gate — the exact changeover point

A Cold Prospect crosses into ERPNext when **at least one** of the following occurs and the party is identifiable enough to avoid a duplicate:

1. **Inbound enquiry:** they contact CorpFlowAI asking about a service, problem, meeting, pricing, proposal or capability.
2. **Substantive response to outreach:** they reply in a way that shows genuine business interest, need, objection, timing, question or willingness to continue. A courtesy acknowledgement alone is not enough unless it includes a next step.
3. **Human referral/introduction with commercial context:** a trusted introducer connects us to a named party and communicates a plausible need or reason to engage.
4. **Meeting/discovery/demo booked or held:** the party agrees to a commercial discussion.
5. **Request for pricing/proposal/quotation:** they ask for commercial terms or we mutually agree that a proposal should be prepared.
6. **Explicit operator promotion:** Anton deliberately marks a prospect as commercially engaged because evidence shows a credible sales conversation even if it does not fit the triggers above.

### Signals that do NOT pass the gate

The following remain Cold Prospect activity unless accompanied by a qualifying human engagement:

- scraped/enriched company or contact data;
- list inclusion;
- website visit;
- email open/click;
- social follow/view/like;
- automated reply, out-of-office or delivery receipt;
- unanswered outbound email/WhatsApp/LinkedIn message;
- generic newsletter interaction;
- speculative fit based only on our research;
- duplicated or stale contact data.

This is the principal anti-fluff control.

## 5. Minimum ERPNext Lead admission packet

When the gate passes, create/reconcile one Lead only after search-before-create and capture, where known:

- person/contact name;
- business/organization name;
- at least one usable contact method;
- source/referral/outreach origin;
- product/service or business problem being discussed;
- date of first meaningful engagement;
- concise qualification/interaction summary;
- owner;
- next action and due date;
- contact/consent preference where relevant;
- pointer/source reference back to CorpFlowAI execution record where supported.

Unknown values remain unknown. Never invent budget, probability, company registration details, legal name, address, close date or expected value.

## 6. Backfill rule when the gate is crossed

The ERPNext Lead history must preserve the **commercially material pre-gate path**, but not every low-value touch.

Backfill/summarise:
- first relevant outreach that caused the engagement;
- substantive replies;
- referral/introduction context;
- meeting/discovery notes;
- commitments, objections and agreed next actions;
- documents or material information already shared.

Do not backfill:
- every research lookup;
- bulk prospecting data;
- repeated unanswered messages;
- passive opens/clicks;
- generic marketing touches;
- private/sensitive personal details that are unnecessary for the business relationship.

The purpose is continuity, not surveillance.

## 7. Qualified Opportunity gate

Create/reconcile an ERPNext Opportunity when all of these are true:

1. **Need/outcome:** a specific business problem, requirement or desired outcome is understood.
2. **Fit:** CorpFlowAI has a plausible service/product path that can address it.
3. **Buying path:** there is an identifiable contact, stakeholder or decision process sufficient to continue the sale.
4. **Next commercial step:** a discovery, scope confirmation, proposal, pricing discussion or decision step has been agreed.

Budget/value and close date should be recorded **when known**, but are not mandatory admission criteria and must never be fabricated.

This preserves a smaller, meaningful active pipeline.

## 8. Quote-readiness gate — Customer creation

ERPNext technically permits Quotations to a Lead or Customer. CorpFlowAI will apply a stricter professional standard:

> **No formal external quotation/proposal is released until the party is quote-ready and the reusable Customer identity is sufficiently complete.**

Before external release, confirm/create the ERPNext Customer plus relevant Contact and Address using the best available verified information:

- commercial/legal name appropriate to the document;
- primary quotation recipient/contact;
- email and/or phone;
- country;
- billing/registered/office address appropriate to the document, or an explicit documented reason it is not yet required;
- quotation currency;
- agreed scope/requirement;
- company/tax/registration identifier when legally/commercially applicable and available;
- any agreed payment/billing terms required for the quotation.

If essential party identity is missing, the quotation is **NOT CLIENT-READY**. Obtain the missing information rather than producing an anonymous or poorly addressed formal quotation.

An internal pricing estimate or discussion document may exist before this gate, but it is not the released formal quotation.

## 9. Client conversion gate

A Quote-ready Customer becomes an active Client when an accepted commercial commitment exists: accepted quotation/order/contract or the payment/acceptance condition defined for that engagement.

At conversion:
- preserve Lead/Opportunity/Quotation lineage;
- hand off to the ERPNext Project/delivery record where applicable;
- do not create another Customer for the same legal/commercial party;
- keep subsequent material client interactions on the Customer/Project/Issue/commercial record as appropriate.

## 10. Examples from current/past CorpFlowAI scenarios

### Prestige Procurement
Prestige was not a cold target by the time discovery, meetings and proposal design were underway. Under this policy, the relationship would have crossed the Commercial Engagement Gate at the first substantive two-way requirements discussion, become an ERPNext Lead, then an Opportunity once scope/fit/next step were clear. Before the formal quotation is externally issued, Customer/Contact/Address completeness must be verified.

### OrixHealth
The current OrixHealth work already demonstrates the later stages: a real Lead/Opportunity exists and draft quotation evidence is being produced from ERPNext. The policy makes explicit that party identity and CRM lineage should precede formal quotation release rather than being reconstructed at the quotation step.

### AI Lead Rescue / Website Rescue cold outreach
Researched businesses and unanswered outreach remain in CorpFlowAI Prospect Operations. They enter ERPNext only after meaningful engagement. This prevents hundreds of speculative targets from becoming durable CRM records.

### Referral
A named introduction that includes a genuine business need may cross the gate immediately even before the referred party replies, because a human commercial signal and context already exist. The next action must still be recorded.

## 11. Workflow impact — identified now, implementation after approval

The following existing contracts/workflows are impacted:

1. **#701 CRM operating baseline / `config/crm-operating-baseline.v1.json`**
   - split current `new/contacted` population into pre-gate Cold Prospect versus ERPNext-admitted Engaged Lead;
   - remove the old statement that ERPNext is only for invoicing/identity after commercial approval;
   - add Commercial Engagement Gate and quote-readiness requirements.

2. **#721 Prospect Operations**
   - retain cold prospect queue/workbench/Kanban in CorpFlowAI;
   - show ERPNext admission state/pointer once gate passes;
   - ensure common timeline distinguishes source execution evidence from ERPNext durable commercial history.

3. **#918 source-of-truth matrix + machine contract**
   - `lead_intake_pipeline` remains CorpFlowAI-authoritative only **before** the engagement gate;
   - post-gate Lead/Opportunity interaction outcome becomes ERPNext-authoritative;
   - `growth_touchpoint_outreach` remains an execution surface, not the durable commercial ledger.

4. **#1018 sales lifecycle bridge / `config/erpnext-sales-lifecycle-bridge.v1.json`**
   - do not create ERPNext Leads for all `new/contacted/working/intake` rows;
   - create/reconcile Lead only when the engagement gate passes;
   - create Opportunity at qualified;
   - create Customer at quote-ready/proposal-ready, not merely because a prospect exists.

5. **#1009 Customer bridge**
   - preserve search-before-create;
   - customer creation becomes a quote-readiness/commercial-account gate, not general prospect promotion.

6. **Quotation/document workflows (#882, #919 lineage, #1394/#1402)**
   - formal external quotation must fail closed if quote-ready identity/contact/address requirements are incomplete;
   - draft/internal estimate may exist before release;
   - no invented missing client identity.

7. **Growth/Lead Rescue/Website Rescue outreach**
   - cold research and one-way outreach remain outside ERPNext;
   - the first meaningful engagement triggers admission and a history summary;
   - no broad migration of old cold prospect lists.

8. **Reporting**
   - distinguish Cold Prospects, Engaged Leads, Qualified Opportunities, Quote-ready Customers and Clients;
   - pipeline value/forecasting should use Qualified Opportunities and later, not cold prospect counts.

## 12. Migration / existing records rule

Do **not** bulk-copy the existing cold prospect database into ERPNext.

For existing records:
- if there is no evidence they crossed the Commercial Engagement Gate, leave them in CorpFlowAI;
- if evidence shows meaningful engagement, reconcile one ERPNext Lead and preserve a concise material history;
- if they are already qualified/proposal-ready, reconcile the appropriate Opportunity/Customer level;
- search-before-create and resolve duplicates before any write.

A separate bounded review should identify current records that already crossed the gate but were never promoted.

## 13. ERPNext/Frappe version constraint

Current ERPNext documentation states that the ERPNext CRM workspace is scheduled for removal in version 17 and recommends evaluating Frappe CRM for new long-term CRM implementations.

Therefore this policy deliberately defines **business states and source-of-truth rules**, not deep custom ERPNext CRM UI behavior. Lead/Opportunity/Customer/Quotation lineage should remain standard and portable. Avoid custom CRM schema or workflow logic that would make a future supported Frappe CRM transition harder.

## 14. Approved decision

Anton approved this policy verbatim on 2026-10-07. Therefore:

1. merge the governance documentation through the protected doctrine gate;
2. update #1410 to the precise machine-contract implementation;
3. create/execute one bounded workflow reconciliation packet for the affected configurations/helpers/tests;
4. perform read-only identification of existing records that already crossed the gate but are missing ERPNext lineage;
5. propose any real ERPNext writes separately under the existing protected-data rules.

No runtime/data mutation is authorized merely by approving this document.
