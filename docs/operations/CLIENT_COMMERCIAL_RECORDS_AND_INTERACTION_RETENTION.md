# Client commercial records — issued artifacts and interaction evidence

**CEO decision:** 20 October 2026. **Status:** proposed durable runbook update; merge requires Anton approval.
**Source:** Rare & Exclusive quotation onboarding [#1493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1493).
**Applies to:** all current and future CorpFlowAI clients and engaged prospects; use native ERPNext and paired Frappe CRM.

## Non-negotiable record rule

Record substantive client communications, commitments, approved scope, commercial transactions, issued/received documents and client acceptance against the correct **Lead, Opportunity, Customer and engagement/project**, preserving provenance, dates and access restrictions. ERPNext/Frappe CRM is commercial relationship truth; GitHub is technical delivery lineage, not the private commercial document vault. Do not create a second app/database or treat local temp paths as the archive.

### Native records, not duplicated file trees

- **Quoted/issued:** Author in ERPNext. Retain final **issued PDF** as private immutable `File` attached to its exact Quotation ID. Do not overwrite an issued document; record a revision with its own source/issue identifiers. Retain quoted value, currency, tax treatment, issue and expiry dates.
- **Outgoing/received correspondence:** Link relevant send/reply evidence as ERPNext `Communication` (or native equivalent) to the quotation and Customer/Opportunity. Record verified recipient, timestamp, mail ID and attachment identity when supported. Sending evidence is not delivery acknowledgement or commercial acceptance.
- **Acceptance and delivery:** Preserve written client quotation acceptance against the same quotation/engagement. Do not infer acceptance from an issued quote, sent email or branding approval. Delivery acceptance and payment triggers remain separate. Invoice only when contractually due.
- **Other engagements:** Attach commercial proposals, accepted terms, contracts, purchase orders and consequential decisions to their appropriate client/job records. Do not ingest trivial messages into ERPNext, leak private records to GitHub, or duplicate the same PDF into unmanaged folders.
- **Access and persistence:** Use existing least-privilege private file storage and retention/accounting policies. Securely verify actual persistence and native links; do not claim archival completeness solely from source laptop filenames, workflow labels or comments. Protected data mutations and external messages require scope-appropriate approval.

## Rare & Exclusive evidence / closeout exemplar

- Legal Customer: BESPOKE HOMES LTD, trading Rare & Exclusive. Opportunity `CRM-OPP-2026-00005`.
- Quotation `SAL-QTN-2026-00010`, submitted/Open, **MUR 45,000** fixed price for complete agreed website, no VAT charged, no deposit, 12 months hosting/SSL included; issued 2026-10-20, valid through 2026-11-03.
- Sender-side Gmail evidence: SENT message ID `1a158504f9993e8a`, with attached `rare-exclusive-qtn-issued.pdf`. This proves sending with attachment, **not Jan's written acceptance**.
- Existing client master, Contact, billing Address, Opportunity and Quotation verified in the desktop execution receipt [#1493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1493#issuecomment-6284542152); corrected issued-document receipt [#1493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1493#issuecomment-6285514259).
- **Outstanding and not verified:** private ERPNext `File` attachment of actually-issued PDF; ERPNext `Communication` link to sent message; Frappe CRM/Opportunity commercial stage `Awaiting Client Acceptance` read-back; Jan's written quotation acceptance. These must survive closure of the onboarding task as follow-up commercial administration; no implementation restart or assertion they are complete.

## Verified delivery lessons

1. Cloud GitHub factory activation is not ERPNext business completion. A validated CURRENT CURSOR PACKET was necessary for remote agent pickup; status labels remained stale after terminal agent outcome, so reconcile against run receipts before requeue.
2. An invalid Frappe Opportunity list field shape yielded HTTP 417; supported `title` and `party_name` returned HTTP 200. Do not change permissions/schema before checking request shape.
3. Cloud ERPNext API authentication succeeded but private local client data was unavailable; authorised Cursor Desktop/browser context completed bounded commercial work, without leaking contact values to GitHub.
4. Quote wording must match commercial deal: **complete website** at one fixed price, not ambiguous `first release`. Commercial quotation acceptance authorises commencement; completed-site written acceptance triggers payment. Keep advance deposit at zero.
5. CorpFlowAI non-VAT registration means **do not charge VAT** and do not apply defective two-line `Mauritius Tax - CFAI` template. No VAT exemption/zero-rating claim. Review company VAT status separately when registration conditions change.
6. Final external-send approval is independent of ERPNext submission. Gmail attachment connector had inconsistent attachment-files validation; Anton sent through his business mailbox instead. Verify sent attachment in Gmail, but never infer client receipt/acceptance.
7. End workstream closure is not lifecycle closure: preserve commercial follow-up and private issued artifacts natively in ERPNext; carry unresolved acceptance forward to the sales queue. Evidence-only audit controls, no second storage product.

**Closeout note:** No global enforcement or ERPNext attachment is represented as deployed by this documentation-only change. Verify per engagement; merge remains CEO-controlled.
