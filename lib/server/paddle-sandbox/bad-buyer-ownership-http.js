/**
 * Authenticated BAD buyer-ownership HTTP boundary.
 *
 * Owner identity comes only from a verified corpflow_session. The feature is
 * inert until CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE=1 and the prepared
 * migration has been applied under a separate approval. Webhooks never use
 * this handler to create ownership.
 */

import { randomBytes } from 'node:crypto';

import { getSessionFromRequest } from '../session.js';
import {
  BRAND,
  resolveBadBuyerOwnerFromSession,
} from './bad-buyer-ownership.js';
import {
  isBadBuyerOwnershipDurableEnabled,
  resolveDurableBadBuyerOwnershipStore,
} from './bad-buyer-ownership-durable.js';

function json(res, status, body) {
  return res.status(status).json(body);
}

function newRef(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
}

function storeOrDisabled(deps, env) {
  if (!isBadBuyerOwnershipDurableEnabled(env)) return null;
  if (deps.ownership) return deps.ownership;
  if (!deps.prisma) return null;
  return resolveDurableBadBuyerOwnershipStore(deps.prisma, env);
}

function ownerFromRequest(req, deps) {
  // Production wiring must not accept a caller-supplied session. Tests opt in
  // explicitly; factory routes pass only the Prisma client.
  const session = deps.allowInjectedSession === true && deps.session
    ? deps.session
    : getSessionFromRequest(req);
  return resolveBadBuyerOwnerFromSession(session);
}

export async function handleBadBuyerCheckoutIntent(req, res, deps = {}) {
  const env = deps.env || process.env;
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });
  const store = storeOrDisabled(deps, env);
  if (!store) return json(res, 404, { ok: false, error: 'feature_disabled' });
  try {
    const owner = ownerFromRequest(req, deps);
    const bound = await store.bindCheckoutIntent({
      owner,
      checkout_intent_id: newRef('bad-intent'),
      order_confirmation_ref: newRef('OC-BAD'),
    });
    return json(res, 200, {
      ok: true,
      brand: BRAND,
      checkout_intent_id: bound.checkout_intent_id,
      order_confirmation_ref: bound.order_confirmation_ref,
      status: bound.status,
    });
  } catch (error) {
    const code = error?.code || 'AUTH_USER_REQUIRED';
    const status = code === 'AUTH_USER_REQUIRED' || code === 'UNTRUSTED_IDENTITY_SOURCE' || code === 'UNTRUSTED_OWNER_SOURCE'
      ? 401
      : 400;
    return json(res, status, { ok: false, error: code });
  }
}

export async function handleBadBuyerOrderConfirmation(req, res, deps = {}) {
  const env = deps.env || process.env;
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method_not_allowed' });
  const store = storeOrDisabled(deps, env);
  if (!store) return json(res, 404, { ok: false, error: 'feature_disabled' });
  try {
    const owner = ownerFromRequest(req, deps);
    const checkoutIntentId = String(req.query?.checkout_intent_id || req.query?.checkoutIntentId || '').trim();
    const result = await store.retrieveOrderConfirmation({
      owner,
      checkout_intent_id: checkoutIntentId,
    });
    if (!result.ok) {
      const status = result.code === 'FORBIDDEN' ? 403 : 404;
      return json(res, status, { ok: false, error: result.code });
    }
    return json(res, 200, {
      ok: true,
      code: result.code,
      confirmation_ref: result.confirmation_ref,
      erpnext_order_ref: result.erpnext_order_ref || null,
    });
  } catch (error) {
    const code = error?.code || 'AUTH_USER_REQUIRED';
    const status = code === 'AUTH_USER_REQUIRED' || code === 'UNTRUSTED_OWNER_SOURCE' ? 401 : 400;
    return json(res, status, { ok: false, error: code });
  }
}

export { newRef };
