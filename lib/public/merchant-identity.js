/**
 * Canonical public merchant identity for CorpFlowAI Ltd (SBM / card-scheme website compliance).
 * Single source of truth for legal name, address, support contacts, and currency display.
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

export const SUPPORT_ACK_SLA_WORKING_DAYS = 2;
export const SUPPORT_PILOT_SLA_BUSINESS_DAYS = 1;

export const CURRENCY_PRIMARY = 'USD';
export const CURRENCY_SECONDARY = 'MUR';

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

export function formatCurrencyDisclosure() {
  return (
    'Prices for the AI Lead Rescue launch pilot are quoted in USD. ' +
    'Mauritius warm-network buyers may receive a local pro-forma in MUR at the equivalent of USD 150 on the day of invoicing. ' +
    'The currency charged is shown on each invoice or hosted payment page before you pay.'
  );
}

export function formatSupportSlaText() {
  return (
    `We acknowledge routine messages within ${SUPPORT_ACK_SLA_WORKING_DAYS} working days` +
    ` and within ${SUPPORT_PILOT_SLA_BUSINESS_DAYS} business day during active pilot windows.`
  );
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
