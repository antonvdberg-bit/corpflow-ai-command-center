/**
 * Synthetic BAD buyer-to-order ownership contract.
 *
 * Memory-only until a durable schema is approved. This module is not an HTTP
 * handler and must never be mounted on a public route that reads a browser
 * body. Callers may pass `owner` only after a verified server-side session
 * has already resolved `auth_user_id`, `tenant_id`, and `brand`. Email,
 * request bodies, correlation IDs, and Paddle metadata are not identity.
 *
 * A verified webhook may update payment state for an already-bound provider
 * reference. It cannot create or replace an owner. Refunds and revocations
 * are permanent tombstones: a later, earlier, repeated, or concurrent
 * completion event cannot restore paid status, issuance, retrieval, or
 * fulfilment entitlement.
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
const UNTRUSTED_INPUT_KEYS = [
  'body',
  'cookies',
  'correlationId',
  'correlation_id',
  'customData',
  'custom_data',
  'email',
  'headers',
  'metadata',
  'params',
  'query',
  'req',
  'request',
];
const UNTRUSTED_OWNER_KEYS = [
  'body',
  'correlationId',
  'correlation_id',
  'customData',
  'custom_data',
  'email',
  'metadata',
  'request',
];

function text(value) {
  return String(value == null ? '' : value).trim();
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function required(value, code) {
  const result = text(value);
  if (!result) throw fail(code);
  return result;
}

function assertTrustedCaller(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail('AUTH_USER_REQUIRED');
  for (const key of UNTRUSTED_INPUT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) throw fail('UNTRUSTED_IDENTITY_SOURCE');
  }
}

function ownerOf(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail('AUTH_USER_REQUIRED');
  for (const key of UNTRUSTED_OWNER_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) throw fail('UNTRUSTED_OWNER_SOURCE');
  }
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

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function meaningfulConfirmation(confirmation) {
  if (!confirmation || typeof confirmation !== 'object' || Array.isArray(confirmation)) return false;
  const reference = nonEmptyString(
    confirmation.name
    || confirmation.ref
    || confirmation.confirmation_ref
    || confirmation.order_confirmation_ref,
  );
  const content = nonEmptyString(confirmation.html || confirmation.body || confirmation.content);
  return Boolean(reference && content);
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

function eventStatus(event) {
  return text(event?.data?.status).toLowerCase();
}

function eventAction(event) {
  return text(event?.data?.action).toLowerCase();
}

function isReversalEvent(event, eventType) {
  const status = eventStatus(event);
  const action = eventAction(event);
  return eventType.startsWith('adjustment.')
    || status === 'refunded'
    || status === 'revoked'
    || action === 'refund'
    || action === 'revoke'
    || action === 'revocation'
    || action === 'chargeback'
    || action === 'chargeback_warning';
}

function reversalKind(event) {
  const status = eventStatus(event);
  const action = eventAction(event);
  if (
    status === 'revoked'
    || action === 'revoke'
    || action === 'revocation'
    || action === 'chargeback'
    || action === 'chargeback_warning'
  ) {
    return 'revoked';
  }
  return 'refunded';
}

function assertBrand(event) {
  const custom = event?.data?.customData || event?.data?.custom_data || {};
  const brand = text(custom.brand);
  return !brand || brand === BRAND;
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

function reversalEntry(event, eventType, eventId) {
  return Object.freeze({
    event_id: eventId,
    event_type: eventType,
    occurred_at: text(event?.occurredAt) || null,
    action: eventAction(event) || reversalKind(event),
  });
}

function historyIsRevocation(history) {
  return history.some((entry) => (
    entry.action === 'revoke'
    || entry.action === 'revocation'
    || entry.action === 'chargeback'
    || entry.action === 'chargeback_warning'
  ));
}

function createMemoryBadBuyerOwnershipStore() {
  const records = new Map();
  const processedEvents = new Set();
  const unboundReversals = new Map();
  let tail = Promise.resolve();

  function serialise(fn) {
    const run = tail.then(fn, fn);
    tail = run.then(() => undefined, () => undefined);
    return run;
  }

  function rememberReversal(record, event, eventType, eventId) {
    if (!Array.isArray(record.reversal_history)) record.reversal_history = [];
    if (record.reversal_history.some((entry) => entry.event_id === eventId)) return;
    record.reversal_history.push(reversalEntry(event, eventType, eventId));
  }

  function rememberUnboundReversal(transactionId, event, eventType, eventId, occurredAt) {
    const current = unboundReversals.get(transactionId) || { history: [], last_event_time: 0, last_event_id: null };
    if (!current.history.some((entry) => entry.event_id === eventId)) {
      current.history.push(reversalEntry(event, eventType, eventId));
    }
    if (occurredAt >= current.last_event_time) {
      current.last_event_time = occurredAt;
      current.last_event_id = eventId;
    }
    unboundReversals.set(transactionId, current);
    return current;
  }

  function applyUnboundReversal(record, transactionId) {
    const prior = unboundReversals.get(transactionId);
    if (!prior || prior.history.length === 0) return;
    record.reversal_history = prior.history.map((entry) => ({ ...entry }));
    record.status = historyIsRevocation(prior.history) ? 'revoked' : 'refunded';
    record.refunded = true;
    record.revoked = true;
    record.fulfilment_entitled = false;
    record.issued = false;
    record.last_event_time = Math.max(record.last_event_time, prior.last_event_time);
    record.last_event_id = prior.last_event_id || record.last_event_id;
  }

  function currentStatusFor(transactionId) {
    const record = [...records.values()].find((candidate) => candidate.paddle_transaction_id === transactionId);
    if (record) return record.status;
    const prior = unboundReversals.get(transactionId);
    if (!prior || prior.history.length === 0) return null;
    return historyIsRevocation(prior.history) ? 'revoked' : 'refunded';
  }

  function sealTerminal(record, event, eventType, eventId, occurredAt) {
    rememberReversal(record, event, eventType, eventId);
    if (!TERMINAL_STATUSES.has(record.status)) record.status = reversalKind(event);
    record.refunded = true;
    record.revoked = true;
    record.fulfilment_entitled = false;
    if (occurredAt >= record.last_event_time) {
      record.last_event_time = occurredAt;
      record.last_event_id = eventId;
    }
  }

  function webhookResult(record, eventId, transactionId, extra = {}) {
    return publicWebhookResult({
      accepted: true,
      event_id: eventId,
      transaction_id: transactionId,
      status: record?.status || null,
      ...extra,
    });
  }

  return {
    kind: 'memory',

    async bindCheckoutIntent(input = {}) {
      return serialise(async () => {
        assertTrustedCaller(input);
        const intentId = required(input.checkout_intent_id, 'CHECKOUT_INTENT_REQUIRED');
        const owner = ownerOf(input.owner);
        const transactionId = required(input.paddle_transaction_id, 'PADDLE_REFERENCE_REQUIRED');
        if (owner.brand !== BRAND) throw fail('BAD_BRAND_REQUIRED');
        if (records.has(intentId)) throw fail('CHECKOUT_INTENT_ALREADY_BOUND');
        const duplicate = [...records.values()].find((candidate) => candidate.paddle_transaction_id === transactionId);
        if (duplicate) throw fail('PADDLE_TRANSACTION_ALREADY_BOUND');
        const record = {
          checkout_intent_id: intentId,
          owner,
          order_confirmation_ref: required(input.order_confirmation_ref, 'ORDER_CONFIRMATION_REF_REQUIRED'),
          paddle_transaction_id: transactionId,
          status: 'draft',
          issued: false,
          refunded: false,
          revoked: false,
          fulfilment_entitled: false,
          last_event_time: 0,
          last_event_id: null,
          confirmation: null,
          reversal_history: [],
        };
        applyUnboundReversal(record, transactionId);
        records.set(intentId, record);
        return {
          ...record,
          owner: { ...record.owner },
          reversal_history: record.reversal_history.map((entry) => ({ ...entry })),
        };
      });
    },

    async applyVerifiedWebhook(event = {}) {
      return serialise(async () => {
        const eventId = eventIdOf(event);
        const eventType = text(event.eventType);
        if (!WEBHOOK_TYPES.has(eventType)) {
          return publicWebhookResult({ accepted: true, ignored: true, event_id: eventId });
        }
        const transactionId = transactionIdOf(event);
        if (!transactionId) throw fail('WEBHOOK_TRANSACTION_REQUIRED');
        if (processedEvents.has(eventId)) {
          return publicWebhookResult({
            accepted: true,
            deduped: true,
            event_id: eventId,
            transaction_id: transactionId,
            status: currentStatusFor(transactionId),
          });
        }
        const matches = [...records.values()].filter((candidate) => candidate.paddle_transaction_id === transactionId);
        const occurredAt = eventTime(event);
        const reversal = isReversalEvent(event, eventType);
        if (matches.length === 0) {
          if (reversal) {
            const prior = rememberUnboundReversal(transactionId, event, eventType, eventId, occurredAt);
            processedEvents.add(eventId);
            return publicWebhookResult({
              accepted: true,
              event_id: eventId,
              transaction_id: transactionId,
              status: historyIsRevocation(prior.history) ? 'revoked' : 'refunded',
            });
          }
          processedEvents.add(eventId);
          return publicWebhookResult({
            accepted: true,
            ignored: true,
            event_id: eventId,
            transaction_id: transactionId,
            status: currentStatusFor(transactionId),
          });
        }
        // Duplicate provider references are rejected at bind. This branch grants nothing.
        if (matches.length !== 1) {
          processedEvents.add(eventId);
          return publicWebhookResult({
            accepted: true,
            ignored: true,
            event_id: eventId,
            transaction_id: transactionId,
          });
        }
        const record = matches[0];
        if (!reversal && !assertBrand(event)) {
          processedEvents.add(eventId);
          return webhookResult(record, eventId, transactionId, { ignored: true });
        }

        if (reversal) {
          sealTerminal(record, event, eventType, eventId, occurredAt);
          processedEvents.add(eventId);
          return webhookResult(record, eventId, transactionId);
        }
        if (record.refunded || record.revoked || TERMINAL_STATUSES.has(record.status) || record.reversal_history.length > 0) {
          if (!TERMINAL_STATUSES.has(record.status)) {
            record.status = historyIsRevocation(record.reversal_history) ? 'revoked' : 'refunded';
          }
          record.refunded = true;
          record.revoked = true;
          record.fulfilment_entitled = false;
          processedEvents.add(eventId);
          return webhookResult(record, eventId, transactionId, { ignored: true });
        }
        if (occurredAt < record.last_event_time) {
          processedEvents.add(eventId);
          return webhookResult(record, eventId, transactionId, { ignored: true });
        }

        if (eventType === 'transaction.completed') record.status = 'paid';
        else if (eventType === 'transaction.payment_failed') record.status = 'abandoned';
        record.last_event_time = Math.max(record.last_event_time, occurredAt);
        record.last_event_id = eventId;
        processedEvents.add(eventId);
        return webhookResult(record, eventId, transactionId);
      });
    },

    async issueOrderConfirmation(input = {}) {
      return serialise(async () => {
        assertTrustedCaller(input);
        const intentId = required(input.checkout_intent_id, 'CHECKOUT_INTENT_REQUIRED');
        const record = records.get(intentId);
        if (!record) return { ok: false, code: 'NOT_FOUND' };
        if (!sameOwner(record.owner, ownerOf(input.owner))) return { ok: false, code: 'FORBIDDEN' };
        if (
          record.refunded
          || record.revoked
          || TERMINAL_STATUSES.has(record.status)
          || record.reversal_history.length > 0
        ) {
          return { ok: false, code: 'ORDER_NOT_ISSUABLE' };
        }
        if (record.issued) return { ok: true, code: 'REPLAYED', confirmation: record.confirmation };
        if (record.status !== 'paid') return { ok: false, code: 'ORDER_NOT_ISSUABLE' };
        if (!meaningfulConfirmation(input.confirmation)) {
          return { ok: false, code: 'CONFIRMATION_INVALID' };
        }
        record.confirmation = Object.freeze({ ...input.confirmation });
        record.issued = true;
        record.status = 'issued';
        record.fulfilment_entitled = true;
        return { ok: true, code: 'ISSUED', confirmation: record.confirmation };
      });
    },

    async retrieveOrderConfirmation(input = {}) {
      return serialise(async () => {
        assertTrustedCaller(input);
        const record = records.get(text(input.checkout_intent_id));
        if (
          !record
          || !record.issued
          || !record.fulfilment_entitled
          || record.refunded
          || record.revoked
          || TERMINAL_STATUSES.has(record.status)
          || record.reversal_history.length > 0
        ) {
          return { ok: false, code: 'NOT_FOUND' };
        }
        let owner;
        try {
          owner = ownerOf(input.owner);
        } catch (error) {
          if (error.code === 'UNTRUSTED_OWNER_SOURCE') throw error;
          return { ok: false, code: 'FORBIDDEN' };
        }
        if (!sameOwner(record.owner, owner)) return { ok: false, code: 'FORBIDDEN' };
        return { ok: true, code: 'RETRIEVED', confirmation: record.confirmation };
      });
    },

    async inspect(checkoutIntentId) {
      return serialise(async () => {
        const record = records.get(text(checkoutIntentId));
        if (!record) return null;
        return {
          ...record,
          owner: { ...record.owner },
          reversal_history: record.reversal_history.map((entry) => ({ ...entry })),
          confirmation: record.confirmation ? { ...record.confirmation } : null,
        };
      });
    },
  };
}

export { createMemoryBadBuyerOwnershipStore, publicWebhookResult };
