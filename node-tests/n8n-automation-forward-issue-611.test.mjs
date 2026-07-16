import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const TEMPLATE_PATH =
  'docs/n8n/templates/automation-forward-issue-611-safe-test.template.json';
const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));
const routerNode = template.nodes.find(
  (node) => node.name === 'Validate Route Dedupe and Limit',
);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function createRouterHarness() {
  const state = {};
  const execute = new AsyncFunction(
    '$input',
    '$getWorkflowStaticData',
    'Date',
    routerNode.parameters.jsCode,
  );

  return async function route(body, now = 1_800_000_000_000) {
    return execute(
      { first: () => ({ json: { body } }) },
      () => state,
      { now: () => now },
    );
  };
}

function validLead(id = 'lead-event-1') {
  return {
    schema: 'corpflow.automation.envelope.v1',
    id,
    event_type: 'corpflow.lead_rescue.intake_received',
    correlation_id: 'lead-1',
    payload: {
      lead_id: 'lead-1',
      admin_detail_url: '/admin/lead-rescue/lead-1',
      prospect: {
        business_name: 'Test Business',
        contact_name: 'Alex Example',
      },
    },
  };
}

function validAlert(id = 'alert-event-1') {
  return {
    id,
    envelope: 'corpflow.ops_alert.v1',
    at: '2026-07-15T15:00:00.000Z',
    kind: 'production_validation_failure',
    ticket_id: 'ticket-1',
    message: 'Production validation failed. Operator review required.',
  };
}

test('issue 611 template is inactive, authenticated, and responds after routing', () => {
  assert.equal(template.active, false);
  const webhook = template.nodes.find((node) => node.name === 'Authenticated Test Webhook');
  assert.equal(webhook.parameters.authentication, 'headerAuth');
  assert.equal(webhook.parameters.responseMode, 'responseNode');
  assert.equal(template.meta.production_reactivation_authorized, false);

  const responseNodes = template.nodes.filter(
    (node) => node.type === 'n8n-nodes-base.respondToWebhook',
  );
  assert.equal(responseNodes.length, 1);
  assert.equal(responseNodes[0].parameters.options.responseCode, 200);

  const telegramNodes = template.nodes.filter((node) => node.type === 'n8n-nodes-base.telegram');
  assert.equal(telegramNodes.length, 2);
  for (const node of telegramNodes) {
    assert.equal(node.parameters.text, '={{ $json.telegram_text }}');
  }
});

test('valid lead produces exactly one populated lead notification', async () => {
  const route = createRouterHarness();
  const result = await route(validLead());
  assert.equal(result.length, 1);
  assert.equal(result[0].json.route, 'lead_rescue');
  assert.match(result[0].json.telegram_text, /Test Business/);
  assert.ok(result[0].json.telegram_text.trim().length > 0);
});

test('valid alert produces exactly one populated alert notification', async () => {
  const route = createRouterHarness();
  const result = await route(validAlert());
  assert.equal(result.length, 1);
  assert.equal(result[0].json.route, 'ops_alert');
  assert.match(result[0].json.telegram_text, /Operator review required/);
});

test('missing alert text produces zero notifications', async () => {
  const route = createRouterHarness();
  const result = await route({ ...validAlert(), message: '   ' });
  assert.equal(result.length, 1);
  assert.equal(result[0].json.route, 'ignored');
  assert.equal(result[0].json.skip_reason, 'alert_text_blank');
  assert.equal(result[0].json.telegram_text, '');
});

test('unknown event produces zero notifications', async () => {
  const route = createRouterHarness();
  const result = await route({
    schema: 'corpflow.automation.envelope.v1',
    id: 'unknown-1',
    event_type: 'cmp.operator.switched_tenant',
    payload: {},
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].json.route, 'ignored');
  assert.equal(result[0].json.skip_reason, 'unknown_event');
  assert.equal(result[0].json.telegram_text, '');
});

test('duplicate event produces at most one notification', async () => {
  const route = createRouterHarness();
  const first = await route(validLead('duplicate-event'));
  const second = await route(validLead('duplicate-event'), 1_800_000_000_100);
  assert.equal(first.length, 1);
  assert.equal(first[0].json.route, 'lead_rescue');
  assert.equal(second.length, 1);
  assert.equal(second[0].json.route, 'ignored');
  assert.equal(second[0].json.skip_reason, 'duplicate_event');
});

test('burst protection caps unique notifications at five per minute', async () => {
  const route = createRouterHarness();
  let notifications = 0;
  for (let index = 0; index < 12; index += 1) {
    const result = await route(
      validAlert(`burst-event-${index}`),
      1_800_000_000_000 + index,
    );
    notifications += result.filter((item) => item.json.route !== 'ignored').length;
  }
  assert.equal(notifications, 5);
});
