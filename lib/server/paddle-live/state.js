export const PADDLE_LIVE_TRANSACTION_EVENT_TYPES = new Set([
  'transaction.completed',
  'transaction.payment_failed',
  'transaction.refunded',
]);

export const PADDLE_LIVE_SUBSCRIPTION_EVENT_TYPES = new Set([
  'subscription.created',
  'subscription.updated',
  'subscription.canceled',
  'subscription.past_due',
]);

function stringValue(value) {
  return value == null ? null : String(value);
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
    price_ids: Array.isArray(data.items)
      ? data.items.map((item) => stringValue(item?.price?.id)).filter(Boolean)
      : [],
    live_activation: false,
    public_checkout: false,
    erpnext_write: false,
  };
}

export async function processPaddleLiveEvent(prisma, event, accountId) {
  const eventId = stringValue(event?.eventId);
  const eventType = stringValue(event?.eventType);
  const id = stringValue(event?.data?.id);
  if (!eventId || !eventType || !id) throw new Error('PADDLE_EVENT_ID_AND_RESOURCE_REQUIRED');
  if (
    !PADDLE_LIVE_SUBSCRIPTION_EVENT_TYPES.has(eventType) &&
    !PADDLE_LIVE_TRANSACTION_EVENT_TYPES.has(eventType)
  ) {
    return {
      accepted: true,
      ignored: true,
      eventId,
      live_activation: false,
      erpnext_write: false,
      public_checkout: false,
    };
  }

  const tenantScope = `paddle-live:${accountId}`;
  const existing = await prisma.automationEvent.findUnique({
    where: { automation_events_scope_idem: { tenantScope, idempotencyKey: eventId } },
    select: { id: true },
  });
  if (existing) {
    return {
      accepted: true,
      deduped: true,
      eventId,
      id: existing.id,
      live_activation: false,
      erpnext_write: false,
      public_checkout: false,
    };
  }

  const row = await prisma.automationEvent.create({
    data: {
      tenantScope,
      tenantId: null,
      source: 'paddle-live-webhook',
      eventType: PADDLE_LIVE_SUBSCRIPTION_EVENT_TYPES.has(eventType)
        ? 'paddle.live.subscription.state'
        : 'paddle.live.transaction.state',
      correlationId: id,
      idempotencyKey: eventId,
      riskTier: 'low',
      status: 'accepted_unactivated',
      payload: safePayload(event),
    },
    select: { id: true },
  });
  return {
    accepted: true,
    eventId,
    resourceId: id,
    id: row.id,
    live_activation: false,
    erpnext_write: false,
    public_checkout: false,
    entitlement_eligible: false,
  };
}
