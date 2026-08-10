# Commercial storage and linking (existing systems)

**Rail:** #714 · `docs/revenue/COMMERCIAL_APPROVAL_RAIL_V1.md`  
**Use:** Operator procedure for where commercial evidence lives and how records link — **without** a new CRM, payment runtime, or Prospect Ops UI redesign (#721).

<!-- COMMERCIAL_STORAGE_AND_LINKING_V1 -->

## 1. Principle

Store **references and summaries**, not secrets. Prefer opaque ids (`PAY-EV-…`, ERPNext entry id, email message id, ticket id) over bank screenshots or credential material.

Forbidden in repo fixtures and committed artifacts: live bank credentials, card numbers, private client financial documents, API keys, passwords.

## 2. Where each artifact lives

| Artifact | Primary home (existing) | Link fields on commercial record |
|---|---|---|
| Discovery / qualification summary | Operator copy of `DISCOVERY_QUALIFICATION_SUMMARY.md` (local/docs folder, or ticket attachment / note) | `qualification_summary_ref`, `prospect_ref` |
| Proposal / quotation draft | Filled product template (`LEAD_RESCUE_*` / `WEBSITE_RESCUE_*`) as PDF/doc/email draft held by operator | `proposal_version`, proposal status; optional `proposal_ref` |
| Client-facing send | **Manual** email/WhatsApp/PDF only — not automated | Status `provided_to_client` only after human delivery |
| Acceptance record | Filled `COMMERCIAL_ACCEPTANCE_RECORD.md` + evidence ref (email msg id / signed PDF path ref) | `acceptance_*` fields |
| Pro-forma / invoice | ERPNext Quotation/Sales Invoice **when configured**, else manual PDF per `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` | Payment evidence `invoice_ref` / pro-forma handoff section |
| Payment evidence | Operator-verified reference only (`PAYMENT_EVIDENCE_RECORD.md`) | `payment_evidence_ref`, evidence status |
| Financial approval | Named approver + timestamp on commercial JSON/record; gate via `canMarkFinanciallyApproved` | `approved_by`, `approval_timestamp`, `financial_approval_ref` |
| Won / lost | Commercial record vocabulary codes | `won_lost_status`, `won_lost_reason` |
| Onboarding handoff | Boolean + refs consumed by #715 / #716 | `toOnboardingHandoff()` → `financially_approved`, `onboarding_ref` |
| Prospect stage | Prospect Ops / maturation (#713/#721) — **do not redesign here** | `prospect_ref` only |

## 3. Suggested folder / naming (operator-local)

When not using ERPNext, keep a private operator folder (outside git or in a private ticket attachment):

```text
commercial/<opportunity_ref>/
  01-qualification-summary.md
  02-proposal-v1.0.pdf   (or .md draft)
  03-acceptance-record.md
  04-payment-evidence.md
  05-financial-approval-note.md
```

Commit **templates and synthetic fixtures only** to this repository. Do not commit real client packs.

## 4. Linking checklist (per opportunity)

- [ ] `opportunity_ref` stable across all artifacts  
- [ ] `prospect_ref` set when a Prospect Ops record exists  
- [ ] `proposal_version` matches the accepted document  
- [ ] Acceptance evidence ref points to the same version  
- [ ] Payment evidence ref (or complete exception) recorded  
- [ ] `financial_approval_ref` issued only after gate `ok`  
- [ ] `onboarding_ref` / delivery issue created only after financially approved  
- [ ] Won/lost reason set from vocabulary when terminal  

## 5. Systems intentionally not added

- No new payment collection UI  
- No bank polling / webhook automation  
- No automated client send  
- No ERPNext customization in this rail  
- No second prospect database  

## 6. Handoff sentence (copy for ticket)

> Commercial pack for `<OPPORTUNITY_REF>`: qualification `<QUAL_REF>`, proposal `<VERSION>`, acceptance recorded, payment evidence `<PAY_REF>` (or exception), financial approval `<FA_REF>`. Handoff to #715/#716 with `financially_approved=true`. No payment automation executed.
