import assert from 'node:assert/strict';
import test from 'node:test';

import {
  entitlementForSubscription,
  getPaddleSandboxState,
  processPaddleSandboxEvent,
} from '../lib/server/paddle-sandbox/state.js';

function fakePrisma() {
  const rows = [];
  return {
    rows,
    automationEvent: {
      findUnique: async ({ where }) =>
        rows.find(
          (row) =>
            row.tenantScope === where.automation_events_scope_idem.tenantScope &&
            row.idempotencyKey === where.automation_events_scope_idem.idempotencyKey,
        ) || null,
      findMany: async ({ where, orderBy, take }) =>
        rows
          .filter((row) => row.tenantScope === where.tenantScope && (!where.eventType || row.eventType === where.eventType))
          .sort((a, b) => b.occurredAt - a.occurredAt)
          .slice(0, take)
          .map((row) => ({ payload: row.payload, eventType: row.eventType })),
      create: async ({ data }) => {
        const row = { id: `row_${rows.length + 1}`, ...data, occurredAt: new Date() };
        rows.push(row);
        return { id: row.id };
      },
    },
  };
}

function event(eventId, eventType, data, occurredAt) {
  return { eventId, eventType, occurredAt, data };
}

test('active subscription is eligible, while past_due, paused, and canceled are not', () => {
  assert.equal(entitlementForSubscription({ status: 'active' }), true);
  assert.equal(entitlementForSubscription({ status: 'past_due' }), false);
  assert.equal(entitlementForSubscription({ status: 'paused' }), false);
  assert.equal(entitlementForSubscription({ status: 'canceled' }), false);
});

test('valid subscription events persist in the durable automation spine', async () => {
  const prisma = fakePrisma();
  const result = await processPaddleSandboxEvent(
    prisma,
    event('evt_1', 'subscription.created', { id: 'sub_1', status: 'active' }, '2026-10-05T08:00:00Z'),
    'proof',
  );
  assert.equal(result.accepted, true);
  assert.equal(prisma.rows[0].tenantScope, 'paddle-sandbox:proof');
  assert.equal(prisma.rows[0].payload.status, 'active');
});

test('duplicate delivery is deduplicated by Paddle event id', async () => {
  const prisma = fakePrisma();
  const input = event('evt_2', 'transaction.completed', { id: 'txn_1', status: 'completed' }, '2026-10-05T08:00:00Z');
  await processPaddleSandboxEvent(prisma, input, 'proof');
  const duplicate = await processPaddleSandboxEvent(prisma, input, 'proof');
  assert.equal(duplicate.deduped, true);
  assert.equal(prisma.rows.length, 1);
});

test('older subscription event cannot regress the durable state', async () => {
  const prisma = fakePrisma();
  await processPaddleSandboxEvent(
    prisma,
    event('evt_new', 'subscription.updated', { id: 'sub_2', status: 'canceled' }, '2026-10-05T08:02:00Z'),
    'proof',
  );
  const stale = await processPaddleSandboxEvent(
    prisma,
    event('evt_old', 'subscription.updated', { id: 'sub_2', status: 'active' }, '2026-10-05T08:01:00Z'),
    'proof',
  );
  assert.equal(stale.stale, true);
  assert.equal(prisma.rows.length, 1);
});

test('state separates one-time payment confirmation from recurring entitlement', async () => {
  const prisma = fakePrisma();
  await processPaddleSandboxEvent(
    prisma,
    event('evt_setup', 'transaction.completed', { id: 'txn_setup', status: 'completed' }, '2026-10-05T08:00:00Z'),
    'proof',
  );
  const state = await getPaddleSandboxState(prisma, 'proof');
  assert.equal(state.paymentConfirmed, true);
  assert.equal(state.subscription, null);
  assert.equal(state.entitlementEligible, false);
});

test('scheduled cancellation retains eligibility while status remains active', async () => {
  const prisma = fakePrisma();
  await processPaddleSandboxEvent(
    prisma,
    {
      ...event('evt_schedule', 'subscription.updated', { id: 'sub_3', status: 'active', scheduledChange: { action: 'cancel', effectiveAt: '2026-11-01T00:00:00Z' } }, '2026-10-05T08:00:00Z'),
    },
    'proof',
  );
  const state = await getPaddleSandboxState(prisma, 'proof');
  assert.equal(state.entitlementEligible, true);
  assert.equal(state.subscription.scheduled_change.action, 'cancel');
});

test('unsupported event types are acknowledged without state effects', async () => {
  const prisma = fakePrisma();
  const result = await processPaddleSandboxEvent(
    prisma,
    event('evt_unknown', 'customer.updated', { id: 'ctm_1' }, '2026-10-05T08:00:00Z'),
    'proof',
  );
  assert.equal(result.ignored, true);
  assert.equal(prisma.rows.length, 0);
});
