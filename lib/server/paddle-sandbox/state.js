const SUBSCRIPTION_EVENT_TYPES = new Set([
  'subscription.created',
  'subscription.updated',
  'subscription.canceled',
  'subscription.past_due',
]);

const TRANSACTION_EVENT_TYPES = new Set([
  'transaction.completed',
  'transaction.payment_failed',
]);

function stringValue(value) {
  return value == null ? null : String(value);
}

function eventTime(event) {
  const value = event?.occurredAt || event?.data?.updatedAt || event?.data?.createdAt;
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
}

function safePayload(event) {
  const data = event?.data || {};
  return {
    event_id: stringValue(event?.eventId),
    event_type: stringValue(event?.eventType),
    resource_id: stringValue(data.id),
    customer_id: stringValue(data.customerId),
    status: stringValue(data.status),
    occurred_at: stringValue(event?.occurredAt),
    updated_at: stringValue(data.updatedAt),
    scheduled_change: data.scheduledChange
      ? {
          action: stringValue(data.scheduledChange.action),
          effective_at: stringValue(data.scheduledChange.effectiveAt),
        }
      : null,
    price_ids: Array.isArray(data.items)
      ? data.items.map((item) => stringValue(item?.price?.id)).filter(Boolean)
      : [],
  };
}

function resourceId(event) {
  return stringValue(event?.data?.id);
}

export function entitlementForSubscription(subscription) {
  return Boolean(subscription && ['active', 'trialing'].includes(subscription.status));
}

export async function processPaddleSandboxEvent(prisma, event, accountId) {
  const eventId = stringValue(event?.eventId);
  const eventType = stringValue(event?.eventType);
  const id = resourceId(event);
  if (!eventId || !eventType || !id) throw new Error('PADDLE_EVENT_ID_AND_RESOURCE_REQUIRED');
  if (!SUBSCRIPTION_EVENT_TYPES.has(eventType) && !TRANSACTION_EVENT_TYPES.has(eventType)) {
    return { accepted: true, ignored: true, eventId };
  }

  const tenantScope = `paddle-sandbox:${accountId}`;
  const existing = await prisma.automationEvent.findUnique({
    where: { automation_events_scope_idem: { tenantScope, idempotencyKey: eventId } },
    select: { id: true },
  });
  if (existing) return { accepted: true, deduped: true, eventId, id: existing.id };

  const previous = await prisma.automationEvent.findMany({
    where: { tenantScope, eventType: 'paddle.subscription.state' },
    orderBy: { occurredAt: 'desc' },
    take: 100,
    select: { payload: true },
  });
  const payload = safePayload(event);
  if (SUBSCRIPTION_EVENT_TYPES.has(eventType)) {
    const prior = previous.find((row) => row.payload?.resource_id === id);
    if (prior && eventTime(event) < eventTime({ occurredAt: prior.payload?.occurred_at, data: prior.payload })) {
      return { accepted: true, stale: true, eventId, resourceId: id };
    }
  }

  const row = await prisma.automationEvent.create({
    data: {
      tenantScope,
      tenantId: null,
      source: 'paddle-sandbox-webhook',
      eventType: SUBSCRIPTION_EVENT_TYPES.has(eventType)
        ? 'paddle.subscription.state'
        : 'paddle.transaction.state',
      correlationId: id,
      idempotencyKey: eventId,
      riskTier: 'low',
      status: 'accepted',
      payload,
    },
    select: { id: true },
  });
  return { accepted: true, eventId, resourceId: id, id: row.id };
}

export async function getPaddleSandboxState(prisma, accountId) {
  const rows = await prisma.automationEvent.findMany({
    where: { tenantScope: `paddle-sandbox:${accountId}` },
    orderBy: { occurredAt: 'desc' },
    take: 200,
    select: { eventType: true, payload: true },
  });
  const subscriptions = new Map();
  const transactions = [];
  for (const row of rows) {
    const payload = row.payload || {};
    if (row.eventType === 'paddle.subscription.state' && payload.resource_id && !subscriptions.has(payload.resource_id)) {
      subscriptions.set(payload.resource_id, payload);
    }
    if (row.eventType === 'paddle.transaction.state') transactions.push(payload);
  }
  const subscription = [...subscriptions.values()].find((item) =>
    ['active', 'trialing', 'past_due', 'paused', 'canceled'].includes(item.status),
  ) || null;
  return {
    paymentConfirmed: transactions.some((item) => item.status === 'completed'),
    subscription,
    entitlementEligible: entitlementForSubscription(subscription),
    transactions,
  };
}
