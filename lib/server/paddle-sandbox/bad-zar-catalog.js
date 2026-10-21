/**
 * Approved Business Admin Desk ZAR catalogue for Paddle sandbox mapping.
 * Price IDs must come from operator-supplied sandbox env vars. This module
 * never invents Paddle product or price identifiers.
 */

export const BAD_ZAR_CURRENCY = 'ZAR';

export const APPROVED_BAD_ZAR_SERVICES = Object.freeze([
  {
    item_code: 'BAD-ONBOARD-EXISTING',
    item_name: 'Existing-company onboarding',
    zar_amount: 199,
    env_key: 'NEXT_PUBLIC_PADDLE_BAD_ONBOARD_EXISTING_PRICE_ID',
  },
  {
    item_code: 'BAD-REG-ONBOARD-BUNDLE',
    item_name: 'New-company standard registration plus onboarding bundle',
    zar_amount: 299,
    env_key: 'NEXT_PUBLIC_PADDLE_BAD_REG_ONBOARD_BUNDLE_PRICE_ID',
  },
  {
    item_code: 'BAD-ANNUAL-RETURN-BO-CURRENT',
    item_name: 'Annual Return (BO current)',
    zar_amount: 99,
    env_key: 'NEXT_PUBLIC_PADDLE_BAD_ANNUAL_RETURN_BO_CURRENT_PRICE_ID',
  },
  {
    item_code: 'BAD-BO-SIMPLE',
    item_name: 'Simple Beneficial Ownership',
    zar_amount: 249,
    env_key: 'NEXT_PUBLIC_PADDLE_BAD_BO_SIMPLE_PRICE_ID',
  },
  {
    item_code: 'BAD-DIRECTOR-APPT-RESIGN',
    item_name: 'Director appointment/resignation (ordinary case)',
    zar_amount: 199,
    env_key: 'NEXT_PUBLIC_PADDLE_BAD_DIRECTOR_APPT_RESIGN_PRICE_ID',
  },
  {
    item_code: 'BAD-ADDRESS-CHANGE',
    item_name: 'Registered-address change',
    zar_amount: 69,
    env_key: 'NEXT_PUBLIC_PADDLE_BAD_ADDRESS_CHANGE_PRICE_ID',
  },
  {
    item_code: 'BAD-SHARE-CERT-VERIFIED',
    item_name: 'Share certificate based on verified company register',
    zar_amount: 99,
    env_key: 'NEXT_PUBLIC_PADDLE_BAD_SHARE_CERT_VERIFIED_PRICE_ID',
  },
  {
    item_code: 'BAD-NAME-RESERVATION',
    item_name: 'Name reservation',
    zar_amount: 99,
    env_key: 'NEXT_PUBLIC_PADDLE_BAD_NAME_RESERVATION_PRICE_ID',
  },
  {
    item_code: 'BAD-FYE-CHANGE',
    item_name: 'Financial year-end change',
    zar_amount: 199,
    env_key: 'NEXT_PUBLIC_PADDLE_BAD_FYE_CHANGE_PRICE_ID',
  },
]);

export function isPaddleSandboxPriceId(value) {
  return /^pri_[A-Za-z0-9]+$/.test(String(value || ''));
}

function readEnv(name, env = process.env) {
  return String(env?.[name] || '').trim();
}

export function getApprovedBadZarService(itemCode) {
  return APPROVED_BAD_ZAR_SERVICES.find((row) => row.item_code === itemCode) || null;
}

export function mapBadZarCatalog(env = process.env) {
  const services = APPROVED_BAD_ZAR_SERVICES.map((row) => {
    const raw = readEnv(row.env_key, env);
    let paddle_price_id = null;
    let mapping_error = null;
    if (!raw) mapping_error = 'sandbox_price_id_unconfigured';
    else if (!isPaddleSandboxPriceId(raw)) mapping_error = 'invalid_paddle_price_id';
    else paddle_price_id = raw;
    return {
      item_code: row.item_code,
      item_name: row.item_name,
      currency: BAD_ZAR_CURRENCY,
      zar_amount: row.zar_amount,
      paddle_amount_minor: row.zar_amount * 100,
      env_key: row.env_key,
      paddle_price_id,
      mapping_error,
      checkout_ready: Boolean(paddle_price_id),
    };
  });
  const seen = new Map();
  const duplicate_price_ids = [];
  for (const row of services) {
    if (!row.paddle_price_id) continue;
    if (seen.has(row.paddle_price_id)) duplicate_price_ids.push(row.paddle_price_id);
    else seen.set(row.paddle_price_id, row.item_code);
  }
  return {
    currency: BAD_ZAR_CURRENCY,
    required_count: APPROVED_BAD_ZAR_SERVICES.length,
    mapped_count: services.filter((row) => row.checkout_ready).length,
    missing_env_keys: services.filter((row) => row.mapping_error === 'sandbox_price_id_unconfigured').map((row) => row.env_key),
    invalid_env_keys: services.filter((row) => row.mapping_error === 'invalid_paddle_price_id').map((row) => row.env_key),
    duplicate_price_ids,
    checkout_ready: services.every((row) => row.checkout_ready) && duplicate_price_ids.length === 0,
    services,
  };
}

export function findBadZarServiceByPriceId(priceId, env = process.env) {
  if (!isPaddleSandboxPriceId(priceId)) return null;
  return mapBadZarCatalog(env).services.find((row) => row.paddle_price_id === priceId) || null;
}

export function expectedPaddleMinorAmount(zarAmount) {
  return Number(zarAmount) * 100;
}
