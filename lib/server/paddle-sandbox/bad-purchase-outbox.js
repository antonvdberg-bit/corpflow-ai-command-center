/**
 * Durable BAD purchase outbox stored in existing AutomationEvent rows.
 * Event-id receipt dedupe is not enough: a retry after a failed adapter
 * call must apply missing Customer/Order/onboarding effects, and a later
 * completed replay must not re-release onboarding after refund.
 */

export const BAD_OUTBOX_EVENT_TYPE = 'paddle.bad.purchase.state';
export const BAD_OUTBOX_JOB_TYPE = 'paddle.bad.purchase.job';

export function badOutboxScope(accountId) {
  return `paddle-sandbox:${accountId}:bad-outbox`;
}

function txnKey(transactionId) {
  return `txn:${transactionId}`;
}

function jobKey(eventId) {
  return `job:${eventId}`;
}

export function createMemoryBadPurchaseOutbox() {
  const txns = new Map();
  const jobs = new Map();
  return {
    kind: 'memory',
    txns,
    jobs,
    async getByTransaction(transactionId) {
      return txns.get(String(transactionId)) || null;
    },
    async saveTransaction(state) {
      const current = txns.get(state.transaction_id) || {};
      const next = { ...current, ...state };
      txns.set(state.transaction_id, next);
      return next;
    },
    async getJob(eventId) {
      return jobs.get(String(eventId)) || null;
    },
    async saveJob(eventId, state) {
      const next = { event_id: String(eventId), ...state };
      jobs.set(String(eventId), next);
      return next;
    },
  };
}

export function createPrismaBadPurchaseOutbox(prisma, accountId) {
  const tenantScope = badOutboxScope(accountId);

  async function load(idempotencyKey) {
    const row = await prisma.automationEvent.findUnique({
      where: { automation_events_scope_idem: { tenantScope, idempotencyKey } },
      select: { id: true, payload: true, status: true },
    });
    if (!row) return null;
    const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
    return { ...payload, status: payload.status || row.status };
  }

  async function save(idempotencyKey, eventType, correlationId, payload) {
    const existing = await prisma.automationEvent.findUnique({
      where: { automation_events_scope_idem: { tenantScope, idempotencyKey } },
      select: { id: true, payload: true },
    });
    const merged = { ...(existing?.payload && typeof existing.payload === 'object' ? existing.payload : {}), ...payload };
    if (existing) {
      await prisma.automationEvent.update({
        where: { id: existing.id },
        data: { payload: merged, status: merged.status, correlationId },
      });
      return merged;
    }
    await prisma.automationEvent.create({
      data: {
        tenantScope,
        tenantId: null,
        source: 'paddle-bad-outbox',
        eventType,
        correlationId,
        idempotencyKey,
        riskTier: 'low',
        status: merged.status,
        payload: merged,
      },
    });
    return merged;
  }

  return {
    kind: 'prisma',
    async getByTransaction(transactionId) {
      return load(txnKey(transactionId));
    },
    async saveTransaction(state) {
      return save(txnKey(state.transaction_id), BAD_OUTBOX_EVENT_TYPE, state.transaction_id, state);
    },
    async getJob(eventId) {
      return load(jobKey(eventId));
    },
    async saveJob(eventId, state) {
      return save(jobKey(eventId), BAD_OUTBOX_JOB_TYPE, eventId, { event_id: eventId, ...state });
    },
  };
}
