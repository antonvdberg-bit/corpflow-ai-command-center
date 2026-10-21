import { sanitizeBadLog, validateBadCustomerIntake } from './bad-intake.js';
import { expectedPaddleMinorAmount, getApprovedBadZarService, mapBadZarCatalog } from './bad-zar-catalog.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryableError(code, message = code) {
  const error = new Error(message);
  error.code = code;
  error.retryable = true;
  return error;
}

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

export function isBadPurchaseEvent(event) {
  const custom = customDataOf(event);
  return custom.brand === 'business_admin_desk' || String(custom.item_code || '').startsWith('BAD-');
}

export function classifyBadEvent(event) {
  const eventType = stringValue(event?.eventType);
  if (!isBadPurchaseEvent(event) || !BAD_EVENT_TYPES.has(eventType)) return 'skip';
  if (eventType === 'transaction.completed') return 'completed';
  if (eventType === 'transaction.payment_failed') return 'failed';
  if (eventType === 'transaction.updated' || eventType === 'adjustment.created' || eventType === 'adjustment.updated') {
    if (!isRefundEvent(event) && eventType === 'transaction.updated') return 'skip';
    return 'refund';
  }
  return 'skip';
}

function eventOccurredAt(event) {
  const value = event?.occurredAt || event?.data?.updatedAt || event?.data?.createdAt;
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
}

function transactionIdOf(event) {
  return stringValue(event?.data?.transactionId || event?.data?.transaction_id || event?.data?.id);
}

export function publicBadBridgeResult(result) {
  const safe = sanitizeBadLog({
    event_id: result.event_id,
    event_type: result.event_type,
    item_code: result.item_code,
    correlation_id: result.correlation_id,
    country: result.country,
    outcome: result.outcome,
    error: result.error,
  });
  if (result?.recovered != null) safe.recovered = Boolean(result.recovered);
  if (result?.onboarding_released != null) safe.onboarding_released = Boolean(result.onboarding_released);
  return safe;
}

function outboxStatusFor(result, kind) {
  switch (result.outcome) {
    case 'completed':
    case 'idempotent_reuse':
      return 'applied';
    case 'payment_failed':
      return 'failed';
    case 'refund_or_adjustment':
    case 'ignored_after_refund':
      return 'refunded';
    case 'pending_adapter_unbound':
      return kind === 'refund' ? 'refunded' : 'pending';
    case 'rejected':
    case 'ignored':
    case 'skipped':
      return 'applied';
    default:
      return 'pending';
  }
}

