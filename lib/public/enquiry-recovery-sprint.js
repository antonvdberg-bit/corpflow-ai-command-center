/**
 * Buyer-facing source of truth for the live Lead Rescue offer.
 *
 * The internal offer slug remains `ai-lead-rescue`; public naming stays Lead Rescue
 * so the website, video, and buyer journey use one product identity.
 * The current standard Lead Rescue offer is separate from this legacy
 * compatibility path. Accepted historical quotations retain their terms.
 */

export const ENQUIRY_RECOVERY_PATH = '/lead-rescue';
export const ENQUIRY_RECOVERY_DIAGNOSIS_HASH = 'diagnosis';
export const ENQUIRY_RECOVERY_DIAGNOSIS_HREF = `${ENQUIRY_RECOVERY_PATH}#${ENQUIRY_RECOVERY_DIAGNOSIS_HASH}`;

export const ENQUIRY_RECOVERY_OFFER_NAME = 'Lead Rescue';
export const ENQUIRY_RECOVERY_PRICE_MUR = 12900;
export const ENQUIRY_RECOVERY_DEPOSIT_MUR = null;
export const ENQUIRY_RECOVERY_BALANCE_MUR = null;
export const ENQUIRY_RECOVERY_FOUNDING_SLOTS = null;

export const ENQUIRY_RECOVERY_PRICE_LINE = 'MUR 12,900 setup; optional care MUR 6,900 / month';
export const ENQUIRY_RECOVERY_DEPOSIT_LINE =
  'Setup and monthly care are separate. Payment timing and any deposit are confirmed in the written quote.';
export const ENQUIRY_RECOVERY_PREVIEW_LINE =
  'Delivery timing is confirmed individually after fit, access, scope and acceptance are agreed.';
export const ENQUIRY_RECOVERY_SCARCITY_LINE =
  'We assess fit and scope before any contract or payment.';
export const ENQUIRY_RECOVERY_NO_GUARANTEE_LINE =
  'We do not guarantee new revenue. We help identify and recover valuable enquiries that have gone quiet, and reduce the chance that follow-up is forgotten.';
export const ENQUIRY_RECOVERY_QUALIFICATION_LINE =
  'If we cannot identify a commercially meaningful recovery problem, we should not work together.';
export const ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL = 'Request a 15-minute diagnosis';
export const ENQUIRY_RECOVERY_LOSS_LINE =
  'You already paid to generate the enquiry. The question is whether it disappears before it becomes revenue.';
export const ENQUIRY_RECOVERY_IMPLEMENTATION_LINE =
  'You explain how enquiries arrive today, provide required access and assets if we proceed, review the preview, and decide. CorpFlowAI does the implementation work — this is not a software project for you to manage. We keep the human working experience clear while structuring enquiry state and controlled automation so AI assistants can support the process progressively without forcing a rebuild.';
export const LEAD_RESCUE_PUBLIC_PAYMENT_LINE =
  'No payment is taken when you request a diagnosis. If Lead Rescue is a fit, commercial terms are confirmed in the written offer.';
