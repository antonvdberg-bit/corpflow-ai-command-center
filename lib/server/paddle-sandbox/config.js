import { cfg } from '../runtime-config.js';

export const PADDLE_SANDBOX_ACCOUNT_ID = 'paddle-sandbox-proof-account';

function read(name) {
  return String(cfg(name, '') || '').trim();
}

export function getPaddleSandboxConfig() {
  const environment = read('NEXT_PUBLIC_PADDLE_ENV');
  const clientToken = read('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN');
  const platformPriceId = read('NEXT_PUBLIC_PADDLE_PLATFORM_PRICE_ID');
  const implementationPriceId = read('NEXT_PUBLIC_PADDLE_IMPLEMENTATION_PRICE_ID');
  const apiKey = read('PADDLE_API_KEY');
  const webhookSecret = read('PADDLE_NOTIFICATION_WEBHOOK_SECRET');

  const errors = [];
  if (environment !== 'sandbox') errors.push('sandbox_environment_required');
  if (!clientToken.startsWith('test_')) errors.push('sandbox_client_token_required');
  if (!/^pri_[A-Za-z0-9]+$/.test(platformPriceId)) errors.push('platform_price_id_required');
  if (!/^pri_[A-Za-z0-9]+$/.test(implementationPriceId)) errors.push('implementation_price_id_required');
  if (apiKey && !apiKey.startsWith('pdl_sdbx_apikey_')) errors.push('sandbox_api_key_required');
  if (!webhookSecret) errors.push('webhook_secret_required');

  return {
    environment,
    clientToken,
    platformPriceId,
    implementationPriceId,
    apiKey,
    webhookSecret,
    accountId: PADDLE_SANDBOX_ACCOUNT_ID,
    configured: errors.length === 0,
    errors,
  };
}

export function assertPaddleSandboxConfig(config = getPaddleSandboxConfig()) {
  if (!config.configured) {
    throw new Error(`PADDLE_SANDBOX_NOT_CONFIGURED:${config.errors.join(',')}`);
  }
  return config;
}
