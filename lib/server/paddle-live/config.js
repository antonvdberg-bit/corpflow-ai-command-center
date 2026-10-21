import { cfg } from '../runtime-config.js';
import {
  isPaddlePriceId,
  PADDLE_LIVE_ALLOWED_CHECKOUT_DOMAINS,
  PADDLE_LIVE_BAD_PRICE_MAPPINGS,
  PADDLE_SANDBOX_PRICE_ENV_KEYS,
} from './catalog.js';

export const PADDLE_LIVE_ACCOUNT_ID = 'paddle-live-unactivated-account';
export const PADDLE_LIVE_ERPNEXT_WRITES = false;
export const PADDLE_LIVE_PUBLIC_CHECKOUT_AUTHORIZED = false;

function read(name) {
  return String(cfg(name, '') || '').trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function isLivePublicCheckoutEnabled() {
  return false;
}

export function assertLivePublicCheckoutAllowed() {
  throw new Error('PADDLE_LIVE_PUBLIC_CHECKOUT_NOT_AUTHORIZED');
}

/**
 * Fail-closed Live configuration. Orthogonal to Sandbox:
 * Sandbox keeps NEXT_PUBLIC_PADDLE_ENV=sandbox and the existing secret names.
 * Live requires PADDLE_RUNTIME_MODE=live plus separately prefixed Live values.
 */
export function getPaddleLiveConfig() {
  const runtimeMode = read('PADDLE_RUNTIME_MODE').toLowerCase();
  const publicEnv = read('NEXT_PUBLIC_PADDLE_ENV').toLowerCase();
  const sandboxClientToken = read('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN');
  const sandboxApiKey = read('PADDLE_API_KEY');
  const sandboxWebhookSecret = read('PADDLE_NOTIFICATION_WEBHOOK_SECRET');
  const liveClientToken = read('PADDLE_LIVE_CLIENT_TOKEN');
  const liveApiKey = read('PADDLE_LIVE_API_KEY');
  const liveWebhookSecret = read('PADDLE_LIVE_NOTIFICATION_WEBHOOK_SECRET');
  const checkoutDomain = read('PADDLE_LIVE_CHECKOUT_DOMAIN').toLowerCase();
  const publicCheckoutOverride = read('PADDLE_LIVE_PUBLIC_CHECKOUT').toLowerCase();

  const errors = [];
  if (runtimeMode && runtimeMode !== 'sandbox' && runtimeMode !== 'live') {
    errors.push('invalid_runtime_mode');
  }
  if (runtimeMode !== 'live') errors.push('live_mode_not_selected');

  if (publicEnv === 'production' || publicEnv === 'live') {
    errors.push('public_paddle_env_must_not_select_live');
  }

  if (!liveClientToken) errors.push('live_client_token_required');
  else if (!liveClientToken.startsWith('live_')) errors.push('live_client_token_prefix_required');
  if (liveClientToken && sandboxClientToken && liveClientToken === sandboxClientToken) {
    errors.push('live_client_token_matches_sandbox');
  }
  if (liveClientToken.startsWith('test_')) errors.push('sandbox_client_token_in_live_slot');

  if (!liveApiKey) errors.push('live_api_key_required');
  else if (!liveApiKey.startsWith('pdl_live_apikey_')) errors.push('live_api_key_prefix_required');
  if (liveApiKey && sandboxApiKey && liveApiKey === sandboxApiKey) {
    errors.push('live_api_key_matches_sandbox');
  }
  if (liveApiKey.startsWith('pdl_sdbx_apikey_')) errors.push('sandbox_api_key_in_live_slot');

  if (!liveWebhookSecret) errors.push('live_webhook_secret_required');
  if (liveWebhookSecret && sandboxWebhookSecret && liveWebhookSecret === sandboxWebhookSecret) {
    errors.push('live_webhook_secret_matches_sandbox');
  }

  if (!checkoutDomain) errors.push('live_checkout_domain_required');
  else if (!PADDLE_LIVE_ALLOWED_CHECKOUT_DOMAINS.includes(checkoutDomain)) {
    errors.push('live_checkout_domain_not_approved');
  }

  if (publicCheckoutOverride === 'true' || publicCheckoutOverride === '1' || publicCheckoutOverride === 'enabled') {
    errors.push('public_checkout_override_ignored');
  }

  const sandboxPriceIds = unique(
    PADDLE_SANDBOX_PRICE_ENV_KEYS.map((key) => read(key)).filter((value) => isPaddlePriceId(value)),
  );

  const prices = PADDLE_LIVE_BAD_PRICE_MAPPINGS.map((row) => {
    const raw = read(row.env_key);
    const mappingErrors = [];
    if (!raw) mappingErrors.push('live_price_id_unconfigured');
    else if (!isPaddlePriceId(raw)) mappingErrors.push('invalid_live_price_id');
    if (raw && sandboxPriceIds.includes(raw)) mappingErrors.push('sandbox_price_id_in_live_slot');
    return {
      item_code: row.item_code,
      env_key: row.env_key,
      amountZar: row.amountZar,
      mapped: mappingErrors.length === 0,
      mapping_errors: mappingErrors,
      paddle_price_id: mappingErrors.length === 0 ? raw : null,
    };
  });

  if (prices.some((row) => row.mapping_errors.includes('live_price_id_unconfigured'))) {
    errors.push('live_price_ids_incomplete');
  }
  if (prices.some((row) => row.mapping_errors.includes('invalid_live_price_id'))) {
    errors.push('live_price_ids_invalid');
  }
  if (prices.some((row) => row.mapping_errors.includes('sandbox_price_id_in_live_slot'))) {
    errors.push('sandbox_price_ids_cannot_map_live');
  }

  const seen = new Map();
  for (const row of prices) {
    if (!row.paddle_price_id) continue;
    if (seen.has(row.paddle_price_id)) errors.push('duplicate_live_price_ids');
    else seen.set(row.paddle_price_id, row.item_code);
  }

  const configured = errors.length === 0;
  return {
    environment: 'live',
    runtimeMode: runtimeMode || 'sandbox',
    accountId: PADDLE_LIVE_ACCOUNT_ID,
    checkoutDomain: checkoutDomain || null,
    configured,
    errors: unique(errors),
    publicCheckoutAuthorized: PADDLE_LIVE_PUBLIC_CHECKOUT_AUTHORIZED,
    publicCheckoutEnabled: isLivePublicCheckoutEnabled(),
    erpnextWrites: PADDLE_LIVE_ERPNEXT_WRITES,
    retainPwCustomer: false,
    prices,
    hasLiveClientToken: Boolean(liveClientToken),
    hasLiveApiKey: Boolean(liveApiKey),
    hasLiveWebhookSecret: Boolean(liveWebhookSecret),
    clientToken: configured ? liveClientToken : '',
    apiKey: configured ? liveApiKey : '',
    webhookSecret: configured ? liveWebhookSecret : '',
  };
}

export function assertPaddleLiveConfig(config) {
  const resolved = config == null ? getPaddleLiveConfig() : config;
  if (!resolved.configured) {
    throw new Error(`PADDLE_LIVE_NOT_CONFIGURED:${resolved.errors.join(',')}`);
  }
  return resolved;
}

export function publicLiveConfigView(config = getPaddleLiveConfig()) {
  return {
    ok: true,
    environment: 'live',
    runtime_mode: config.runtimeMode,
    configured: config.configured,
    configuration_errors: config.errors,
    public_checkout_authorized: false,
    public_checkout_enabled: false,
    erpnext_writes: false,
    retain_pw_customer: false,
    checkout_domain_approved: Boolean(config.checkoutDomain),
    mapped_price_count: config.prices.filter((row) => row.mapped).length,
    required_price_count: PADDLE_LIVE_BAD_PRICE_MAPPINGS.length,
    price_codes: config.prices.map((row) => ({
      item_code: row.item_code,
      mapped: row.mapped,
      mapping_errors: row.mapping_errors,
    })),
  };
}
