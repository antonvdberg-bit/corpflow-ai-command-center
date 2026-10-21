/**
 * Synthetic BAD buyer-to-order ownership contract.
 *
 * This deliberately stays memory-only until a durable schema is approved.
 * Paddle event metadata, email, transaction IDs, and correlation IDs never
 * create an owner binding. A trusted server-side caller must bind the
 * authenticated session owner before a provider reference can be attached.
 */

const BRAND = 'business_admin_desk';
const TERMINAL_STATUSES = new Set(['refunded', 'revoked']);
const WEBHOOK_TYPES = new Set([
  'transaction.completed',
  'transaction.payment_failed',
  'transaction.updated',
  'adjustment.created',
  'adjustment.updated',
]);

function text(value) {
  return String(value == null ? '' : value).trim();
}

function required(value, code) {
  const result = text(value);
  if (!result) {
    const error = new Error(code);
    error.code = code;
    throw error;
  }
  return result;
}

function ownerOf(input = {}) {
  return Object.freeze({
    auth_user_id: required(input.auth_user_id, 'AUTH_USER_REQUIRED'),
    tenant_id: required(input.tenant_id, 'TENANT_REQUIRED'),
    brand: required(input.brand, 'BRAND_REQUIRED'),
  });
}

function sameOwner(left, right) {
  return left?.auth_user_id === right?.auth_user_id
    && left?.tenant_id === right?.tenant_id
    && left?.brand === right?.brand;
}

function eventTime(event) {
  const value = event?.occurredAt || event?.data?.updatedAt || event?.data?.createdAt;
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function transactionIdOf(event) {
  return text(event?.data?.transactionId || event?.data?.transaction_id || event?.data?.id);
}

function eventIdOf(event) {
  return required(event?.eventId, 'WEBHOOK_EVENT_ID_REQUIRED');
}

function assertBrand(event) {
  const custom = event?.data?.customData || event?.data?.custom_data || {};
  return text(custom.brand) === BRAND;
}

function publicWebhookResult(result) {
  return {
    accepted: Boolean(result.accepted),
    event_id: result.event_id,
    transaction_id: result.transaction_id || null,
    status: result.status || null,
    deduped: Boolean(result.deduped),
    ignored: Boolean(result.ignored),
  };
}

function createMemoryBadBuyerOwnershipStore() {
  const records = new Map();
  const processedEvents = new Set();
  let tail = Promise.resolve();

  function serialise(fn) {
    const run = tail.then(fn, fn);
    tail = run.then(() => undefined, () => undefined);
    return run;
  }

  return {
    kind: 'memory',

    async bindCheckoutIntent(input = {}) {
      return serialise(async () => {
        const intentId = required(input.checkout_intent_id, 'CHECKOUT_INTENT_REQUIRED');
        const owner = ownerOf(input.owner);
        if (owner.brand !== BRAND) throw new Error('BAD_BRAND_REQUIRED');
        if (records.has(intentId)) throw new Error('CHECKOUT_INTENT_ALREADY_BOUND');
        const record = {
          checkout_intent_id: intentId,
          owner,
          order_confirmation_ref: required(input.order_confirmation_ref, 'ORDER_CONFIRMATION_REF_REQUIRED'),
          paddle_transaction_id: required(input.paddle_transaction_id, 'PADDLE_REFERENCE_REQUIRED'),
          status: 'draft',
          issued: false,
          refunded: false,
          revoked: false,
          last_event_time: 0,
          last_event_id: null,
          confirmation: null,
        };
        records.set(intentId, record);
        return { ...record, owner: { ...record.owner } };
      });
    },

    async applyVerifiedWebhook(event = {}) {
      return serialise(async () => {
        const eventId = eventIdOf(event);
        const transactionId = transactionIdOf(event);
        const eventType = text(event.eventType);
        if (!WEBHOOK_TYPES.has(eventType)) {
          return publicWebhookResult({ accepted: true, ignored: true, event_id: eventId });
        }
        if (!transactionId) throw new Error('WEBHOOK_TRANSACTION_REQUIRED');
        if (processedEvents.has(eventId)) {
          return publicWebhookResult({ accepted: true, deduped: true, event_id: eventId, transaction_id: transactionId });
        }
        const record = [...records.values()].find((candidate) => candidate.paddle_transaction_id === transactionId);
        if (!record) {
          processedEvents.add(eventId);
          return publicWebhookResult({
            accepted: true,
            ignored: true,
            event_id: eventId,
            transaction_id: transactionId,
          });
        }
        if (!assertBrand(event)) {
          processedEvents.add(eventId);
          return publicWebhookResult({ accepted: true, ignored: true, event_id: eventId, transaction_id: transactionId });
        }
        const occurredAt = eventTime(event);
        if (occurredAt < record.last_event_time) {
          processedEvents.add(eventId);
          return publicWebhookResult({
            accepted: true,
            ignored: true,
            event_id: eventId,
            transaction_id: transactionId,
            status: record.status,
          });
        }
        const refund = eventType.startsWith('adjustment.')
          || text(event?.data?.status).toLowerCase() === 'refunded'
          || text(event?.data?.action).toLowerCase() === 'refund';
        const status = refund
          ? 'refunded'
          : eventType === 'transaction.completed'
            ? 'paid'
            : eventType === 'transaction.payment_failed'
              ? 'abandoned'
              : record.status;
        record.status = status;
        record.refunded = refund;
        record.revoked = refund;
        record.last_event_time = Math.max(record.last_event_time, occurredAt);
        record.last_event_id = eventId;
        processedEvents.add(eventId);
        return publicWebhookResult({
          accepted: true,
          event_id: eventId,
          transaction_id: transactionId,
          status,
        });
      });
    },

    async issueOrderConfirmation(input = {}) {
      return serialise(async () => {
        const intentId = required(input.checkout_intent_id, 'CHECKOUT_INTENT_REQUIRED');
        const record = records.get(intentId);
        if (!record) return { ok: false, code: 'NOT_FOUND' };
        if (!sameOwner(record.owner, ownerOf(input.owner))) return { ok: false, code: 'FORBIDDEN' };
        if (record.status !== 'paid' || record.refunded || record.revoked) {
          return { ok: false, code: 'ORDER_NOT_ISSUABLE' };
        }
        if (record.issued) return { ok: true, code: 'REPLAYED', confirmation: record.confirmation };
        record.confirmation = input.confirmation || null;
        record.issued = true;
        record.status = 'issued';
        return { ok: true, code: 'ISSUED', confirmation: record.confirmation };
      });
    },

    async retrieveOrderConfirmation(input = {}) {
      return serialise(async () => {
        const record = records.get(text(input.checkout_intent_id));
        if (!record || !record.issued || TERMINAL_STATUSES.has(record.status)) {
          return { ok: false, code: 'NOT_FOUND' };
        }
        if (!input.owner || !sameOwner(record.owner, input.owner)) return { ok: false, code: 'FORBIDDEN' };
        return { ok: true, code: 'RETRIEVED', confirmation: record.confirmation };
      });
    },

    async inspect(checkoutIntentId) {
      return serialise(async () => {
        const record = records.get(text(checkoutIntentId));
        return record ? { ...record, owner: { ...record.owner } } : null;
      });
    },
  };
}

export { createMemoryBadBuyerOwnershipStore, publicWebhookResult };