async function completePurchase(event, adapter, catalog, options = {}) {
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
  const existingOnboarding = await adapter.searchOnboarding({
    paddle_transaction_id: transactionId,
    order_name: existingOrder?.name,
  });
  if (existingOnboarding?.status === 'revoked') {
    return {
      outcome: 'ignored_after_refund',
      event_id: eventId,
      event_type: event.eventType,
      item_code: service.item_code,
      correlation_id: intake.value.correlation_id,
      order_name: existingOrder?.name || null,
      onboarding_name: existingOnboarding.name,
      onboarding_released: false,
      buyer_invoice_created: false,
      payment_entry_created: false,
    };
  }
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
  const confirmation = service.item_code === 'BAD-ADDRESS-CHANGE' && adapter.issueOrderConfirmation
    ? await adapter.issueOrderConfirmation({
      correlation_id: intake.value.correlation_id,
      item_code: service.item_code,
      zar_amount: service.zar_amount,
      customer_name: customer.name,
      order_name: order.name,
      onboarding_name: onboarding.name,
      paddle_transaction_id: transactionId,
      repoRoot: options.repoRoot,
      accepted_at: event?.occurredAt,
    })
    : null;
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
    confirmation_name: confirmation?.name || null,
    confirmation_document_role: confirmation?.document_role || null,
    confirmation_html: confirmation?.html || null,
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
  const adapter = options.adapter;
  if (!adapter) {
    return {
      outcome: 'pending_adapter_unbound',
      error: 'ISOLATED_ERPNEXT_ADAPTER_NOT_BOUND',
      event_id: stringValue(event?.eventId),
      event_type: eventType,
    };
  }

  if (eventType === 'transaction.completed') {
    return completePurchase(event, adapter, catalog, options);
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

async function waitForSettledJob(outbox, eventId, timeoutMs = 2000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const job = await outbox.getJob(eventId);
    if (job?.status === 'applied' || job?.status === 'pending') return job;
    await delay(15);
  }
  return outbox.getJob(eventId);
}

function ignoredAfterRefund(event, txnState, recovered) {
  return {
    outcome: 'ignored_after_refund',
    event_id: stringValue(event?.eventId),
    event_type: event.eventType,
    item_code: txnState?.item_code || null,
    correlation_id: txnState?.correlation_id || null,
    order_name: txnState?.order_name || null,
    onboarding_released: false,
    recovered: Boolean(recovered),
  };
}

export async function processBadPurchaseWithRecovery(event, options = {}) {
  const kind = classifyBadEvent(event);
  if (kind === 'skip') {
    return { outcome: 'skipped', event_id: stringValue(event?.eventId), recovered: false };
  }

  const outbox = options.outbox;
  const adapter = options.adapter;
  const eventId = stringValue(event?.eventId);
  const transactionId = transactionIdOf(event);
  const occurredAt = eventOccurredAt(event);
  const custom = customDataOf(event);
  const existingJob = outbox ? await outbox.getJob(eventId) : null;

  if (outbox && transactionId && kind === 'refund') {
    await outbox.stampRefund(transactionId, {
      event_id: eventId,
      event_type: event.eventType,
      last_event_time: occurredAt,
      item_code: stringValue(custom.item_code) || null,
      correlation_id: stringValue(custom.correlation_id) || null,
    });
  }

  const txnState = outbox && transactionId ? await outbox.getByTransaction(transactionId) : null;
  if (txnState?.status === 'refunded' && kind === 'completed') {
    const ignored = ignoredAfterRefund(event, txnState, existingJob?.status === 'pending' || options.receiptDeduped);
    if (outbox) await outbox.completeJob(eventId, { result: ignored });
    return ignored;
  }

  if (existingJob?.status === 'applied' && kind === 'completed' && txnState?.status === 'applied') {
    return { ...existingJob.result, outcome: 'idempotent_reuse', recovered: false };
  }

  let jobClaim = null;
  let txnLock = null;
  if (outbox) {
    jobClaim = await outbox.claimJob(eventId);
    if (!jobClaim.owned) {
      if (jobClaim.status === 'applied') {
        return { ...(jobClaim.job?.result || {}), outcome: jobClaim.job?.result?.outcome || 'idempotent_reuse', recovered: false };
      }
      const settled = await waitForSettledJob(outbox, eventId);
      if (settled?.status === 'applied') {
        return { ...(settled.result || {}), outcome: settled.result?.outcome || 'idempotent_reuse', recovered: false };
      }
      throw retryableError('BAD_PURCHASE_IN_FLIGHT');
    }
    txnLock = await outbox.claimTransactionLock(transactionId);
    if (!txnLock.owned) {
      await outbox.failJob(eventId, retryableError('BAD_PURCHASE_TXN_LOCKED'));
      throw retryableError('BAD_PURCHASE_TXN_LOCKED');
    }
  }

  try {
    const latestTxn = outbox && transactionId ? await outbox.getByTransaction(transactionId) : null;
    if (latestTxn?.status === 'refunded' && kind === 'completed') {
      const ignored = ignoredAfterRefund(event, latestTxn, options.receiptDeduped);
      if (outbox) await outbox.completeJob(eventId, { result: ignored });
      return ignored;
    }

    let result;
    if (!adapter && kind === 'refund') {
      result = {
        outcome: 'refund_or_adjustment',
        event_id: eventId,
        event_type: event.eventType,
        item_code: stringValue(custom.item_code) || null,
        correlation_id: stringValue(custom.correlation_id) || null,
        onboarding_released: false,
        pending_effect: true,
        error: 'ISOLATED_ERPNEXT_ADAPTER_NOT_BOUND',
      };
    } else {
      result = await processBadPaddleEvent(event, options);
    }

    if (result.outcome === 'pending_adapter_unbound' && kind === 'refund') {
      result = {
        ...result,
        outcome: 'refund_or_adjustment',
        onboarding_released: false,
        pending_effect: true,
      };
    }

    const afterTxn = outbox && transactionId ? await outbox.getByTransaction(transactionId) : null;
    if (afterTxn?.status === 'refunded' && kind === 'completed' && adapter) {
      await adapter.revokeOnboarding({
        paddle_transaction_id: transactionId,
        order_name: result.order_name,
        reason: 'refund_or_adjustment',
      });
      result = ignoredAfterRefund(event, { ...afterTxn, order_name: result.order_name }, true);
    }

    if (outbox && transactionId) {
      const status = outboxStatusFor(result, kind);
      await outbox.saveTransaction({
        transaction_id: transactionId,
        status,
        effect_status: result.pending_effect ? 'pending' : 'applied',
        last_event_id: eventId,
        last_event_type: event.eventType,
        last_event_time: occurredAt,
        item_code: result.item_code || null,
        correlation_id: result.correlation_id || null,
        order_name: result.order_name || null,
        onboarding_name: result.onboarding_name || null,
      });
      if (result.pending_effect || result.outcome === 'pending_adapter_unbound') {
        await outbox.failJob(eventId, result.error || 'pending_adapter_unbound');
        await outbox.saveJob(eventId, { status: 'pending', result });
      } else {
        await outbox.completeJob(eventId, { result });
      }
    }
    return { ...result, recovered: Boolean(options.receiptDeduped || existingJob?.status === 'pending') };
  } catch (error) {
    if (outbox && transactionId) {
      if (kind !== 'refund') {
        await outbox.saveTransaction({
          transaction_id: transactionId,
          status: 'pending',
          last_event_id: eventId,
          last_event_type: event.eventType,
          last_event_time: occurredAt,
          last_error: error.code || error.message,
        });
      }
      await outbox.failJob(eventId, error);
    }
    throw error;
  } finally {
    if (outbox && txnLock?.owned) {
      await outbox.releaseTransactionLock(transactionId, txnLock.token);
    }
  }
}
