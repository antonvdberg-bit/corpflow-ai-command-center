import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RNE_EVENT_TYPE,
  RNE_INTENT,
  RNE_SOURCE,
  buildRareExclusiveBridgeEvent,
  handleRareExclusiveIntake,
} from '../lib/server/rare-exclusive-intake.js';

function makeRes() {
  return {
    code: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function makePrisma() {
  const rows = [];
  let seq = 0;
  return {
    rows,
    lead: {
      async findFirst({ where }) {
        return [...rows].reverse().find(
          (r) => r.tenantId === where.tenantId && r.email === where.email && r.intent === where.intent,
        ) || null;
      },
      async create({ data }) {
        seq += 1;
        const row = { id: `rne-${seq}`, createdAt: new Date(), ...data };
        rows.push(row);
        return { ...row };
      },
      async update({ where, data }) {
        const i = rows.findIndex((r) => r.id === where.id);
        if (i < 0) throw new Error('not found');
        rows[i] = { ...rows[i], ...data };
        return { ...rows[i] };
      },
    },
  };
}

function request(overrides = {}) {
  return {
    method: 'POST',
    headers: { authorization: 'Bearer test-secret' },
    body: {
      event: RNE_EVENT_TYPE,
      occurred_at: '2026-10-22T01:00:00.000Z',
      source: RNE_SOURCE,
      contact: { name: 'Alex Buyer', email: 'Alex@Example.com' },
      interest: 'Exceptional property',
      message: 'Seeking a beachfront home in Mauritius.',
      consent: true,
      page: 'https://rareandexclusive.com/',
    },
    ...overrides,
  };
}

test('R&E intake rejects wrong bearer token', async () => {
  const res = makeRes();
  await handleRareExclusiveIntake(
    request({ headers: { authorization: 'Bearer wrong' } }),
    res,
    { prisma: makePrisma(), getSharedSecret: () => 'test-secret' },
  );
  assert.equal(res.code, 401);
  assert.equal(res.body.error, 'UNAUTHORIZED');
});

test('R&E intake creates one CorpFlow lead and syncs only ERPNext Lead at intake stage', async () => {
  const prisma = makePrisma();
  const calls = [];
  const res = makeRes();

  await handleRareExclusiveIntake(request(), res, {
    prisma,
    getSharedSecret: () => 'test-secret',
    getErpnextClient: () => ({ kind: 'memory' }),
    recordAutomationEvent: async (_prisma, event) => calls.push({ kind: 'automation', event }),
    reconcileSalesLifecycle: async (event, opts) => {
      calls.push({ kind: 'erp', event, opts });
      return {
        ok: true,
        erpnext_lead: 'CRM-LEAD-2026-00999',
        erpnext_opportunity: null,
        customer: null,
      };
    },
  });

  assert.equal(res.code, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.created, true);
  assert.equal(res.body.erpnext_synced, true);
  assert.equal(prisma.rows.length, 1);
  assert.equal(prisma.rows[0].intent, RNE_INTENT);
  assert.equal(prisma.rows[0].email, 'alex@example.com');
  assert.equal(prisma.rows[0].qualificationJson.erpnext.erpnext_lead, 'CRM-LEAD-2026-00999');

  const erp = calls.find((c) => c.kind === 'erp');
  assert.equal(erp.event.stage, 'intake');
  assert.equal(erp.opts.allowRealCustomer, true);
  assert.equal(erp.event.intake.working_email, 'alex@example.com');
  assert.match(erp.event.intake.business_display_name, /^Rare & Exclusive Private Client \/ Alex Buyer \/ [a-f0-9]{8}$/);

  const automation = calls.find((c) => c.kind === 'automation');
  assert.equal(automation.event.eventType, RNE_EVENT_TYPE);
  assert.equal(automation.event.tenantId, 'rare-exclusive');
});

test('R&E intake reuses the same CorpFlow lead for repeat enquiries from the same email', async () => {
  const prisma = makePrisma();
  const deps = {
    prisma,
    getSharedSecret: () => 'test-secret',
    getErpnextClient: () => ({ kind: 'memory' }),
    recordAutomationEvent: async () => {},
    reconcileSalesLifecycle: async () => ({ ok: true, erpnext_lead: 'CRM-LEAD-2026-00123' }),
  };

  const first = makeRes();
  await handleRareExclusiveIntake(request(), first, deps);

  const secondReq = request();
  secondReq.body = { ...secondReq.body, message: 'Second private-access request.', occurred_at: '2026-10-22T02:00:00.000Z' };
  const second = makeRes();
  await handleRareExclusiveIntake(secondReq, second, deps);

  assert.equal(first.body.lead_id, second.body.lead_id);
  assert.equal(second.body.created, false);
  assert.equal(prisma.rows.length, 1);
  assert.equal(prisma.rows[0].message, 'Second private-access request.');
});

test('R&E intake acknowledges captured lead when ERPNext is temporarily unavailable', async () => {
  const prisma = makePrisma();
  const res = makeRes();
  await handleRareExclusiveIntake(request(), res, {
    prisma,
    getSharedSecret: () => 'test-secret',
    getErpnextClient: () => null,
    recordAutomationEvent: async () => {},
  });

  assert.equal(res.code, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.erpnext_synced, false);
  assert.equal(res.body.erpnext_pending, true);
  assert.equal(prisma.rows.length, 1);
  assert.equal(prisma.rows[0].qualificationJson.erpnext.state, 'pending');
  assert.equal(prisma.rows[0].qualificationJson.erpnext.error, 'ERPNEXT_NOT_CONFIGURED');
});

test('bridge event never contains ERPNext credentials and uses stable private-client identity', () => {
  const event = buildRareExclusiveBridgeEvent(
    { id: 'lead-1', name: 'Alex Buyer', email: 'alex@example.com' },
    { contact: { name: 'Alex Buyer', email: 'alex@example.com' }, interest: 'Property', message: 'Hi', consent: true },
  );
  assert.equal(event.lead_id, 'lead-1');
  assert.equal(event.stage, 'intake');
  assert.equal(event.synthetic, false);
  assert.equal(event.intake.primary_contact_name, 'Alex Buyer');
  assert.equal(event.intake.working_email, 'alex@example.com');
  assert.equal(JSON.stringify(event).includes('ERPNEXT_API_SECRET'), false);
});
