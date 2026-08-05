/**
 * Canonical public merchant identity for CorpFlowAI Ltd (SBM / card-scheme website compliance).
 * Single source of truth for legal name, address, support contacts, and public payment disclosure.
 *
 * Public footer / disclosure wording follows:
 * docs/marketing/CORPFLOW_PUBLIC_FOOTER_STANDARD_V1.md
 *
 * Operator: set CUSTOMER_SERVICE_PHONE before SBM website attestation (see
 * docs/finance/PAY_SBM_3_WEBSITE_MPGS_COMPLIANCE_CHECKLIST.md).
 */

export const MERCHANT_LEGAL_NAME = 'CorpFlowAI Ltd';
export const MERCHANT_BRN = 'C25228280';
export const MERCHANT_REGISTERED_OFFICE =
  'Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius';
export const MERCHANT_OUTLET_COUNTRY = 'Mauritius';
export const MERCHANT_WEBSITE = 'https://corpflowai.com';
export const MERCHANT_WEBSITE_HOST = 'corpflowai.com';

export const CUSTOMER_SERVICE_EMAIL = 'support@corpflowai.com';

/** Monitored business telephone for merchant support (confirmed by Anton for SBM website compliance). */
export const CUSTOMER_SERVICE_PHONE = '+230 5901 4284';

/** Public acknowledgement target for routine enquiries (footer / CustomerServiceContact). */
export const SUPPORT_ACK_SLA_BUSINESS_DAYS = 1;

export const CURRENCY_PRIMARY = 'USD';
export const CURRENCY_SECONDARY = 'MUR';

/**
 * Operator / proposal helper — MUR sprint path only (not for public footers).
 * Keep free of account-opening status and public pricing.
 */
export const MUR_SPRINT_PAYMENT_NOTE =
  'Mauritius delivery-sprint clients are invoiced in MUR. Currency and payment instructions are confirmed in writing on the invoice before payment.';

export const TRANSACTION_RECEIPT_FIELDS = [
  'Order or invoice reference number',
  'Purchaser name',
  'Transaction date and time',
  'Transaction amount',
  'Currency (USD or MUR as shown on the invoice)',
  'Merchant legal name (CorpFlowAI Ltd)',
  'Merchant website address (corpflowai.com)',
  'Payment authorization or gateway reference code when provided by the bank',
  'Masked card number only (last four digits when applicable) — never the full card number',
];

export function hasCustomerServicePhone() {
  return Boolean(String(CUSTOMER_SERVICE_PHONE || '').trim());
}

/**
 * Maximum public payment disclosure for footers and shared legal/support surfaces.
 * No prices, path URLs, multi-path routing, or bank-account status.
 * See docs/marketing/CORPFLOW_PUBLIC_FOOTER_STANDARD_V1.md.
 */
export function formatCurrencyDisclosure() {
  return (
    'Commercial terms, currency and payment instructions are confirmed in writing before payment. ' +
    'CorpFlowAI does not collect card details on public marketing pages.'
  );
}

/** Operator / proposal helper — MUR sprint path only. */
export function formatMurSprintPaymentDisclosure() {
  return MUR_SPRINT_PAYMENT_NOTE;
}

export function formatSupportSlaText() {
  return 'We aim to acknowledge routine enquiries within one business day.';
}

export function formatMerchantIdentityLine() {
  const parts = [
    `${MERCHANT_LEGAL_NAME}`,
    MERCHANT_REGISTERED_OFFICE,
    `BRN ${MERCHANT_BRN}`,
    `Merchant outlet country: ${MERCHANT_OUTLET_COUNTRY}`,
  ];
  return parts.join(' · ');
}
