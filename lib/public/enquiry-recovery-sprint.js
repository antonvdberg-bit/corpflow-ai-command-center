/**
 * Compatibility exports for the permanent Lead Rescue offer.
 *
 * The internal offer slug remains `ai-lead-rescue`; public naming stays Lead Rescue.
 * The historical Mauritius sprint is closed to new sales. Existing accepted quotes
 * retain their agreed terms.
 */

export const ENQUIRY_RECOVERY_PATH = '/lead-rescue';
export const ENQUIRY_RECOVERY_DIAGNOSIS_HASH = 'diagnosis';
export const ENQUIRY_RECOVERY_DIAGNOSIS_HREF = `${ENQUIRY_RECOVERY_PATH}#${ENQUIRY_RECOVERY_DIAGNOSIS_HASH}`;

export const ENQUIRY_RECOVERY_OFFER_NAME = 'Lead Rescue';
export const ENQUIRY_RECOVERY_PRICE_MUR = 12900;
export const ENQUIRY_RECOVERY_DEPOSIT_MUR = 6450;
export const ENQUIRY_RECOVERY_BALANCE_MUR = 6450;

export const ENQUIRY_RECOVERY_PRICE_LINE = 'MUR 12,900 setup · MUR 6,900/month optional care';
export const ENQUIRY_RECOVERY_DEPOSIT_LINE =
  'MUR 6,450 before work starts. The balance is confirmed in writing before agreed release or handover.';
export const ENQUIRY_RECOVERY_PREVIEW_LINE =
  'Timing is confirmed individually after fit, access, assets and the agreed installation cadence are verified.';
export const ENQUIRY_RECOVERY_NO_GUARANTEE_LINE =
  'We do not guarantee new revenue. We help identify and recover valuable enquiries that have gone quiet, and reduce the chance that follow-up is forgotten.';
export const ENQUIRY_RECOVERY_QUALIFICATION_LINE =
  'The standard scope covers one supported enquiry source and up to 500 enquiry records per month.';
export const ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL = 'Request an assessment';
export const ENQUIRY_RECOVERY_LOSS_LINE =
  'You already paid to generate the enquiry. The question is whether it disappears before it becomes revenue.';
export const ENQUIRY_RECOVERY_IMPLEMENTATION_LINE =
  'We map one supported enquiry source, configure agreed capture, routing and alerts, test the path with you, and obtain acceptance. Your team replies to prospects and closes sales.';
export const LEAD_RESCUE_PUBLIC_PAYMENT_LINE =
  'No payment is taken when you request an assessment. We confirm fit, scope, timing, taxes, price and payment instructions in writing before you commit.';
