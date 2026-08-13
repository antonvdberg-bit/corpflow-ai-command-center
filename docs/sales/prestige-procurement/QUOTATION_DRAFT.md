# Prestige Procurement — MUR quotation draft

**Status:** Repo-safe quotation **draft** for #919. **Not sent. Not a tax invoice. Not the commercial source of truth** until an ERPNext Quotation exists (#882 for PDF).
**Anchor sentinel:** `<!-- PRESTIGE_PROCUREMENT_QUOTATION_DRAFT_V1 -->`

<!-- PRESTIGE_PROCUREMENT_QUOTATION_DRAFT_V1 -->

Populate bracketed fields **locally** when Anton issues the real document. Do not commit legal addresses, BRN of the client, bank details, or personal phone numbers to this repo.

Required verbatim commercial cautions (adapted from CorpFlowAI pro-forma discipline):

- Payment instructions are sent separately after written acceptance.
- Work on each phase begins after payment confirmation for that phase and receipt of required client information.
- No revenue, enquiry-volume, ranking, or conversion outcome is guaranteed.
- VAT/tax treatment pending accountant confirmation.
- This draft is not a tax invoice.

---

```text
═══════════════════════════════════════════════════════════════════════
                         QUOTATION (DRAFT — NOT SENT)
═══════════════════════════════════════════════════════════════════════

From
  CorpFlowAI Ltd
  Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius
  Business Registration Number: C25228280
  support@corpflowai.com

To
  [PRESTIGE_LEGAL_NAME]
  [PRESTIGE_CONTACT_NAME]
  [PRESTIGE_EMAIL]
  [PRESTIGE_ADDRESS_OPTIONAL]

Quotation reference : [ERPNext Quotation name — create after Anton price approval]
Issue date          : [ISSUE_DATE]
Valid until         : [ISSUE_DATE + 14 days]
Currency            : MUR (Mauritian Rupee)
GitHub / job ref    : #919

═══════════════════════════════════════════════════════════════════════
SCOPE (BASE PACKAGE — OPTION A)
═══════════════════════════════════════════════════════════════════════

Custom-designed public website for Prestige Procurement, delivered on
self-hosted WordPress on a hosting account that Prestige owns and pays
for, with a self-management suite so Prestige staff can update normal
content without CorpFlowAI after handover.

Included:
  • Discovery and locked sitemap (about eight pages unless we agree
    otherwise in writing)
  • Custom visual design (desktop + mobile) with two structured
    revision rounds
  • WordPress install on Prestige’s host, SSL, staging, roles
  • Templates for the agreed pages; reusable editor-safe sections
  • Enquiry form to Prestige’s mailbox; SEO fields; media library
  • Automated backups + one restore rehearsal + handover export
  • Analytics and Search Console set up on Prestige’s accounts
  • 90-minute recorded training + written editor guide
  • Credential handover on an approved secure channel
  • 30-day defect warranty after written acceptance

Duration baseline (not a committed calendar): 8–12 weeks after the
mobilisation payment is verified and required inputs have arrived.

═══════════════════════════════════════════════════════════════════════
LINE ITEMS
═══════════════════════════════════════════════════════════════════════

Item                                              Qty    Amount (MUR)
-----------------------------------------------------------------------
Custom independent website project
  (design, CMS, templates, self-management,
   QA, training, handover, 30-day warranty)         1      285,000.00

Client hosting, domain, stock photography,
premium licences                                    —      excluded
                                                       (Prestige pays)

Optional extras (catalogue, extra pages,
copywriting, bilingual)                             —      quoted only
                                                       if requested

                                              Subtotal:    285,000.00
                              VAT/Tax : pending accountant confirmation
                                              Total MUR:   285,000.00

Recommended fee. Final rate is the figure Anton approves in ERPNext.
Planning range if scope moves: MUR 245,000–335,000.

═══════════════════════════════════════════════════════════════════════
PAYMENT MILESTONES (NOT 50/50)
═══════════════════════════════════════════════════════════════════════

  1. Mobilisation — 20% — MUR 57,000
     Due on written acceptance, before discovery starts.

  2. Design approval — 20% — MUR 57,000
     Due when Prestige accepts the design.

  3. Build milestone — 25% — MUR 71,250
     Due when staging templates and self-management are demonstrable.

  4. Pre-launch — 20% — MUR 57,000
     Due on written proceed-to-launch after client review.

  5. Handover — 15% — MUR 42,750
     Due on written acceptance.

Payment instructions are sent separately after written acceptance.
Work on a phase starts only after that phase’s cleared funds are
manually verified. A screenshot of a transfer is not clearance.

═══════════════════════════════════════════════════════════════════════
ASSUMPTIONS
═══════════════════════════════════════════════════════════════════════

  • Prestige supplies logo, brand colours (or accepts a guided palette),
    service descriptions, and images, or marks pages as placeholder.
  • One named approver; feedback in one written batch per round.
  • Hosting account is opened in Prestige’s name; CorpFlowAI does not
    become the subscriber.
  • Primary language is English.
  • No public product catalogue and no e-commerce checkout in this total.
  • Existing domain (if any) stays in Prestige’s registrar account.

═══════════════════════════════════════════════════════════════════════
CLIENT RESPONSIBILITIES
═══════════════════════════════════════════════════════════════════════

  • Pay each milestone before the related work starts.
  • Create and pay the hosting account; keep domain ownership.
  • Supply content and approvals within agreed review windows.
  • Attend training; nominate the editor who will run the site.
  • Own analytics / Search Console / mailbox.

═══════════════════════════════════════════════════════════════════════
EXCLUSIONS
═══════════════════════════════════════════════════════════════════════

  • Recurring CorpFlowAI management fee (none in this offer)
  • Hosting, domain, paid stock, paid plugins beyond the agreed list
  • SEO ranking, traffic, or revenue guarantees
  • Unlimited revisions
  • E-commerce, custom apps, CRM, WhatsApp API, ERP integrations
  • CorpFlowAI-hosted tenant site as the live production website
  • Legal drafting of contracts; accountant VAT opinion

═══════════════════════════════════════════════════════════════════════
INDEPENDENT HOSTING NOTE
═══════════════════════════════════════════════════════════════════════

After handover, Prestige controls hosting, DNS, CMS admin, backups,
and content. CorpFlowAI removes its admin access at the end of the
30-day warranty unless Prestige asks in writing to keep a time-limited
emergency account. There is no hidden CorpFlowAI runtime.

═══════════════════════════════════════════════════════════════════════
ACCEPTANCE AND REVISIONS
═══════════════════════════════════════════════════════════════════════

  • Two structured revision rounds are included (design + pre-launch).
  • Extra rounds are quoted before work.
  • Defect warranty: 30 days after written acceptance (break/fix only).
  • Validity: 14 days from issue date unless extended in writing.

═══════════════════════════════════════════════════════════════════════
NEXT STEP (NOT A SEND)
═══════════════════════════════════════════════════════════════════════

This file is a draft for Anton. External send is not authorised here.

When Anton approves the MUR figure:
  1. Create ERPNext Customer + Quotation (draft).
  2. Use #882 Print Format when ready.
  3. Send only after Anton authorises that exact send.
  4. Do not treat this markdown as the signed original.

═══════════════════════════════════════════════════════════════════════
```

Leaner Option B (MUR 165,000) and Webflow Option C (MUR 225,000) are **not** printed as the primary quote. Swap the line item only if Anton chooses that option before issue.
