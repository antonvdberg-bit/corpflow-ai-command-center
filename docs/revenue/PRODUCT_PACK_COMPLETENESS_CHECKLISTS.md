# Product pack completeness checklists (Lead Rescue + Website Rescue)

**Rail:** #714 · Machine keys in `config/commercial-approval-rail.v1.json` → `product_pack_completeness`
**Evaluator:** `evaluateProductPackCompleteness(product)` in `lib/revenue/commercial-approval.js`

<!-- PRODUCT_PACK_COMPLETENESS_CHECKLISTS_V1 -->

Use these checklists before marking an opportunity **proposal-ready**. Both packs must also pass the machine completeness evaluator in tests.

## Shared commercial spine (both products)

- [ ] Discovery / qualification summary complete (`DISCOVERY_QUALIFICATION_SUMMARY.md`)
- [ ] Product proposal / quotation from the product template
- [ ] Scope, assumptions, exclusions, revision limits, client responsibilities present on the proposal
- [ ] Price + currency + payment terms filled
- [ ] Acceptance record template ready for use
- [ ] Payment evidence / pro-forma handoff template ready for use
- [ ] Storage/linking refs planned (`COMMERCIAL_STORAGE_AND_LINKING.md`)
- [ ] Pricing recommendation packet consulted (recommendation ≠ Anton final for every band)
- [ ] Won/lost vocabulary known (no free-form substitute)

## Lead Rescue pack

- [ ] Canonical proposal template: `docs/revenue/templates/LEAD_RESCUE_PROPOSAL_TEMPLATE.md`
- [ ] Quote-ready / product pack consulted: `docs/marketing/LEAD_RESCUE_PRODUCT_PACK_V1.md` (or quote-ready packet)
- [ ] Pricing guide consulted: `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md`
- [ ] Offer kind: pilot or standard explicitly chosen
- [ ] Single leaky source / pilot exclusions present
- [ ] No messaging-runtime promise without separate authorisation
- [ ] Manual pro-forma path known: `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md`
- [ ] Onboarding consumer understood: #715 publishes only after `financially_approved`

## Website Rescue pack

- [ ] Canonical proposal template: `docs/revenue/templates/WEBSITE_RESCUE_PROPOSAL_TEMPLATE.md`
- [ ] Product pack consulted: `docs/marketing/WEBSITE_RESCUE_PRODUCT_PACK_V1.md`
- [ ] Pricing guide consulted: `docs/sales/WEBSITE_RESCUE_PRICING_GUIDE.md`
- [ ] Case type chosen: upgrade / rebuild / one-page / small-catalogue
- [ ] Deposit / balance terms aligned with recommendation or guide
- [ ] Content / client responsibility and revision limits present
- [ ] Production cutover **not** implied by quote acceptance alone
- [ ] Onboarding consumer understood: #716 publishes only after `financially_approved`

## Fail-closed reminder

Do **not** tick “financially approved” from this checklist alone. Run:

```js
canMarkFinanciallyApproved(commercialRecord)
```

Acceptance without payment evidence (or complete exception) must fail. Payment evidence without acceptance must fail.
