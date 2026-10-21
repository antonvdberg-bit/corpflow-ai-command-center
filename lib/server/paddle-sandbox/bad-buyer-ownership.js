/**
 * BAD buyer-to-order ownership contract.
 *
 * Memory and durable adapters share this engine. The module is not an HTTP
 * handler and must never be mounted on a public route that reads a browser
 * body. Callers may pass `owner` only after a verified server-side session
 * has already resolved `auth_user_id`, `tenant_id`, and `brand`. Email,
 * request bodies, correlation IDs, and Paddle metadata are not identity.
 *
 * A verified webhook may update payment state for an already-bound provider
 * reference. It cannot create or replace an owner. Refunds, cancellations,
 * and revocations are permanent tombstones: a later, earlier, repeated, or
 * concurrent completion event cannot restore paid status, issuance,
 * retrieval, or fulfilment entitlement.
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

function confirmationRefOf(confirmation) {
  return nonEmptyString(
    confirmation?.name
    || confirmation?.ref
    || confirmation?.confirmation_ref
    || confirmation?.order_confirmation_ref,
  );
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
    || status === 'canceled'
    || status === 'cancelled'
    || action === 'refund'
    || action === 'revoke'
    || action === 'revocation'
    || action === 'cancel'
    || action === 'cancellation'
    || action === 'chargeback'
    || action === 'chargeback_warning';
}

function reversalKind(event) {
  const status = eventStatus(event);
  const action = eventAction(event);
  if (
    status === 'revoked'
    || status === 'canceled'
    || status === 'cancelled'
    || action === 'revoke'
    || action === 'revocation'
    || action === 'cancel'
    || action === 'cancellation'
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
  return (history || []).some((entry) => (
    entry.action === 'revoke'
    || entry.action === 'revocation'
    || entry.action === 'cancel'
    || entry.action === 'cancellation'
    || entry.action === 'chargeback'
    || entry.action === 'chargeback_warning'
  ));
}

function cloneRecord(record) {
  if (!record) return null;
  return {
    ...record,
    owner: record.owner ? { ...record.owner } : null,
    reversal_history: Array.isArray(record.reversal_history)
      ? record.reversal_history.map((entry) => ({ ...entry }))
      : [],
    confirmation: record.confirmation ? { ...record.confirmation } : null,
  };
}

function createSerialLock() {
  let tail = Promise.resolve();
  return function serialise(fn) {
    const run = tail.then(fn, fn);
    tail = run.then(() => undefined, () => undefined);
    return run;
  };
}

function createMemoryBackend() {
  const records = new Map();
  const processedEvents = new Map();
  const unboundReversals = new Map();
  const serialise = createSerialLock();

  return {
    kind: 'memory',
    withLock(fn) {
      return serialise(fn);
    },
    async getByIntent(intentId) {
      return records.get(intentId) || null;
    },
    async getByTransaction(transactionId) {
      if (!transactionId) return null;
      return [...records.values()].find((candidate) => candidate.paddle_transaction_id === transactionId) || null;
    },
    async insert(record) {
      if (records.has(record.checkout_intent_id)) throw fail('CHECKOUT_INTENT_ALREADY_BOUND');
      if (record.paddle_transaction_id) {
        const duplicate = [...records.values()].find(
          (candidate) => candidate.paddle_transaction_id === record.paddle_transaction_id,
        );
        if (duplicate) throw fail('PADDLE_TRANSACTION_ALREADY_BOUND');
      }
      const stored = { ...record, reversal_history: [...(record.reversal_history || [])] };
      records.set(record.checkout_intent_id, stored);
      return stored;
    },
    async save(record) {
      records.set(record.checkout_intent_id, record);
      return record;
    },
    async getUnbound(transactionId) {
      return unboundReversals.get(transactionId) || null;
    },
    async saveUnbound(transactionId, current) {
      unboundReversals.set(transactionId, current);
      return current;
    },
    async hasEvent(eventId) {
      return processedEvents.has(eventId);
    },
    async markEvent(eventId, status) {
      processedEvents.set(eventId, status || null);
    },
    async statusForTransaction(transactionId) {
      const record = [...records.values()].find((candidate) => candidate.paddle_transaction_id === transactionId);
      if (record) return record.status;
      const prior = unboundReversals.get(transactionId);
      if (!prior || !prior.history?.length) return processedEvents.get(`status:${transactionId}`) || null;
      return historyIsRevocation(prior.history) ? 'revoked' : 'refunded';
    },
  };
}

function createBadBuyerOwnershipStore(backend) {
  function rememberReversal(record, event, eventType, eventId) {
    if (!Array.isArray(record.reversal_history)) record.reversal_history = [];
    if (record.reversal_history.some((entry) => entry.event_id === eventId)) return;
    record.reversal_history.push(reversalEntry(event, eventType, eventId));
  }

  async function rememberUnboundReversal(transactionId, event, eventType, eventId, occurredAt) {
    const current = (await backend.getUnbound(transactionId)) || { history: [], last_event_time: 0, last_event_id: null };
    if (!current.history.some((entry) => entry.event_id === eventId)) {
      current.history.push(reversalEntry(event, eventType, eventId));
    }
    if (occurredAt >= current.last_event_time) {
      current.last_event_time = occurredAt;
      current.last_event_id = eventId;
    }
    current.status = historyIsRevocation(current.history) ? 'revoked' : 'refunded';
    await backend.saveUnbound(transactionId, current);
    return current;
  }

  async function applyUnboundReversal(record, transactionId) {
    if (!transactionId) return;
    const prior = await backend.getUnbound(transactionId);
    if (!prior || prior.history.length === 0) return;
    record.reversal_history = prior.history.map((entry) => ({ ...entry }));
    record.status = historyIsRevocation(prior.history) ? 'revoked' : 'refunded';
    record.refunded = true;
    record.revoked = true;
    record.fulfilment_entitled = false;
    record.issued = false;
    record.refunded_at = record.refunded_at || new Date(prior.last_event_time || Date.now()).toISOString();
    if (record.status === 'revoked') {
      record.revoked_at = record.revoked_at || record.refunded_at;
    }
    record.last_event_time = Math.max(record.last_event_time || 0, prior.last_event_time || 0);
    record.last_event_id = prior.last_event_id || record.last_event_id;
  }

  function sealTerminal(record, event, eventType, eventId, occurredAt) {
    rememberReversal(record, event, eventType, eventId);
    if (!TERMINAL_STATUSES.has(record.status)) record.status = reversalKind(event);
    record.refunded = true;
    record.revoked = true;
    record.fulfilment_entitled = false;
    const stamped = new Date(occurredAt || Date.now()).toISOString();
    record.refunded_at = record.refunded_at || stamped;
    if (record.status === 'revoked') record.revoked_at = record.revoked_at || stamped;
    if (occurredAt >= (record.last_event_time || 0)) {
      record.last_event_time = occurredAt;
      record.last_event_id = eventId;
      record.last_event_at = stamped;
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

  function denyIssuance(record) {
    return record.refunded
      || record.revoked
      || TERMINAL_STATUSES.has(record.status)
      || (record.reversal_history || []).length > 0;
  }

  function denyRetrieval(record) {
    return !record
      || !record.issued
      || !record.fulfilment_entitled
      || denyIssuance(record);
  }

  async function bindCheckoutIntent(input = {}) {
    return backend.withLock(async () => {
      assertTrustedCaller(input);
      const intentId = required(input.checkout_intent_id, 'CHECKOUT_INTENT_REQUIRED');
      const owner = ownerOf(input.owner);
      const transactionId = text(input.paddle_transaction_id);
      if (owner.brand !== BRAND) throw fail('BAD_BRAND_REQUIRED');
      if (await backend.getByIntent(intentId)) throw fail('CHECKOUT_INTENT_ALREADY_BOUND');
      if (transactionId && await backend.getByTransaction(transactionId)) {
        throw fail('PADDLE_TRANSACTION_ALREADY_BOUND');
      }
      const now = new Date().toISOString();
      const record = {
        checkout_intent_id: intentId,
        owner,
        order_confirmation_ref: required(input.order_confirmation_ref, 'ORDER_CONFIRMATION_REF_REQUIRED'),
        paddle_transaction_id: transactionId || null,
        erpnext_order_ref: text(input.erpnext_order_ref) || null,
        status: 'draft',
        issued: false,
        issued_at: null,
        refunded: false,
        refunded_at: null,
        revoked: false,
        revoked_at: null,
        fulfilment_entitled: false,
        last_event_time: 0,
        last_event_id: null,
        last_event_at: null,
        confirmation: null,
        confirmation_ref: required(input.order_confirmation_ref, 'ORDER_CONFIRMATION_REF_REQUIRED'),
        reversal_history: [],
        created_at: now,
        updated_at: now,
      };
      await applyUnboundReversal(record, transactionId);
      await backend.insert(record);
      return cloneRecord(record);
    });
  }

  return {
    kind: backend.kind,

    bindCheckoutIntent,

    async associateProviderTransaction(input = {}) {
      return backend.withLock(async () => {
        assertTrustedCaller(input);
        const intentId = required(input.checkout_intent_id, 'CHECKOUT_INTENT_REQUIRED');
        const transactionId = required(input.paddle_transaction_id, 'PADDLE_REFERENCE_REQUIRED');
        const record = await backend.getByIntent(intentId);
        if (!record) throw fail('CHECKOUT_INTENT_NOT_FOUND');
        if (record.paddle_transaction_id && record.paddle_transaction_id !== transactionId) {
          throw fail('PADDLE_TRANSACTION_ALREADY_BOUND');
        }
        const occupied = await backend.getByTransaction(transactionId);
        if (occupied && occupied.checkout_intent_id !== intentId) {
          throw fail('PADDLE_TRANSACTION_ALREADY_BOUND');
        }
        record.paddle_transaction_id = transactionId;
        await applyUnboundReversal(record, transactionId);
        record.updated_at = new Date().toISOString();
        await backend.save(record);
        return cloneRecord(record);
      });
    },

    async applyVerifiedWebhook(event = {}) {
      return backend.withLock(async () => {
        const eventId = eventIdOf(event);
        const eventType = text(event.eventType);
        if (!WEBHOOK_TYPES.has(eventType)) {
          return publicWebhookResult({ accepted: true, ignored: true, event_id: eventId });
        }
        const transactionId = transactionIdOf(event);
        if (!transactionId) throw fail('WEBHOOK_TRANSACTION_REQUIRED');
        if (await backend.hasEvent(eventId)) {
          return publicWebhookResult({
            accepted: true,
            deduped: true,
            event_id: eventId,
            transaction_id: transactionId,
            status: await backend.statusForTransaction(transactionId),
          });
        }
        const record = await backend.getByTransaction(transactionId);
        const occurredAt = eventTime(event);
        const reversal = isReversalEvent(event, eventType);
        if (!record) {
          if (reversal) {
            const prior = await rememberUnboundReversal(transactionId, event, eventType, eventId, occurredAt);
            await backend.markEvent(eventId, prior.status);
            return publicWebhookResult({
              accepted: true,
              event_id: eventId,
              transaction_id: transactionId,
              status: prior.status,
            });
          }
          await backend.markEvent(eventId, await backend.statusForTransaction(transactionId));
          return publicWebhookResult({
            accepted: true,
            ignored: true,
            event_id: eventId,
            transaction_id: transactionId,
            status: await backend.statusForTransaction(transactionId),
          });
        }
        if (!reversal && !assertBrand(event)) {
          await backend.markEvent(eventId, record.status);
          return webhookResult(record, eventId, transactionId, { ignored: true });
        }

        if (reversal) {
          sealTerminal(record, event, eventType, eventId, occurredAt);
          await backend.save(record);
          await backend.markEvent(eventId, record.status);
          return webhookResult(record, eventId, transactionId);
        }
        if (denyIssuance(record)) {
          if (!TERMINAL_STATUSES.has(record.status)) {
            record.status = historyIsRevocation(record.reversal_history) ? 'revoked' : 'refunded';
          }
          record.refunded = true;
          record.revoked = true;
          record.fulfilment_entitled = false;
          await backend.save(record);
          await backend.markEvent(eventId, record.status);
          return webhookResult(record, eventId, transactionId, { ignored: true });
        }
        if (occurredAt < (record.last_event_time || 0)) {
          await backend.markEvent(eventId, record.status);
          return webhookResult(record, eventId, transactionId, { ignored: true });
        }

        if (eventType === 'transaction.completed') record.status = 'paid';
        else if (eventType === 'transaction.payment_failed') record.status = 'abandoned';
        record.last_event_time = Math.max(record.last_event_time || 0, occurredAt);
        record.last_event_id = eventId;
        record.last_event_at = new Date(record.last_event_time || Date.now()).toISOString();
        record.updated_at = record.last_event_at;
        await backend.save(record);
        await backend.markEvent(eventId, record.status);
        return webhookResult(record, eventId, transactionId);
      });
    },

    async issueOrderConfirmation(input = {}) {
      return backend.withLock(async () => {
        assertTrustedCaller(input);
        const intentId = required(input.checkout_intent_id, 'CHECKOUT_INTENT_REQUIRED');
        const record = await backend.getByIntent(intentId);
        if (!record) return { ok: false, code: 'NOT_FOUND' };
        if (!sameOwner(record.owner, ownerOf(input.owner))) return { ok: false, code: 'FORBIDDEN' };
        if (denyIssuance(record)) return { ok: false, code: 'ORDER_NOT_ISSUABLE' };
        if (record.issued) return { ok: true, code: 'REPLAYED', confirmation: record.confirmation };
        if (record.status !== 'paid') return { ok: false, code: 'ORDER_NOT_ISSUABLE' };
        if (!meaningfulConfirmation(input.confirmation)) {
          return { ok: false, code: 'CONFIRMATION_INVALID' };
        }
        const reference = confirmationRefOf(input.confirmation);
        record.confirmation = Object.freeze({
          name: reference,
          confirmation_ref: reference,
        });
        record.confirmation_ref = reference;
        record.issued = true;
        record.issued_at = new Date().toISOString();
        record.status = 'issued';
        record.fulfilment_entitled = true;
        record.erpnext_order_ref = text(input.erpnext_order_ref) || record.erpnext_order_ref;
        record.updated_at = record.issued_at;
        await backend.save(record);
        return { ok: true, code: 'ISSUED', confirmation: record.confirmation };
      });
    },

    async issueOrderConfirmationForBoundPurchase(input = {}) {
      return backend.withLock(async () => {
        assertTrustedCaller(input);
        const transactionId = required(input.paddle_transaction_id, 'PADDLE_REFERENCE_REQUIRED');
        const record = await backend.getByTransaction(transactionId);
        if (!record) return { ok: false, code: 'NOT_FOUND' };
        if (denyIssuance(record)) return { ok: false, code: 'ORDER_NOT_ISSUABLE' };
        if (record.issued) return { ok: true, code: 'REPLAYED', confirmation: record.confirmation };
        if (record.status !== 'paid') return { ok: false, code: 'ORDER_NOT_ISSUABLE' };
        if (!meaningfulConfirmation(input.confirmation)) {
          return { ok: false, code: 'CONFIRMATION_INVALID' };
        }
        const reference = confirmationRefOf(input.confirmation);
        record.confirmation = Object.freeze({
          name: reference,
          confirmation_ref: reference,
        });
        record.confirmation_ref = reference;
        record.issued = true;
        record.issued_at = new Date().toISOString();
        record.status = 'issued';
        record.fulfilment_entitled = true;
        record.erpnext_order_ref = text(input.erpnext_order_ref) || record.erpnext_order_ref;
        record.updated_at = record.issued_at;
        await backend.save(record);
        return { ok: true, code: 'ISSUED', confirmation: record.confirmation };
      });
    },

    async retrieveOrderConfirmation(input = {}) {
      return backend.withLock(async () => {
        assertTrustedCaller(input);
        const record = await backend.getByIntent(text(input.checkout_intent_id));
        if (denyRetrieval(record)) return { ok: false, code: 'NOT_FOUND' };
        let owner;
        try {
          owner = ownerOf(input.owner);
        } catch (error) {
          if (error.code === 'UNTRUSTED_OWNER_SOURCE') throw error;
          return { ok: false, code: 'FORBIDDEN' };
        }
        if (!sameOwner(record.owner, owner)) return { ok: false, code: 'FORBIDDEN' };
        return {
          ok: true,
          code: 'RETRIEVED',
          confirmation: record.confirmation,
          confirmation_ref: record.confirmation_ref,
          erpnext_order_ref: record.erpnext_order_ref,
        };
      });
    },

    async inspect(checkoutIntentId) {
      return backend.withLock(async () => cloneRecord(await backend.getByIntent(text(checkoutIntentId))));
    },
  };
}

function createMemoryBadBuyerOwnershipStore() {
  return createBadBuyerOwnershipStore(createMemoryBackend());
}

function resolveBadBuyerOwnerFromSession(session) {
  if (!session || typeof session !== 'object' || Array.isArray(session)) throw fail('AUTH_USER_REQUIRED');
  if (session.ok !== true) throw fail('AUTH_USER_REQUIRED');
  const payload = session.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw fail('AUTH_USER_REQUIRED');
  if (text(payload.typ) !== 'tenant') throw fail('AUTH_USER_REQUIRED');
  for (const key of UNTRUSTED_OWNER_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) throw fail('UNTRUSTED_OWNER_SOURCE');
  }
  return ownerOf({
    auth_user_id: payload.user_id,
    tenant_id: payload.tenant_id,
    brand: BRAND,
  });
}

export {
  BRAND,
  createBadBuyerOwnershipStore,
  createMemoryBackend,
  createMemoryBadBuyerOwnershipStore,
  createSerialLock,
  fail,
  publicWebhookResult,
  resolveBadBuyerOwnerFromSession,
};
