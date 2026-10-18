/**
 * Durable BAD purchase outbox stored in existing AutomationEvent rows.
 * Jobs and transaction locks are claimed via unique-key create plus status CAS
 * so concurrent webhook deliveries cannot both apply downstream effects.
 * Refunds stamp a terminal tombstone before adapter work.
 */

export const BAD_OUTBOX_EVENT_TYPE = 'paddle.bad.purchase.state';
export const BAD_OUTBOX_JOB_TYPE = 'paddle.bad.purchase.job';
export const BAD_OUTBOX_LOCK_TYPE = 'paddle.bad.purchase.lock';
export const BAD_CLAIM_LEASE_MS = 30_000;

const STATUS_RANK = Object.freeze({
  pending: 1,
  failed: 2,
  applied: 3,
  claimed: 3,
  processing: 3,
  refunded: 4,
});

export function badOutboxScope(accountId) {
  return `paddle-sandbox:${accountId}:bad-outbox`;
}

function txnKey(transactionId) {
  return `txn:${transactionId}`;
}

function jobKey(eventId) {
  return `job:${eventId}`;
}

function lockKey(transactionId) {
  return `lock:${transactionId}`;
}

function isUniqueConstraint(error) {
  return error?.code === 'P2002' || /unique constraint/i.test(String(error?.message || ''));
}

export function mergeTransactionPayload(current, incoming) {
  if (!current) return { ...incoming };
  const incomingRank = STATUS_RANK[incoming.status] || 0;
  const currentRank = STATUS_RANK[current.status] || 0;
  let status = incoming.status || current.status;
  if (current.status === 'refunded' || incoming.status === 'refunded') {
    status = 'refunded';
  } else if (current.status === 'applied' && (incoming.status === 'pending' || incoming.status === 'failed')) {
    status = 'applied';
  } else if ((incoming.last_event_time || 0) < (current.last_event_time || 0) && currentRank >= incomingRank) {
    status = current.status;
  } else if (incomingRank < currentRank) {
    status = current.status;
  }
  return {
    ...current,
    ...incoming,
    status,
    last_event_time: Math.max(current.last_event_time || 0, incoming.last_event_time || 0),
  };
}

