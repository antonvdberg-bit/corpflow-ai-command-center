import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildApprovedScheduleWhere,
  formatScheduleEntrySubtitle,
  serializeScheduleEntryForProps,
} from '../lib/server/tenant-schedule/entries.js';

test('buildApprovedScheduleWhere requires tenant_id', () => {
  assert.throws(() => buildApprovedScheduleWhere(''), /tenant_id_required/);
});

test('buildApprovedScheduleWhere scopes to tenant and approved only', () => {
  const where = buildApprovedScheduleWhere('living-word-mauritius', {
    now: new Date('2026-06-17T12:00:00.000Z'),
  });
  assert.equal(where.tenantId, 'living-word-mauritius');
  assert.equal(where.approved, true);
  assert.deepEqual(where.visibility.in, ['public', 'unlisted']);
  assert.ok(Array.isArray(where.OR));
});

test('buildApprovedScheduleWhere adds chatbotAnswerEligible for chatbot purpose', () => {
  const preview = buildApprovedScheduleWhere('living-word-mauritius');
  const chatbot = buildApprovedScheduleWhere('living-word-mauritius', { purpose: 'chatbot' });
  assert.equal(preview.chatbotAnswerEligible, undefined);
  assert.equal(chatbot.chatbotAnswerEligible, true);
});

test('serializeScheduleEntryForProps converts dates to ISO strings', () => {
  const row = {
    id: 'x1',
    tenantId: 'living-word-mauritius',
    category: 'service',
    title: 'Sunday Service',
    description: 'Weekly worship',
    startsAt: new Date('2026-06-21T05:30:00.000Z'),
    endsAt: null,
    recurrence: 'weekly',
    weeklyDayOfWeek: 0,
    weeklyTime: '09:30',
    locationName: 'Living Word Church, Grand Baie',
    locationMapUrl: null,
    ageBand: 'all',
    visibility: 'public',
    approved: true,
    source: 'church-input',
    lastReviewedAt: new Date('2026-06-17T00:00:00.000Z'),
    expiresAt: new Date('2027-06-17T23:59:59.999Z'),
    chatbotAnswerEligible: true,
  };
  const out = serializeScheduleEntryForProps(row);
  assert.equal(out.tenantId, 'living-word-mauritius');
  assert.equal(out.startsAt, '2026-06-21T05:30:00.000Z');
  assert.equal(out.approved, true);
});

test('formatScheduleEntrySubtitle includes approved marker', () => {
  const subtitle = formatScheduleEntrySubtitle({
    category: 'service',
    recurrence: 'weekly',
    weeklyTime: '09:30',
    locationName: 'Living Word Church, Grand Baie',
    startsAt: null,
  });
  assert.match(subtitle, /service/);
  assert.match(subtitle, /weekly 09:30/);
  assert.match(subtitle, /approved schedule entry/);
});

test('tenant isolation: where clause never omits tenantId', () => {
  const where = buildApprovedScheduleWhere('luxe-maurice');
  assert.equal(where.tenantId, 'luxe-maurice');
  assert.notEqual(where.tenantId, 'living-word-mauritius');
});
