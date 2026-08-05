# CorpFlowAI public footer standard (v1)

**Status:** Canonical for public marketing footers and shared merchant-support / payment disclosure helpers.  
**Source of truth (runtime):** `lib/public/merchant-identity.js` → `components/PublicSiteFooter.js` (and `CorpFlowPublicFooter` wrapper).  
**NO IMPLEMENTATION AUTHORIZED beyond keeping public copy aligned with this standard.**

## Purpose

Public footers must be stable, simple, and trustworthy. They must **not** do the work of an offer page, proposal, or invoice.

## Allowed footer content

- CorpFlowAI identity (legal name, registered office, BRN, merchant outlet country)
- Concise trust / company descriptor (optional wrapper, e.g. `CorpFlowPublicFooter`)
- Support email: `support@corpflowai.com`
- Support telephone: `+230 5901 4284` (when published)
- Privacy, terms, and other policy / nav links
- Optional general contact link
- Concise payment statement only at the maximum level below

## Canonical support wording

```text
Service questions: support@corpflowai.com · +230 5901 4284
```

## Canonical response expectation (public)

```text
We aim to acknowledge routine enquiries within one business day.
```

Do **not** use: “within 2 and within 1 business day”, pilot-window caveats, unsupported guarantees, or over-specific SLA wording in a public footer.

## Canonical payment wording (maximum for a general footer / shared disclosure)

```text
Commercial terms, currency and payment instructions are confirmed in writing before payment. CorpFlowAI does not collect card details on public marketing pages.
```

Implemented by `formatCurrencyDisclosure()` and `formatSupportSlaText()` in `lib/public/merchant-identity.js`.

## Forbidden in public footers (and site-wide shared disclosure helpers)

- Readable MUR or USD **prices**
- USD vs MUR routing explanations
- Bank-transfer process detail or account-opening status
- “Two payment paths” / internal commercial architecture
- Offer-path URLs used as commercial explanations (`/lead-rescue`, `/offers/*`)
- Contradictory or broken response-time wording
- Historical pricing explanations

## Offer-page pricing (intentionally preserved)

Product-specific prices remain only on approved offer / product surfaces (for example `/offers/*`, `/lead-rescue` USD 150 pilot copy). Do **not** remove those prices merely because they exist on the page. Do **not** copy those prices into the shared footer.

## SEO note

Repeated footer pricing is **not** required for search. Intentional offer-page pricing remains indexable where published. Do not add hidden pricing, metadata spam, or structured data solely to compensate for footer cleanup.

## Related

- Brand / conversion: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`
- SBM website compliance mapping: `docs/finance/PAY_SBM_3_WEBSITE_MPGS_COMPLIANCE_CHECKLIST.md` (currency/support rows follow this footer standard)