function newClaimToken() {
  return `claim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function leaseExpired(payload, now) {
  const claimedAt = Number(payload?.claimed_at || 0);
  if (!claimedAt) return true;
  return now - claimedAt > BAD_CLAIM_LEASE_MS;
}

function createStore(api) {
  return {
    kind: api.kind,
    async getByTransaction(transactionId) {
      return api.load(txnKey(transactionId));
    },
    async saveTransaction(state) {
      return api.mergeSave(txnKey(state.transaction_id), BAD_OUTBOX_EVENT_TYPE, state.transaction_id, state, mergeTransactionPayload);
    },
    async stampRefund(transactionId, meta = {}) {
      return api.mergeSave(txnKey(transactionId), BAD_OUTBOX_EVENT_TYPE, transactionId, {
        transaction_id: transactionId,
        status: 'refunded',
        effect_status: meta.effect_status || 'pending',
        last_event_id: meta.event_id || null,
        last_event_type: meta.event_type || null,
        last_event_time: meta.last_event_time || 0,
        item_code: meta.item_code || null,
        correlation_id: meta.correlation_id || null,
        refund_tombstone: true,
      }, mergeTransactionPayload);
    },
    async getJob(eventId) {
      return api.load(jobKey(eventId));
    },
    async saveJob(eventId, state) {
      return api.mergeSave(jobKey(eventId), BAD_OUTBOX_JOB_TYPE, eventId, { event_id: eventId, ...state });
    },
    async claimJob(eventId, options = {}) {
      return api.claim(jobKey(eventId), BAD_OUTBOX_JOB_TYPE, eventId, options);
    },
    async completeJob(eventId, state) {
      return api.mergeSave(jobKey(eventId), BAD_OUTBOX_JOB_TYPE, eventId, { event_id: eventId, status: 'applied', ...state });
    },
    async failJob(eventId, error) {
      return api.mergeSave(jobKey(eventId), BAD_OUTBOX_JOB_TYPE, eventId, {
        event_id: eventId,
        status: 'pending',
        error: error?.code || error?.message || String(error || 'failed'),
      });
    },
    async claimTransactionLock(transactionId, options = {}) {
      return api.claim(lockKey(transactionId), BAD_OUTBOX_LOCK_TYPE, transactionId, options);
    },
    async releaseTransactionLock(transactionId, token) {
      const current = await api.load(lockKey(transactionId));
      if (!current || (token && current.claim_token !== token)) return current;
      return api.mergeSave(lockKey(transactionId), BAD_OUTBOX_LOCK_TYPE, transactionId, {
        status: 'pending',
        claim_token: null,
        claimed_at: 0,
      });
    },
  };
}

function createMemoryApi() {
  const rows = new Map();
  let tail = Promise.resolve();
  function serialize(fn) {
    const run = tail.then(fn, fn);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  return {
    kind: 'memory',
    async load(idempotencyKey) {
      return serialize(async () => rows.get(idempotencyKey) || null);
    },
    async mergeSave(idempotencyKey, eventType, correlationId, payload, merge = (current, incoming) => ({ ...current, ...incoming })) {
      return serialize(async () => {
        const current = rows.get(idempotencyKey) || null;
        const merged = merge(current, payload);
        const next = { ...merged, status: merged.status };
        rows.set(idempotencyKey, next);
        return next;
      });
    },
    async claim(idempotencyKey, eventType, correlationId, options = {}) {
      const now = options.now || Date.now();
      const token = options.token || newClaimToken();
      return serialize(async () => {
        const current = rows.get(idempotencyKey) || null;
        if (!current) {
          const next = { status: 'claimed', claim_token: token, claimed_at: now, eventType, correlationId };
          rows.set(idempotencyKey, next);
          return { owned: true, token, job: next };
        }
        if (current.status === 'applied') {
          return { owned: false, status: 'applied', job: current };
        }
        if (current.status === 'claimed' && !leaseExpired(current, now)) {
          return { owned: false, status: 'claimed', job: current };
        }
        const next = { ...current, status: 'claimed', claim_token: token, claimed_at: now };
        rows.set(idempotencyKey, next);
        return { owned: true, token, job: next };
      });
    },
  };
}

function createPrismaApi(prisma, accountId) {
  const tenantScope = badOutboxScope(accountId);

  async function load(idempotencyKey) {
    const row = await prisma.automationEvent.findUnique({
      where: { automation_events_scope_idem: { tenantScope, idempotencyKey } },
      select: { id: true, payload: true, status: true },
    });
    if (!row) return null;
    const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
    return { ...payload, status: payload.status || row.status, _rowId: row.id };
  }

  async function write(idempotencyKey, eventType, correlationId, payload) {
    const existing = await prisma.automationEvent.findUnique({
      where: { automation_events_scope_idem: { tenantScope, idempotencyKey } },
      select: { id: true, payload: true, status: true },
    });
    if (existing) {
      await prisma.automationEvent.update({
        where: { id: existing.id },
        data: { payload, status: payload.status, correlationId },
      });
      return payload;
    }
    try {
      await prisma.automationEvent.create({
        data: {
          tenantScope,
          tenantId: null,
          source: 'paddle-bad-outbox',
          eventType,
          correlationId,
          idempotencyKey,
          riskTier: 'low',
          status: payload.status,
          payload,
        },
      });
      return payload;
    } catch (error) {
      if (!isUniqueConstraint(error)) throw error;
      const raced = await prisma.automationEvent.findUnique({
        where: { automation_events_scope_idem: { tenantScope, idempotencyKey } },
        select: { id: true, payload: true, status: true },
      });
      if (!raced) throw error;
      const current = raced.payload && typeof raced.payload === 'object' ? raced.payload : {};
      const merged = { ...current, ...payload, status: payload.status || current.status || raced.status };
      await prisma.automationEvent.update({
        where: { id: raced.id },
        data: { payload: merged, status: merged.status, correlationId },
      });
      return merged;
    }
  }

  return {
    kind: 'prisma',
    load,
    async mergeSave(idempotencyKey, eventType, correlationId, payload, merge = (current, incoming) => ({ ...current, ...incoming })) {
      const current = await load(idempotencyKey);
      const { _rowId, ...rest } = current || {};
      const merged = merge(rest, payload);
      return write(idempotencyKey, eventType, correlationId, merged);
    },
    async claim(idempotencyKey, eventType, correlationId, options = {}) {
      const now = options.now || Date.now();
      const token = options.token || newClaimToken();
      const claimed = { status: 'claimed', claim_token: token, claimed_at: now };
      try {
        await prisma.automationEvent.create({
          data: {
            tenantScope,
            tenantId: null,
            source: 'paddle-bad-outbox',
            eventType,
            correlationId,
            idempotencyKey,
            riskTier: 'low',
            status: 'claimed',
            payload: claimed,
          },
        });
        return { owned: true, token, job: claimed };
      } catch (error) {
        if (!isUniqueConstraint(error)) throw error;
      }
      const current = await load(idempotencyKey);
      if (!current) return { owned: false, status: 'pending', job: null };
      if (current.status === 'applied') return { owned: false, status: 'applied', job: current };
      if (current.status === 'claimed' && !leaseExpired(current, now)) {
        return { owned: false, status: 'claimed', job: current };
      }
      const stealable = ['pending', 'failed', 'accepted'];
      if (current.status === 'claimed' && leaseExpired(current, now)) stealable.push('claimed');
      const next = { ...current, ...claimed };
      delete next._rowId;
      const updated = await prisma.automationEvent.updateMany({
        where: {
          tenantScope,
          idempotencyKey,
          status: { in: stealable },
        },
        data: { status: 'claimed', payload: next, correlationId },
      });
      if (updated.count === 1) return { owned: true, token, job: next };
      const latest = await load(idempotencyKey);
      return { owned: false, status: latest?.status || 'claimed', job: latest };
    },
  };
}

export function createMemoryBadPurchaseOutbox() {
  return createStore(createMemoryApi());
}

export function createPrismaBadPurchaseOutbox(prisma, accountId) {
  return createStore(createPrismaApi(prisma, accountId));
}
