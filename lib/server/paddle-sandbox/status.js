import { PrismaClient } from '@prisma/client';

import { mapBadZarCatalog } from './bad-zar-catalog.js';
import { getPaddleSandboxConfig } from './config.js';
import { getPaddleSandboxState } from './state.js';

const prisma = new PrismaClient();

export default async function paddleSandboxStatusHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  const config = getPaddleSandboxConfig();
  const state = await getPaddleSandboxState(prisma, config.accountId);
  const badCatalog = mapBadZarCatalog();
  return res.status(200).json({
    ok: true,
    environment: 'sandbox',
    configured: config.configured,
    configuration_errors: config.errors,
    account_id: config.accountId,
    payment_confirmed: state.paymentConfirmed,
    subscription_status: state.subscription?.status || null,
    scheduled_change: state.subscription?.scheduled_change || null,
    entitlement_eligible: state.entitlementEligible,
    bad_zar_catalog: {
      mapped_count: badCatalog.mapped_count,
      required_count: badCatalog.required_count,
      checkout_ready: badCatalog.checkout_ready,
      missing_env_keys: badCatalog.missing_env_keys,
      invalid_env_keys: badCatalog.invalid_env_keys,
    },
  });
}
