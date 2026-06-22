# PAY-SBM-3 — Website MPGS e-Commerce compliance checklist

**Status:** Website compliance copy for SBM / MPGS merchant onboarding (test gateway released; **no live charging** in this packet).  
**Branch:** `feat/pay-sbm-3-website-mpgs-compliance`  
**Prior art:** PAY-SBM-1 (`docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md`), PAY-SBM-2 (merged `0fd9312b`).

**Hard limits honoured:** No MPGS credentials, API keys, merchant IDs, or payment URLs in the repo. No live checkout implementation. No new `.env` variable names. No secrets committed.

---

## Requirement mapping

| # | SBM / card-association requirement | Where satisfied on the website | Notes |
|---|--------------------------------------|----------------------------------|-------|
| 1 | Complete description of services offered | `/services` (primary); `/terms` § Service description; `/about`; `/lead-rescue` offer copy | Digital services only; no physical goods |
| 2 | Customer service contact: email, telephone, response expectation | `/contact` § Customer service; `/services` § Customer service; `components/CustomerServiceContact.js`; `components/PublicSiteFooter.js` | **Telephone:** see Anton confirmations below |
| 3 | Permanent establishment / company address | `lib/public/merchant-identity.js`; footer; `/about` § CorpFlowAI Ltd; `/terms` § Governing law | Dextra Lane address + BRN C25228280 |
| 4 | Transaction currency display (USD and MUR) | `formatCurrencyDisclosure()` in footer, `/terms`, `/refund-policy`, `/lead-rescue`, `/services` | USD primary; MUR for Mauritius pro-forma |
| 5 | Refund, return, and cancellation policy (digital) | `/refund-policy`; links from `/delivery-policy` | Digital returns section + chargeback note |
| 6 | Delivery policy (digital; no physical shipping) | `/delivery-policy`; `/terms` § Service fulfilment | Explicit no-shipment language |
| 7 | Privacy / consumer data privacy policy | `/privacy`; privacy contact via `CustomerServiceContact` | Subprocessor summary includes SBM/MPGS when live |
| 8 | Security policy for payment card transmission | `/payment-security`; `/privacy` § Payment-card transmission; `/standards` § Security posture | No card storage on CorpFlowAI; bank-hosted page |
| 9 | Merchant outlet country: Mauritius | `MERCHANT_OUTLET_COUNTRY` in `lib/public/merchant-identity.js`; footer; `/about`; `/terms` | Stated explicitly |
| 10 | Visa / MasterCard / UPI acceptance wording (no live acceptance implied) | `/payment-security` § Visa, Mastercard, and UPI | Text only — no logos until SBM approval + live acceptance |
| 11 | Transaction receipt field readiness | `/payment-security` § Receipts; `/terms` § Receipts; `TRANSACTION_RECEIPT_FIELDS` in `lib/public/merchant-identity.js` | ERPNext/PDF invoice path uses same fields at payment time (future packet) |

---

## Canonical source file

Public merchant facts are centralized in:

`lib/public/merchant-identity.js`

Update that file when Anton confirms the support telephone or any legal identity change. Pages and footer import from it.

---

## Anton must confirm before SBM website attestation

| Item | Status | Action |
|------|--------|--------|
| **Customer service telephone** | **BLOCKING** | Set `CUSTOMER_SERVICE_PHONE` in `lib/public/merchant-identity.js` to the monitored Mauritius business line (E.164 or international format). Until set, `/contact` shows interim callback-by-email wording. |
| **Support inbox monitored** | Confirm | Send test email to `support@corpflowai.com`; confirm two-working-day SLA is achievable. |
| **Registered office / BRN** | Likely OK | Values match PAY-SBM-2 and accountant pack — re-confirm against certificate of incorporation if SBM asks. |
| **Visa / Mastercard logo usage** | Hold | Do **not** add logos until SBM confirms guidelines and live acceptance begins (per PAY-SBM-1 Q23). |
| **MPGS test credentials** | Off-repo | Store only in Vercel secrets / operator vault when integration packet is authorised — **not in this PR**. |
| **Hosted payment URL placeholder** | Future packet | Use `https://[SBM-MPGS-HOSTED-CHECKOUT-PLACEHOLDER]` in integration docs only; no real URL in repo until SBM supplies it. |
| **Website attestation signature** | Anton | Sign SBM *Web Site Requirements* attestation after preview + production live verification. |

---

## Verification (after merge + deploy)

Minimum live GET checks on production:

| URL | Expected |
|-----|----------|
| `https://corpflowai.com/services` | 200 — services description |
| `https://corpflowai.com/delivery-policy` | 200 — digital delivery, no shipping |
| `https://corpflowai.com/payment-security` | 200 — card security + receipt fields |
| `https://corpflowai.com/contact` | 200 — email + SLA (+ phone or interim text) |
| `https://corpflowai.com/lead-rescue` | 200 — USD/MUR currency line in payment section |
| Footer on apex pages | Merchant identity + currency disclosure |

Forbidden-phrase audit: no *Pay now*, *instant checkout*, or live card-acceptance claims on marketing pages.

---

## What this packet does **not** do

- Does not configure MPGS or create merchant API keys  
- Does not add hosted checkout or payment links to the website  
- Does not add Visa/Mastercard logo images  
- Does not change ERPNext, Prisma, middleware, or payment API routes  
- Does not add secrets to `.env.template`

Gateway integration (TEST Payment-by-Link spike): **`docs/finance/PAY_SBM_4_MPGS_TEST_PAYMENT_BY_LINK_CHECKLIST.md`**

---

## Phase 2 pointer

Website compliance (Phase 1) is in this PR. MPGS TEST Payment-by-Link (Phase 2) lives in the same branch with factory-only API routes under `lib/server/payments/` and buyer return page `/pay/return`. See PAY-SBM-4 checklist for test steps and verification discipline.

---

## Cross-references

- `docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md`  
- `docs/finance/PAYMENT_READINESS_2026_06_01.md`  
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` (payment after intent)  
- `.cursor/rules/delivery-reality.mdc` (live verification for customer-visible changes)
