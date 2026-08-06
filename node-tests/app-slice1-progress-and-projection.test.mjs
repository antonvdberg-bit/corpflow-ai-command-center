import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';

import {
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  SYNTHETIC_REQUEST_ID,
} from '../lib/app/constants.js';
import { rollupComponentProgress } from '../lib/app/progress-rollup.js';
import {
  payloadContainsForbiddenTenantKeys,
  projectCoreRequest,
  projectTenantRequest,
  projectTenantRequestList,
} from '../lib/app/project.js';
import { getSyntheticRequest, listSyntheticRequests, resetSyntheticStore } from '../lib/app/synthetic-store.js';

beforeEach(() => {
  resetSyntheticStore();
});

test('deterministic progress roll-up from milestones', () => {
  assert.deepEqual(
    rollupComponentProgress([
      { key: 'a', milestone: 'complete' },
      { key: 'b', milestone: 'in_progress' },
    ]),
    {
      percent: 50,
      complete_count: 1,
      remaining_count: 1,
      total_count: 2,
      next_component_key: 'b',
    },
  );
  assert.equal(
    rollupComponentProgress([
      { key: 'a', milestone: 'approved' },
      { key: 'b', milestone: 'complete' },
    ]).percent,
    100,
  );
  assert.equal(rollupComponentProgress([]).percent, 0);
});

test('same request/component identity across Core and Tenant projections', () => {
  const raw = getSyntheticRequest(SYNTHETIC_REQUEST_ID);
  assert.ok(raw);
  const tenant = projectTenantRequest(raw);
  const core = projectCoreRequest(raw);
  assert.equal(tenant.request_id, core.request_id);
  assert.equal(tenant.tenant_id, core.tenant_id);
  assert.equal(tenant.request_id, SYNTHETIC_REQUEST_ID);
  assert.equal(tenant.tenant_id, REFERENCE_TENANT_ID);
  const tKeys = tenant.components.map((c) => c.key).sort();
  const cKeys = core.components.map((c) => c.key).sort();
  assert.deepEqual(tKeys, cKeys);
  assert.deepEqual(tKeys, ['internal_wiring', 'landing_copy']);
  assert.equal(core.client_projection_preview.request_id, tenant.request_id);
  assert.equal(core.progress.percent, tenant.progress.percent);
});

test('tenant projection omits internal evidence / github / agent fields', () => {
  const raw = getSyntheticRequest(SYNTHETIC_REQUEST_ID);
  const tenant = projectTenantRequest(raw);
  assert.equal(payloadContainsForbiddenTenantKeys(tenant), false);
  const blob = JSON.stringify(tenant);
  assert.equal(blob.includes('internal_note'), false);
  assert.equal(blob.includes('internal_evidence'), false);
  assert.equal(blob.includes('github'), false);
  assert.equal(blob.includes('pr_number'), false);
  assert.equal(blob.includes('commit_sha'), false);
  assert.equal(blob.includes('technical_lead'), false);
  assert.equal(blob.includes('promotion'), false);
  // Core retains internal refs
  const core = projectCoreRequest(raw);
  assert.ok(core.components.find((c) => c.key === 'landing_copy')?.github?.pr_number);
  assert.ok(core.internal_refs?.technical_lead);
});

test('corpflowai tenant list cannot see other-tenant foil request', () => {
  const list = projectTenantRequestList(listSyntheticRequests(), REFERENCE_TENANT_ID);
  assert.equal(list.length, 1);
  assert.equal(list[0].request_id, SYNTHETIC_REQUEST_ID);
  assert.equal(
    list.some((r) => r.request_id === OTHER_TENANT_REQUEST_ID),
    false,
  );
});

test('exposed component is review-enabled; ordinary component is view-only', () => {
  const tenant = projectTenantRequest(getSyntheticRequest(SYNTHETIC_REQUEST_ID));
  const exposed = tenant.components.find((c) => c.key === 'landing_copy');
  const ordinary = tenant.components.find((c) => c.key === 'internal_wiring');
  assert.equal(exposed.exposed_for_client_review, true);
  assert.equal(exposed.review_enabled, true);
  assert.equal(exposed.view_only, false);
  assert.equal(ordinary.exposed_for_client_review, false);
  assert.equal(ordinary.review_enabled, false);
  assert.equal(ordinary.view_only, true);
});
