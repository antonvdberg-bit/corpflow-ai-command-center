/**
 * Approved Business Admin Desk Live catalogue mapping.
 * Live price IDs are operator-supplied env vars. This module never invents
 * Paddle product or price identifiers and never copies Sandbox IDs.
 */

export const PADDLE_LIVE_BAD_PRICE_MAPPINGS = Object.freeze([
  Object.freeze({
    item_code: 'BAD-ONBOARD-EXISTING',
    env_key: 'PADDLE_LIVE_BAD_ONBOARD_EXISTING_PRICE_ID',
    amountZar: 199,
  }),
  Object.freeze({
    item_code: 'BAD-REG-ONBOARD-BUNDLE',
    env_key: 'PADDLE_LIVE_BAD_REG_ONBOARD_BUNDLE_PRICE_ID',
    amountZar: 299,
  }),
  Object.freeze({
    item_code: 'BAD-ANNUAL-RETURN-BO-CURRENT',
    env_key: 'PADDLE_LIVE_BAD_ANNUAL_RETURN_BO_CURRENT_PRICE_ID',
    amountZar: 99,
  }),
  Object.freeze({
    item_code: 'BAD-BO-SIMPLE',
    env_key: 'PADDLE_LIVE_BAD_BO_SIMPLE_PRICE_ID',
    amountZar: 249,
  }),
  Object.freeze({
    item_code: 'BAD-DIRECTOR-APPT-RESIGN',
    env_key: 'PADDLE_LIVE_BAD_DIRECTOR_APPT_RESIGN_PRICE_ID',
    amountZar: 199,
  }),
  Object.freeze({
    item_code: 'BAD-ADDRESS-CHANGE',
    env_key: 'PADDLE_LIVE_BAD_ADDRESS_CHANGE_PRICE_ID',
    amountZar: 69,
  }),
  Object.freeze({
    item_code: 'BAD-SHARE-CERT-VERIFIED',
    env_key: 'PADDLE_LIVE_BAD_SHARE_CERT_VERIFIED_PRICE_ID',
    amountZar: 99,
  }),
  Object.freeze({
    item_code: 'BAD-NAME-RESERVATION',
    env_key: 'PADDLE_LIVE_BAD_NAME_RESERVATION_PRICE_ID',
    amountZar: 99,
  }),
  Object.freeze({
    item_code: 'BAD-FYE-CHANGE',
    env_key: 'PADDLE_LIVE_BAD_FYE_CHANGE_PRICE_ID',
    amountZar: 199,
  }),
]);

/** Sandbox env keys that must never be reused as Live mappings, including PR #1488 names. */
export const PADDLE_SANDBOX_PRICE_ENV_KEYS = Object.freeze([
  'NEXT_PUBLIC_PADDLE_PLATFORM_PRICE_ID',
  'NEXT_PUBLIC_PADDLE_IMPLEMENTATION_PRICE_ID',
  'NEXT_PUBLIC_PADDLE_BAD_ONBOARD_EXISTING_PRICE_ID',
  'NEXT_PUBLIC_PADDLE_BAD_REG_ONBOARD_BUNDLE_PRICE_ID',
  'NEXT_PUBLIC_PADDLE_BAD_ANNUAL_RETURN_BO_CURRENT_PRICE_ID',
  'NEXT_PUBLIC_PADDLE_BAD_BO_SIMPLE_PRICE_ID',
  'NEXT_PUBLIC_PADDLE_BAD_DIRECTOR_APPT_RESIGN_PRICE_ID',
  'NEXT_PUBLIC_PADDLE_BAD_ADDRESS_CHANGE_PRICE_ID',
  'NEXT_PUBLIC_PADDLE_BAD_SHARE_CERT_VERIFIED_PRICE_ID',
  'NEXT_PUBLIC_PADDLE_BAD_NAME_RESERVATION_PRICE_ID',
  'NEXT_PUBLIC_PADDLE_BAD_FYE_CHANGE_PRICE_ID',
]);

export const PADDLE_LIVE_ALLOWED_CHECKOUT_DOMAINS = Object.freeze([
  'businessadmindesk.co.za',
  'www.businessadmindesk.co.za',
]);

export function isPaddlePriceId(value) {
  return /^pri_[A-Za-z0-9]+$/.test(String(value || ''));
}
