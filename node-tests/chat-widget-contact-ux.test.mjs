import test from 'node:test';
import assert from 'node:assert/strict';

import { validateFlow, sanitiseFieldInput, publicNodeView } from '../lib/server/chat-widget/flow.js';
import { LIVING_WORD_FLOW_V3 } from '../lib/server/chat-widget/living-word-flow-v3.js';
import {
  buildChatWidgetLeadDisplayName,
  buildChatWidgetLeadPayload,
} from '../lib/server/chat-widget/notify.js';

test('LIVING_WORD_FLOW_V3 validates', () => {
  const flow = validateFlow(LIVING_WORD_FLOW_V3);
  assert.equal(flow.root, 'welcome');
  assert.ok(flow.nodes['contact-first-name']);
  assert.ok(flow.nodes['contact-surname']);
  assert.ok(flow.nodes['contact-whatsapp']);
  assert.ok(flow.nodes['contact-preferred-method']);
  assert.equal(flow.nodes['contact-submit'].next_after, 'request-complete');
});

test('welcome menu still has eight starter options', () => {
  const opts = LIVING_WORD_FLOW_V3.nodes.welcome.options;
  assert.equal(opts.length, 8);
});

test('contact preferred method options exclude Facebook/Messenger', () => {
  const opts = LIVING_WORD_FLOW_V3.nodes['contact-preferred-method'].options;
  const labels = opts.map((o) => o.label.toLowerCase());
  assert.deepEqual(labels, ['email', 'whatsapp', 'phone call', 'sms']);
  assert.ok(!labels.some((l) => l.includes('facebook') || l.includes('messenger')));
});

test('sanitiseFieldInput accepts first_name and surname', () => {
  assert.equal(sanitiseFieldInput('first_name', '  Anton  '), 'Anton');
  assert.equal(sanitiseFieldInput('surname', 'Smith'), 'Smith');
});

test('sanitiseFieldInput validates preferred_contact_method enum', () => {
  assert.equal(sanitiseFieldInput('preferred_contact_method', 'whatsapp'), 'whatsapp');
  assert.throws(() => sanitiseFieldInput('preferred_contact_method', 'facebook'), /invalid/);
});

test('publicNodeView exposes widget_action on request-complete options', () => {
  const view = publicNodeView('request-complete', LIVING_WORD_FLOW_V3.nodes['request-complete']);
  assert.equal(view.type, 'menu');
  const restart = view.options.find((o) => o.label === 'Submit another request');
  assert.equal(restart.widget_action, 'restart');
  const close = view.options.find((o) => o.label === 'Close chat');
  assert.equal(close.widget_action, 'close');
});

test('buildChatWidgetLeadDisplayName combines first and surname', () => {
  assert.equal(
    buildChatWidgetLeadDisplayName({ leadName: 'Anton', leadSurname: 'Smith' }),
    'Anton Smith',
  );
});

test('buildChatWidgetLeadPayload includes whatsapp_or_mobile and preferred_contact_method', () => {
  const payload = buildChatWidgetLeadPayload({
    tenantId: 'living-word-mauritius',
    threadId: 'thread_test_1',
    leadName: 'Demo',
    leadSurname: 'Contact',
    leadEmail: 'demo@corpflow-test.invalid',
    leadPhone: '+230 5000 0000',
    preferredContactMethod: 'whatsapp',
    requestType: 'contact',
    leadMessage: 'Sandbox contact UX v0.1 test',
    sourceHost: 'living-word-mauritius.corpflowai.com',
    sourcePath: '/site-preview',
    occurredAt: '2026-06-19T00:00:00.000Z',
  });
  assert.equal(payload.lead.name, 'Demo Contact');
  assert.equal(payload.lead.first_name, 'Demo');
  assert.equal(payload.lead.surname, 'Contact');
  assert.equal(payload.lead.phone, '+230 5000 0000');
  assert.equal(payload.lead.whatsapp_or_mobile, '+230 5000 0000');
  assert.equal(payload.lead.preferred_contact_method, 'whatsapp');
});
