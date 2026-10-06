import { PrismaClient } from '@prisma/client';

import { getPaddleSandboxConfig } from './config.js';
import { getPaddleSandboxState } from './state.js';

const prisma = new PrismaClient();

export default async function paddleSandboxStatusHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  const config = getPaddleSandboxConfig();
  const state = await getPaddleSandboxState(prisma, config.accountId);
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
  });
}
