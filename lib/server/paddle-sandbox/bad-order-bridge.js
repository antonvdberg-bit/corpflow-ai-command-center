import { sanitizeBadLog, validateBadCustomerIntake } from './bad-intake.js';
import { expectedPaddleMinorAmount, getApprovedBadZarService, mapBadZarCatalog } from './bad-zar-catalog.js';
import { createBadErpnextAdapter } from './bad-erpnext-adapter.js';

const BAD_EVENT_TYPES = new Set([
  'transaction.completed',
  'transaction.payment_failed',
  'transaction.updated',
  'adjustment.created',
  'adjustment.updated',
]);

function stringValue(value) {
  return value == null ? '' : String(value).trim();
}

function customDataOf(event) {
  return event?.data?.customData || event?.data?.custom_data || {};
}

function priceIdOf(event) {
  const items = event?.data?.items;
  if (!Array.isArray(items) || !items.length) return '';
  return stringValue(items[0]?.price?.id || items[0]?.priceId);
}

function totalsOf(event) {
  const totals = event?.data?.details?.totals || {};
  const unit = event?.data?.items?.[0]?.price?.unitPrice || event?.data?.items?.[0]?.price?.unit_price || {};
  return {
    currency: stringValue(totals.currencyCode || totals.currency_code || unit.currencyCode || unit.currency_code).toUpperCase(),
    amount_minor: Number(totals.grandTotal || totals.grand_total || unit.amount || 0),
  };
}

function isRefundEvent(event) {
  const type = stringValue(event?.eventType);
  const action = stringValue(event?.data?.action || event?.data?.type).toLowerCase();
  const status = stringValue(event?.data?.status).toLowerCase();
  if (type === 'adjustment.created' || type === 'adjustment.updated') {
    return action.includes('refund') || type.includes('adjustment');
  }
  return status === 'refunded' || status === 'canceled' || action === 'refund';
}

function intakeFromEvent(event) {
  const custom = customDataOf(event);
  return validateBadCustomerIntake({
    legal_business_name: custom.legal_business_name,
    contact_name: custom.contact_name,
    business_email: event?.data?.customer?.email || custom.business_email,
    country: custom.country,
    item_code: custom.item_code,
    correlation_id: custom.correlation_id,
  });
}

function isBadPurchaseEvent(event) {
  const custom = customDataOf(event);
  return custom.brand === 'business_admin_desk' || String(custom.item_code || '').startsWith('BAD-');
}

export function publicBadBridgeResult(result) {
  return sanitizeBadLog({
    event_id: result.event_id,
    event_type: result.event_type,
    item_code: result.item_code,
    correlation_id: result.correlation_id,
    country: result.country,
    outcome: result.outcome,
    error: result.error,
  });
}

