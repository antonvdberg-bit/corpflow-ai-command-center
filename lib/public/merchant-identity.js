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

/** Short label for MUR rapid-delivery sprint invoicing (Mauritius bank path). */
export const MUR_SPRINT_PAYMENT_NOTE =
  'Mauritius delivery-sprint clients pay in MUR by manual bank transfer against an ERPNext invoice. ' +
  'CorpFlowAI is still obtaining a USD account for that path, so MUR sprint deposits and balances are accepted in MUR only.';

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
 * Currency disclosure for public surfaces that mention both paths.
 * Distinguishes the USD 150 Lead Rescue pilot from MUR delivery sprints.
 */
export function formatCurrencyDisclosure() {
  return (
    'Two payment paths exist. The separate AI Lead Rescue launch pilot at /lead-rescue is quoted in USD. ' +
    'Mauritius delivery sprints on /offers/* (from MUR 35,000 / MUR 45,000) are invoiced and paid in MUR by manual bank transfer; ' +
    'CorpFlowAI is still obtaining a USD account for the sprint path, so those clients are not asked to pay in USD. ' +
    'The currency charged is always shown on the invoice before you pay. No card capture on public marketing pages.'
  );
}

/** Operator / proposal helper — MUR sprint path only. */
export function formatMurSprintPaymentDisclosure() {
  return MUR_SPRINT_PAYMENT_NOTE;
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
