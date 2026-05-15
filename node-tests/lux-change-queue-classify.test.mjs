import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LUX_PARENT_PROGRAMME_TICKET_ID } from '../lib/cmp/_lib/lux-client-requests.js';
import { LUX_PHASE1_REVIEW_TICKET_ID } from '../lib/cmp/_lib/client-decisions-client.js';
import {
  classifyLuxChangeQueueTicket,
  groupLuxOperatorQueueTickets,
  isLuxQueueRowEffectivelyBlank,
  partitionLuxChangeQueueTickets,
} from '../lib/client/lux-change-queue-classify.js';
import { buildLuxChangeConsoleChrome } from '../lib/client/lux-change-console-theme.js';

test('classifyLuxChangeQueueTicket: programme ids', () => {
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: LUX_PARENT_PROGRAMME_TICKET_ID, requested_change: 'x' }).bucket,
    'programme',
  );
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: LUX_PHASE1_REVIEW_TICKET_ID, requested_change: 'x' }).bucket,
    'programme',
  );
});

test('classifyLuxChangeQueueTicket: programme wins over blank title', () => {
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: LUX_PARENT_PROGRAMME_TICKET_ID, requested_change: '' }).bucket,
    'programme',
  );
});

test('isLuxQueueRowEffectivelyBlank', () => {
  assert.equal(isLuxQueueRowEffectivelyBlank({ ticket_id: 'x', requested_change: '' }), true);
  assert.equal(isLuxQueueRowEffectivelyBlank({ ticket_id: 'x', requested_change: '—' }), true);
  assert.equal(isLuxQueueRowEffectivelyBlank({ ticket_id: 'x', requested_change: '  \u2014  ' }), true);
  assert.equal(isLuxQueueRowEffectivelyBlank({ ticket_id: 'x', requested_change: 'Real title' }), false);
});

test('classifyLuxChangeQueueTicket: archived smoke / phase 4 heuristics', () => {
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 't1', requested_change: 'Phase 2 smoke verification' }).bucket,
    'archived_smoke',
  );
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 't1b', requested_change: 'Phase 4C1 attachment smoke' }).bucket,
    'archived_smoke',
  );
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 't2', requested_change: 'QA fixture for example.invalid host' }).bucket,
    'archived_smoke',
  );
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 't3', requested_change: 'Automated attachment review artifact' }).bucket,
    'archived_smoke',
  );
});

test('classifyLuxChangeQueueTicket: property_media / crm_leads / active_client', () => {
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 'a', requested_change: 'Hero slot media publish' }).bucket,
    'property_media',
  );
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 'b', requested_change: 'Property editor listing slug lm-demo' }).bucket,
    'property_media',
  );
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 'c', requested_change: 'CRM lead intake' }).bucket,
    'crm_leads',
  );
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 'd', requested_change: 'Concierge follow-up' }).bucket,
    'crm_leads',
  );
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 'e', requested_change: 'General website refinement scope' }).bucket,
    'active_client',
  );
});

test('classifyLuxChangeQueueTicket: internal when empty summary', () => {
  assert.equal(classifyLuxChangeQueueTicket({ ticket_id: 'z9', requested_change: '' }).bucket, 'internal');
});

test('partitionLuxChangeQueueTickets: archived smoke split only', () => {
  const { primary, smoke } = partitionLuxChangeQueueTickets([
    { ticket_id: 'sm', requested_change: 'smoke test' },
    { ticket_id: LUX_PARENT_PROGRAMME_TICKET_ID, requested_change: 'Programme' },
    { ticket_id: 'x', requested_change: 'Normal change' },
  ]);
  assert.equal(primary.length, 2);
  assert.equal(smoke.length, 1);
  assert.equal(smoke[0].ticket_id, 'sm');
});

test('groupLuxOperatorQueueTickets: buckets + counts + programme preserved', () => {
  const g = groupLuxOperatorQueueTickets([
    { ticket_id: 'sm', requested_change: 'smoke test' },
    { ticket_id: LUX_PARENT_PROGRAMME_TICKET_ID, requested_change: 'Programme' },
    { ticket_id: 'x', requested_change: 'Normal change' },
    { ticket_id: 'in', requested_change: '' },
    { ticket_id: 'pm', requested_change: 'Gallery publish gate' },
    { ticket_id: 'cr', requested_change: 'Lead workflow intake' },
  ]);
  assert.equal(g.counts.programme, 1);
  assert.equal(g.counts.archivedSmoke, 1);
  assert.equal(g.counts.activeClient, 1);
  assert.equal(g.counts.internal, 1);
  assert.equal(g.counts.propertyMedia, 1);
  assert.equal(g.counts.crmLeads, 1);
  assert.equal(g.counts.total, 6);
  assert.equal(g.programme[0].ticket_id, LUX_PARENT_PROGRAMME_TICKET_ID);
  assert.equal(g.archivedSmoke[0].ticket_id, 'sm');
});

test('buildLuxChangeConsoleChrome: queue + badge tokens for new buckets', () => {
  const c = buildLuxChangeConsoleChrome();
  assert.equal(typeof c.shellStyle, 'function');
  assert.equal(typeof c.pre, 'function');
  assert.equal(typeof c.badge, 'function');
  assert.equal(typeof c.queueBtnInternal, 'function');
  assert.ok(String(c.shellStyle().background || '').length > 0);
  assert.ok(c.badge('archived_smoke').color);
  assert.ok(c.badge('internal').color);
});