async function completePurchase(event, adapter, catalog) {
  const eventId = stringValue(event?.eventId);
  const transactionId = stringValue(event?.data?.id);
  const intake = intakeFromEvent(event);
  if (!intake.ok) {
    return { outcome: 'rejected', error: 'missing_customer_or_company_information', event_id: eventId };
  }
  const service = getApprovedBadZarService(intake.value.item_code);
  if (!service) {
    return { outcome: 'rejected', error: 'unknown_service', event_id: eventId, item_code: intake.value.item_code };
  }
  const mapped = catalog.services.find((row) => row.item_code === service.item_code);
  const priceId = priceIdOf(event);
  if (!mapped?.checkout_ready || mapped.paddle_price_id !== priceId) {
    return {
      outcome: 'rejected',
      error: 'unknown_or_unmapped_price',
      event_id: eventId,
      item_code: service.item_code,
      correlation_id: intake.value.correlation_id,
    };
  }
  const totals = totalsOf(event);
  if (totals.currency !== 'ZAR') {
    return { outcome: 'rejected', error: 'wrong_currency', event_id: eventId, item_code: service.item_code };
  }
  if (totals.amount_minor !== expectedPaddleMinorAmount(service.zar_amount)) {
    return { outcome: 'rejected', error: 'amount_mismatch', event_id: eventId, item_code: service.item_code };
  }

  const existingOrder = await adapter.searchOrder({
    paddle_transaction_id: transactionId,
    correlation_id: intake.value.correlation_id,
  });
  const customer = await adapter.upsertCustomer(intake.value);
  const order =
    existingOrder ||
    (await adapter.createInternalSalesOrder({
      customer_name: customer.name,
      item_code: service.item_code,
      item_name: service.item_name,
      zar_amount: service.zar_amount,
      paddle_transaction_id: transactionId,
      correlation_id: intake.value.correlation_id,
    }));
  if (order.buyer_invoice_created || order.payment_entry_created) {
    return { outcome: 'rejected', error: 'duplicate_buyer_financial_demand', event_id: eventId };
  }
  const onboarding = await adapter.releaseOnboarding({
    payment_status: 'completed',
    order_name: order.name,
    customer_name: customer.name,
    item_code: service.item_code,
    paddle_transaction_id: transactionId,
    correlation_id: intake.value.correlation_id,
  });
  return {
    outcome: existingOrder ? 'idempotent_reuse' : 'completed',
    event_id: eventId,
    event_type: event.eventType,
    item_code: service.item_code,
    correlation_id: intake.value.correlation_id,
    country: intake.value.country,
    customer_name: customer.name,
    order_name: order.name,
    onboarding_name: onboarding.name,
    buyer_invoice_created: false,
    payment_entry_created: false,
  };
}

async function handleFailureOrRefund(event, adapter, reason) {
  const eventId = stringValue(event?.eventId);
  const transactionId = stringValue(event?.data?.transactionId || event?.data?.transaction_id || event?.data?.id);
  const custom = customDataOf(event);
  const existingOrder = await adapter.searchOrder({
    paddle_transaction_id: transactionId,
    correlation_id: stringValue(custom.correlation_id),
  });
  if (existingOrder) {
    await adapter.revokeOnboarding({
      paddle_transaction_id: transactionId,
      order_name: existingOrder.name,
      reason,
    });
  }
  return {
    outcome: reason,
    event_id: eventId,
    event_type: event.eventType,
    item_code: stringValue(custom.item_code) || null,
    correlation_id: stringValue(custom.correlation_id) || null,
    order_name: existingOrder?.name || null,
    onboarding_released: false,
    buyer_invoice_created: false,
    payment_entry_created: false,
  };
}

export async function processBadPaddleEvent(event, options = {}) {
  if (!isBadPurchaseEvent(event)) {
    return { outcome: 'skipped', event_id: stringValue(event?.eventId) };
  }
  const eventType = stringValue(event?.eventType);
  if (!BAD_EVENT_TYPES.has(eventType)) {
    return { outcome: 'ignored', event_id: stringValue(event?.eventId), event_type: eventType };
  }

  const catalog = options.catalog || mapBadZarCatalog(options.env);
  const adapter = options.adapter || createBadErpnextAdapter({ env: options.env });

  if (eventType === 'transaction.completed') {
    return completePurchase(event, adapter, catalog);
  }
  if (eventType === 'transaction.payment_failed') {
    return handleFailureOrRefund(event, adapter, 'payment_failed');
  }
  if (eventType === 'transaction.updated' || eventType === 'adjustment.created' || eventType === 'adjustment.updated') {
    if (!isRefundEvent(event) && eventType === 'transaction.updated') {
      return { outcome: 'ignored', event_id: stringValue(event?.eventId), event_type: eventType };
    }
    return handleFailureOrRefund(event, adapter, 'refund_or_adjustment');
  }
  return { outcome: 'ignored', event_id: stringValue(event?.eventId), event_type: eventType };
}

export async function releaseOnboardingWithoutPayment(adapter, input) {
  return adapter.releaseOnboarding({ ...input, payment_status: input.payment_status || 'unpaid' });
}
