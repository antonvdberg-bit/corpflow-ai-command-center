/**
 * Lux ticket operator email notifications (jan@luxemaurice.com).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LUX_TICKET_NOTIFY_EMAIL_DEFAULT,
  buildLuxTicketUpdateEmailPayload,
  resolveLuxTicketNotifyEmail,
} from '../lib/server/lux-ticket-operator-notify.js';

test('buildLuxTicketUpdateEmailPayload — created ticket targets Jan by default', () => {
  const p = buildLuxTicketUpdateEmailPayload({
    action: 'created',
    ticketId: 'cmtest123',
    descriptionPreview: 'Update villa copy',
    publicBaseUrl: 'https://lux.corpflowai.com',
  });
  assert.equal(p.schema, 'corpflow.email.lux_ticket_update.v1');
  assert.equal(p.to, LUX_TICKET_NOTIFY_EMAIL_DEFAULT);
  assert.equal(p.ticket_id, 'cmtest123');
  assert.match(String(p.subject), /created/i);
  assert.match(String(p.text), /Update villa copy/);
  assert.equal(p.change_url, 'https://lux.corpflowai.com/change');
});

test('buildLuxTicketUpdateEmailPayload — withdrawn ticket', () => {
  const p = buildLuxTicketUpdateEmailPayload({
    action: 'withdrawn',
    ticketId: 'cmtest456',
    publicBaseUrl: 'https://lux.corpflowai.com',
  });
  assert.match(String(p.subject), /withdrawn/i);
  assert.equal(p.event, 'lux_ticket_withdrawn');
});

test('resolveLuxTicketNotifyEmail — env override', () => {
  const prev = process.env.CORPFLOW_LUX_TICKET_NOTIFY_EMAIL;
  process.env.CORPFLOW_LUX_TICKET_NOTIFY_EMAIL = 'ops@example.com';
  try {
    assert.equal(resolveLuxTicketNotifyEmail(), 'ops@example.com');
  } finally {
    if (prev === undefined) delete process.env.CORPFLOW_LUX_TICKET_NOTIFY_EMAIL;
    else process.env.CORPFLOW_LUX_TICKET_NOTIFY_EMAIL = prev;
  }
});
