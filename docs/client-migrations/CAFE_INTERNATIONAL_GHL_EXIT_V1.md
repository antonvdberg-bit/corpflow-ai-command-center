# Café International — GoHighLevel Exit / CorpFlowAI Cutover Pack

Source controller: #1329  
Client controller: #760  
Build references: #797, #850

## Business objective

Move Café International from GoHighLevel dependency to the existing CorpFlowAI delivery surface with the smallest safe cutover.

Do **not** rebuild GoHighLevel. Preserve only the business functions Café actually needs.

## Current authoritative state

From the current client controllers:

- Production domain: `cafeinternational.net`.
- Current platform: GoHighLevel.
- CorpFlowAI review/test target: `https://cafe-international.corpflowai.com/`.
- Existing protected dependency: GoHighLevel chatbot / multilingual WhatsApp ordering journey.
- Booking: phone or website chat.
- Takeaway: WhatsApp or phone only; the chatbot must not be used for takeaway.
- Public phone/WhatsApp: `+230 5765 8735` unless the owners later correct it.
- Menu authoring may remain on the existing Google Sheet during transition.
- Customer-domain cutover remains a separately approved production action.

## GHL dependency map

| GHL / legacy function | Business need | CorpFlowAI replacement posture | Migration action | Cutover gate |
| --- | --- | --- | --- | --- |
| Website hosting / public pages | Public discoverability, menu, contact, location | CorpFlowAI rebuild already exists / review surface available | Reconcile client-visible acceptance list and verify current CorpFlowAI review build | Client/Anton approval + production cutover approval |
| Booking chat entry | Table booking enquiry | Keep only if it materially helps bookings; phone remains valid | Audit current chat behavior. Prefer a simple link/bridge before any reimplementation | No disruption until replacement/bridge is proven |
| Multilingual chat logic | Customer interaction convenience | Not automatically required for cutover | Retain temporarily unless client confirms it is essential | Owner confirmation |
| WhatsApp ordering journey | Takeaway contact | Direct/manual WhatsApp using existing number is preferred first | Use direct WhatsApp contact route; do not create WABA/API dependency without need | Client verification of workflow |
| Takeaway via phone | Ordering/contact | Already independent of GHL | Preserve | None beyond client-visible verification |
| Menu content | Customer menu discovery | CorpFlowAI crawlable HTML menu; Google Sheet can remain authoring source | Preserve owner-friendly source and validate publication path | Content verification |
| Production domain | Customer-facing continuity | CorpFlowAI target after approval | Prepare DNS/domain cutover and rollback plan only | Explicit production/DNS approval |
| GHL automations/integrations | UNKNOWN until authenticated audit | Do not assume required | Inventory only; classify retain/replace/retire | Evidence required |
| GHL CRM/contact history | UNKNOWN until authenticated audit | Do not bulk-migrate by default | Determine whether active operational history is required | Data/export/privacy approval if needed |

## Smallest viable migration

The preferred cutover path is:

1. **Website**
   - use the existing CorpFlowAI Café build;
   - verify desktop/mobile/menu/contact/location;
   - reconcile the exact owner feedback list.

2. **Booking**
   - keep phone as a first-class route;
   - keep a simple chat bridge only if the existing booking workflow still provides value;
   - do not rebuild a general chatbot merely because GHL had one.

3. **Takeaway**
   - direct WhatsApp + phone;
   - no chatbot dependency;
   - no WhatsApp Business Platform/API unless a proven requirement emerges.

4. **Menu**
   - keep Google Sheet authoring if it remains convenient for the owners;
   - publish validated crawlable HTML through CorpFlowAI.

5. **Cutover**
   - verify CorpFlowAI production candidate;
   - owner acceptance;
   - approved DNS/domain switch;
   - validate live routes/contact actions;
   - rollback immediately if customer-critical contact or menu paths fail.

6. **Retirement**
   - only after stabilization, identify GHL functions that are genuinely no longer required;
   - cancellation/deletion is a separate operator/client decision.

## Exact remaining discovery questions

Only these questions are required before final cutover:

1. Does the current GHL booking chat still generate meaningful table bookings?
2. Is multilingual chat actually used enough to justify preservation?
3. Does any active GHL automation perform a business-critical step that is not already covered by phone/WhatsApp/manual operations?
4. Is any GHL CRM/contact history operationally required after cutover?
5. Do Dion and Anna-Marie want direct WhatsApp as the primary takeaway route?
6. Is the current CorpFlowAI review build visually/functionally accepted after the last feedback cycle?

Unknowns must stay UNKNOWN until evidenced.

## Preview / acceptance checklist

Before requesting production cutover approval:

- [ ] homepage accepted by owners;
- [ ] menu readable and complete on mobile/desktop;
- [ ] menu content crawlable without chat;
- [ ] booking path works;
- [ ] takeaway path works via WhatsApp and phone;
- [ ] chat is either safely bridged or deliberately omitted with owner agreement;
- [ ] address/hours/phone verified;
- [ ] no GHL production mutation performed;
- [ ] no WhatsApp API dependency introduced;
- [ ] production-domain rollback procedure prepared;
- [ ] final owner approval recorded.

## Rollback

If production cutover is approved later:

- preserve the legacy GHL production configuration until post-cutover validation completes;
- do not cancel GHL at the moment of DNS switch;
- retain the ability to revert the customer domain to the prior known-good target;
- verify homepage, menu, booking, takeaway and contact paths immediately after cutover;
- only retire legacy services after stabilization and explicit approval.

## Decision

Current evidence supports a **thin migration**, not a GHL replacement programme.

The immediate delivery target is:

`CAFE INTERNATIONAL GHL EXIT — CUTOVER READY`

when the CorpFlowAI build is owner-accepted and the contact-path questions above are resolved.
