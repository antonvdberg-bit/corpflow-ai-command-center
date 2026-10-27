/**
 * Authenticated BAD checkout: session bind → server-created Paddle transaction
 * → trusted provider association.
 *
 * Paddle customer email and custom data are commercial checkout fields only.
 * They never establish AuthUser, tenant, or brand ownership. The provider
 * transaction id comes from the Paddle API response on this server, not from
 * a browser overlay or an unverified webhook body.
 */

import { Environment, LogLevel, Paddle } from '@paddle/paddle-node-sdk';

import { fail } from './bad-buyer-ownership.js';
import { checkoutCustomData, validateBadCustomerIntake } from './bad-intake.js';
import { mapBadZarCatalog } from './bad-zar-catalog.js';
import { assertPaddleSandboxConfig } from './config.js';

function text(value) {
  return String(value == null ? '' : value).trim();
}

export async function createPaddleSandboxTransaction(input, deps = {}) {
  if (typeof deps.createPaddleTransaction === 'function') {
    return deps.createPaddleTransaction(input);
  }
  const config = assertPaddleSandboxConfig();
  const paddle = new Paddle(config.apiKey, {
    environment: Environment.sandbox,
    logLevel: LogLevel.error,
  });
  const created = await paddle.transactions.create({
    items: [{ priceId: input.priceId, quantity: 1 }],
    customData: input.customData,
    ...(input.customerEmail ? { customer: { email: input.customerEmail } } : {}),
  });
  const paddleTransactionId = text(created?.id);
  if (!paddleTransactionId) throw fail('PADDLE_TRANSACTION_CREATE_FAILED');
  return { paddle_transaction_id: paddleTransactionId };
}

export async function createAuthenticatedBadCheckout(input = {}, deps = {}) {
  const owner = input.owner;
  const store = deps.ownership;
  if (!store) throw fail('FEATURE_DISABLED');
  const intake = validateBadCustomerIntake(input.intake || {});
  if (!intake.ok) {
    const error = fail('INVALID_INTAKE');
    error.details = intake.errors;
    throw error;
  }
  const catalog = mapBadZarCatalog(deps.env || {});
  const mapped = catalog.services.find((row) => row.item_code === intake.value.item_code);
  if (!mapped?.checkout_ready || !mapped.paddle_price_id) {
    throw fail('PADDLE_PRICE_UNCONFIGURED');
  }
  const checkoutIntentId = text(input.checkout_intent_id);
  const orderConfirmationRef = text(input.order_confirmation_ref);
  if (!checkoutIntentId || !orderConfirmationRef) throw fail('CHECKOUT_INTENT_REQUIRED');

  const bound = await store.bindCheckoutIntent({
    owner,
    checkout_intent_id: checkoutIntentId,
    order_confirmation_ref: orderConfirmationRef,
  });

  const payload = checkoutCustomData(intake.value);
  const customData = {
    ...payload.customData,
    checkout_intent_id: bound.checkout_intent_id,
  };

  let created;
  try {
    created = await createPaddleSandboxTransaction({
      priceId: mapped.paddle_price_id,
      customData,
      customerEmail: intake.value.business_email,
    }, deps);
  } catch (error) {
    const wrapped = fail(error?.code || 'PADDLE_TRANSACTION_CREATE_FAILED');
    wrapped.cause_code = error?.code || null;
    throw wrapped;
  }

  const paddleTransactionId = text(created?.paddle_transaction_id || created?.id);
  if (!paddleTransactionId) throw fail('PADDLE_TRANSACTION_CREATE_FAILED');

  const associated = await store.associateProviderTransaction({
    checkout_intent_id: bound.checkout_intent_id,
    paddle_transaction_id: paddleTransactionId,
  });

  return {
    checkout_intent_id: associated.checkout_intent_id,
    order_confirmation_ref: associated.order_confirmation_ref,
    paddle_transaction_id: associated.paddle_transaction_id,
    status: associated.status,
    item_code: intake.value.item_code,
  };
}
