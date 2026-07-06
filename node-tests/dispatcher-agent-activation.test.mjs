import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  buildDispatcherActivationPlan,
  BUSINESS_OPS_DISPATCHER_SCHEMA,
  DRY_RUN_ACTION_BY_OWNER,
  DISPATCHER_ACTIVATION_MODE_DRY_RUN,
  DISPATCHER_ACTIVATION_SCHEMA,
  formatActivationPlanText,
  groupRoutingsForActivationPlan,
  parseDispatcherFetchResponse,
  resolveDispatcherActivationUrl,
} from '../lib/server/dispatcher-agent-activation.js';

const sample = JSON.parse(
  fs.readFileSync('node-tests/fixtures/business-operations-dispatcher-sample.json', 'utf8'),
);

const actionRequired503 = JSON.parse(
  fs.readFileSync(
    'node-tests/fixtures/business-operations-dispatcher-action-required-503.json',
    'utf8',
  ),
);

describe('dispatcher-agent-activation', () => {
  it('groups routings by owner with dry-run actions', () => {
    const plan = groupRoutingsForActivationPlan(sample.routings);
    assert.equal(plan.cursor.length, 1);
    assert.equal(plan.codex.length, 1);
    assert.equal(plan.anton.length, 1);
    assert.equal(plan.n8n.length, 1);
    assert.equal(plan.no_action.length, 0);
    assert.equal(plan.cursor[0].action, DRY_RUN_ACTION_BY_OWNER.cursor);
    assert.equal(plan.codex[0].action, DRY_RUN_ACTION_BY_OWNER.codex);
    assert.equal(plan.anton[0].action, DRY_RUN_ACTION_BY_OWNER.anton);
    assert.equal(plan.n8n[0].action, DRY_RUN_ACTION_BY_OWNER.n8n);
  });

  it('builds activation plan with totals', () => {
    const activation = buildDispatcherActivationPlan(sample);
    assert.equal(activation.schema, DISPATCHER_ACTIVATION_SCHEMA);
    assert.equal(activation.mode, DISPATCHER_ACTIVATION_MODE_DRY_RUN);
    assert.equal(activation.totals.would_activate, 2);
    assert.equal(activation.totals.skip, 2);
    assert.equal(activation.totals.by_owner.cursor, 1);
    assert.equal(activation.totals.by_owner.codex, 1);
  });

  it('formatActivationPlanText includes owner sections', () => {
    const activation = buildDispatcherActivationPlan(sample);
    const text = formatActivationPlanText(activation);
    assert.match(text, /owner=cursor \(1\)/);
    assert.match(text, /owner=codex \(1\)/);
    assert.match(text, /owner=anton \(1\)/);
    assert.match(text, /owner=n8n \(1\)/);
    assert.match(text, /WOULD_ACTIVATE_CURSOR_CLOUD_API/);
    assert.match(text, /WOULD_ACTIVATE_CODEX_CLOUD/);
    assert.match(text, /SKIP_OPERATOR_GATE/);
    assert.match(text, /SKIP_N8N_HOSTED/);
    assert.match(text, /would_activate: 2/);
  });

  it('resolveDispatcherActivationUrl derives from health URL', () => {
    const url = resolveDispatcherActivationUrl('https://core.corpflowai.com/api/factory/health');
    assert.equal(url, 'https://core.corpflowai.com/api/factory/business-operations-dispatcher');
  });

  it('resolveDispatcherActivationUrl appends to core base', () => {
    const url = resolveDispatcherActivationUrl('https://core.corpflowai.com');
    assert.equal(url, 'https://core.corpflowai.com/api/factory/business-operations-dispatcher');
  });

  it('parseDispatcherFetchResponse accepts HTTP 503 with valid dispatcher schema', () => {
    const body = JSON.stringify(actionRequired503);
    const { report, httpStatus } = parseDispatcherFetchResponse(503, body);
    assert.equal(httpStatus, 503);
    assert.equal(report.schema, BUSINESS_OPS_DISPATCHER_SCHEMA);
    assert.equal(report.ok, false);
    assert.equal(report.summary?.page_anton, 7);
    assert.equal(report.summary?.routes?.anton, 7);
    assert.equal(report.summary?.routes?.codex, 1);

    const activation = buildDispatcherActivationPlan(report);
    assert.equal(activation.totals.would_activate, 1);
    assert.equal(activation.totals.skip, 1);
    assert.equal(activation.plan.codex[0].action, DRY_RUN_ACTION_BY_OWNER.codex);
    assert.equal(activation.plan.anton[0].action, DRY_RUN_ACTION_BY_OWNER.anton);
  });

  it('parseDispatcherFetchResponse rejects non-JSON body', () => {
    assert.throws(
      () => parseDispatcherFetchResponse(503, 'not json'),
      /not JSON/,
    );
  });

  it('parseDispatcherFetchResponse rejects JSON with wrong schema', () => {
    assert.throws(
      () => parseDispatcherFetchResponse(503, JSON.stringify({ schema: 'other', ok: false })),
      /invalid schema/,
    );
  });

  it('parseDispatcherFetchResponse rejects auth failure without dispatcher schema', () => {
    assert.throws(
      () => parseDispatcherFetchResponse(401, JSON.stringify({ error: 'UNAUTHORIZED' })),
      /invalid schema/,
    );
  });
});
