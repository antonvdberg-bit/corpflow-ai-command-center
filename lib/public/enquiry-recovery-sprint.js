/**
 * Buyer-facing source of truth for the live Lead Rescue offer.
 *
 * The internal offer slug remains `ai-lead-rescue`; public naming stays Lead Rescue
 * so the website, video, and buyer journey use one product identity.
 * Historic USD 150 / MUR 35,000 copy is not current commercial pricing.
 */

export const ENQUIRY_RECOVERY_PATH = '/lead-rescue';
export const ENQUIRY_RECOVERY_DIAGNOSIS_HASH = 'diagnosis';
export const ENQUIRY_RECOVERY_DIAGNOSIS_HREF = `${ENQUIRY_RECOVERY_PATH}#${ENQUIRY_RECOVERY_DIAGNOSIS_HASH}`;

export const ENQUIRY_RECOVERY_OFFER_NAME = 'Lead Rescue';
export const ENQUIRY_RECOVERY_PRICE_MUR = 85000;
export const ENQUIRY_RECOVERY_DEPOSIT_MUR = 51000;
export const ENQUIRY_RECOVERY_BALANCE_MUR = 34000;
export const ENQUIRY_RECOVERY_FOUNDING_SLOTS = 3;

export const ENQUIRY_RECOVERY_PRICE_LINE = 'MUR 85,000 fixed';
export const ENQUIRY_RECOVERY_DEPOSIT_LINE =
  'MUR 51,000 (60%) deposit to start. MUR 34,000 (40%) after approved preview and before production release.';
export const ENQUIRY_RECOVERY_PREVIEW_LINE =
  'First visible preview is targeted within 72 hours after cleared deposit, required access, and required assets or information — not an unconditional 72-hour delivery guarantee.';
export const ENQUIRY_RECOVERY_SCARCITY_LINE =
  'We can currently accommodate a maximum of three Lead Rescue clients.';
export const ENQUIRY_RECOVERY_NO_GUARANTEE_LINE =
  'We do not guarantee new revenue. We help identify and recover valuable enquiries that have gone quiet, and reduce the chance that follow-up is forgotten.';
export const ENQUIRY_RECOVERY_QUALIFICATION_LINE =
  'If we cannot identify a commercially meaningful recovery problem, we should not work together.';
export const ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL = 'Request a 15-minute diagnosis';
export const ENQUIRY_RECOVERY_LOSS_LINE =
  'You already paid to generate the enquiry. The question is whether it disappears before it becomes revenue.';
export const ENQUIRY_RECOVERY_IMPLEMENTATION_LINE =
  'You explain how enquiries arrive today, provide required access and assets if we proceed, review the preview, and decide. CorpFlowAI does the implementation work — this is not a software project for you to manage.';
export const LEAD_RESCUE_PUBLIC_PAYMENT_LINE =
  'No payment is taken when you request a diagnosis. If Lead Rescue is a fit, commercial terms are confirmed in the written offer.';
