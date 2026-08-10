import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';

import {
  CANONICAL_REQUEST_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  SECOND_REQUEST_ID,
  SYNTHETIC_REQUEST_ID,
} from '../lib/app/constants.js';
import { rollupComponentProgress, normalizeMilestone } from '../lib/app/progress-rollup.js';
import {
  payloadContainsForbiddenTenantKeys,
  projectCoreRequest,
  projectCoreRequestList,
  projectTenantRequest,
  projectTenantRequestList,
} from '../lib/app/project.js';
import {
  getAppRequest,
  listAppRequests,
  resetRequestStore,
} from '../lib/app/request-store.js';
import {
  deriveComponentsFromTicket,
  normalizeCmpTicketRow,
  workflowToMilestone,
} from '../lib/app/request-normalize.js';

beforeEach(() => {
  resetRequestStore();
});

test('deterministic progress roll-up from milestone weights', () => {
  assert.equal(normalizeMilestone('planned'), 'not_started');
  assert.equal(normalizeMilestone('ready_for_review'), 'client_review');
  assert.equal(normalizeMilestone('complete'), 'live_verified');

  const mixed = rollupComponentProgress([
    { key: 'a', milestone: 'live_verified' },
    { key: 'b', milestone: 'in_progress' },
  ]);
  // weights 6 + 2 = 8 / 12 → 67%
  assert.equal(mixed.percent, 67);
  assert.equal(mixed.complete_count, 1);
  assert.equal(mixed.next_component_key, 'b');

  assert.equal(
    rollupComponentProgress([
      { key: 'a', milestone: 'approved' },
      { key: 'b', milestone: 'live_verified' },
    ]).percent,
    92,
  );
  assert.equal(rollupComponentProgress([]).percent, 0);

  // Required milestone set
  for (const ms of [
    'not_started',
    'defined',
    'in_progress',
    'preview_ready',
    'client_review',
    'approved',
    'live_verified',
  ]) {
    assert.equal(normalizeMilestone(ms), ms);
  }
});

test('same canonical request id across Core and Tenant projections', () => {
  const raw = getAppRequest(CANONICAL_REQUEST_ID);
  assert.ok(raw);
  const tenant = projectTenantRequest(raw);
  const core = projectCoreRequest(raw);
  assert.equal(tenant.request_id, core.request_id);
  assert.equal(tenant.tenant_id, core.tenant_id);
  assert.equal(tenant.request_id, CANONICAL_REQUEST_ID);
  assert.equal(SYNTHETIC_REQUEST_ID, CANONICAL_REQUEST_ID);
  assert.equal(tenant.tenant_id, REFERENCE_TENANT_ID);
  const tKeys = tenant.components.map((c) => c.key).sort();
  const cKeys = core.components.map((c) => c.key).sort();
  assert.deepEqual(tKeys, cKeys);
  assert.deepEqual(tKeys, ['internal_wiring', 'landing_copy']);
  assert.equal(core.client_projection_preview.request_id, tenant.request_id);
  assert.equal(core.progress.percent, tenant.progress.percent);
});

test('tenant projection omits Core-only / internal evidence fields', () => {
  const raw = getAppRequest(CANONICAL_REQUEST_ID);
  const tenant = projectTenantRequest(raw);
  assert.equal(payloadContainsForbiddenTenantKeys(tenant), false);
  const blob = JSON.stringify(tenant);
  assert.equal(blob.includes('internal_note'), false);
  assert.equal(blob.includes('internal_evidence'), false);
  assert.equal(blob.includes('internal_blocker'), false);
  assert.equal(blob.includes('github'), false);
  assert.equal(blob.includes('pr_number'), false);
  assert.equal(blob.includes('commit_sha'), false);
  assert.equal(blob.includes('technical_lead'), false);
  assert.equal(blob.includes('promotion'), false);
  const core = projectCoreRequest(raw);
  assert.ok(core.components.find((c) => c.key === 'landing_copy')?.github?.pr_number);
  assert.ok(core.internal_refs?.technical_lead);
});

test('corpflowai tenant list cannot see other-tenant foil request', () => {
  const list = projectTenantRequestList(listAppRequests(), REFERENCE_TENANT_ID);
  assert.equal(list.length, 2);
  assert.ok(list.some((r) => r.request_id === CANONICAL_REQUEST_ID));
  assert.ok(list.some((r) => r.request_id === SECOND_REQUEST_ID));
  assert.equal(
    list.some((r) => r.request_id === OTHER_TENANT_REQUEST_ID),
    false,
  );
});

test('Core request list tenant filtering works', () => {
  const all = listAppRequests();
  const corp = projectCoreRequestList(all, { tenantFilter: REFERENCE_TENANT_ID });
  assert.equal(corp.length, 2);
  assert.ok(corp.every((r) => r.tenant_id === REFERENCE_TENANT_ID));
  const other = projectCoreRequestList(all, { tenantFilter: 'cursor-test' });
  assert.equal(other.length, 1);
  assert.equal(other[0].request_id, OTHER_TENANT_REQUEST_ID);
  const byStatus = projectCoreRequestList(all, {
    tenantFilter: REFERENCE_TENANT_ID,
    statusFilter: 'Draft',
  });
  assert.equal(byStatus.length, 1);
  assert.equal(byStatus[0].request_id, SECOND_REQUEST_ID);
  const global = projectCoreRequestList(all, { tenantFilter: null });
  assert.equal(global.length, 3);
});

test('exposed component is review-enabled; ordinary component is view-only', () => {
  const tenant = projectTenantRequest(getAppRequest(CANONICAL_REQUEST_ID));
  const exposed = tenant.components.find((c) => c.key === 'landing_copy');
  const ordinary = tenant.components.find((c) => c.key === 'internal_wiring');
  assert.equal(exposed.exposed_for_client_review, true);
  assert.equal(exposed.review_enabled, true);
  assert.equal(exposed.view_only, false);
  assert.equal(ordinary.exposed_for_client_review, false);
  assert.equal(ordinary.review_enabled, false);
  assert.equal(ordinary.view_only, true);
});

test('normalizeCmpTicketRow adapts production-shaped cmp_tickets rows', () => {
  const row = {
    id: 'cmp_live_shaped_001',
    tenantId: REFERENCE_TENANT_ID,
    status: 'Approved',
    stage: 'Build',
    description: 'Live-shaped ticket without components[]',
    updatedAt: '2026-08-06T10:00:00.000Z',
    consoleJson: {
      client_view: {
        workflow_state: 'preview_ready',
        progress_message: 'Preview is ready.',
        automation: { preview_url: 'https://example.invalid/preview', dispatch_ok: true },
      },
      promotion: { pr_number: 780, merged: false, head_sha: 'abc123preview' },
    },
  };
  const req = normalizeCmpTicketRow(row, { source: 'cmp_ticket' });
  assert.ok(req);
  assert.equal(req.id, 'cmp_live_shaped_001');
  assert.equal(req.tenant_id, REFERENCE_TENANT_ID);
  assert.ok(req.console_json.client_view.components.length >= 1);
  assert.equal(workflowToMilestone('preview_ready'), 'preview_ready');
  const derived = deriveComponentsFromTicket({
    workflow: 'in_review',
    consoleJson: row.consoleJson,
    title: row.description,
  });
  assert.ok(derived.some((c) => c.key === 'delivery_outcome'));
});
