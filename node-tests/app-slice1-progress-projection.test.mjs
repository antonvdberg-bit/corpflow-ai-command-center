/**
 * #778 Slice 1 — deterministic progress + Core/Tenant projection safety.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rollupComponentProgress,
  milestoneWeight,
  maxMilestoneWeight,
} from '../lib/app/milestones.js';
import {
  resetSyntheticStore,
  getSyntheticRequest,
  setComponentExposure,
  applyComponentReview,
  SYNTHETIC_REQUEST_ID,
  createInitialSyntheticRequest,
} from '../lib/app/synthetic-store.js';
import {
  projectTenantRequest,
  projectCoreRequest,
  findTenantLeakPaths,
} from '../lib/app/projection.js';

const NS = 'test-progress';

test('deterministic progress roll-up from milestone weights', () => {
  const maxW = maxMilestoneWeight();
  assert.equal(milestoneWeight('not_started'), 0);
  assert.equal(milestoneWeight('live_verified'), maxW);
  const a = rollupComponentProgress([
    { milestone: 'not_started' },
    { milestone: 'live_verified' },
  ]);
  assert.equal(a.total_count, 2);
  assert.equal(a.complete_count, 1);
  assert.equal(a.remaining_count, 1);
  assert.equal(a.percent, Math.round((100 * (0 + maxW)) / (2 * maxW)));

  const b = rollupComponentProgress([
    { milestone: 'approved' },
    { milestone: 'approved' },
  ]);
  assert.equal(b.complete_count, 2);
  assert.equal(b.percent, Math.round((100 * (milestoneWeight('approved') * 2)) / (2 * maxW)));
});

test('same request/component identity across Core and Tenant projections', () => {
  resetSyntheticStore(NS);
  const row = getSyntheticRequest(SYNTHETIC_REQUEST_ID, NS);
  assert.ok(row);
  const tenant = projectTenantRequest(row);
  const core = projectCoreRequest(row);
  assert.equal(tenant.id, core.id);
  assert.equal(tenant.tenant_id, core.tenant_id);
  assert.equal(tenant.id, SYNTHETIC_REQUEST_ID);
  assert.equal(tenant.tenant_id, 'corpflowai');

  const tKeys = new Set(tenant.components.map((c) => c.key));
  const cKeys = new Set(core.components.map((c) => c.key));
  assert.deepEqual([...tKeys].sort(), [...cKeys].sort());
  assert.ok(tKeys.has('landing_copy'));
  assert.ok(tKeys.has('internal_wiring'));
  assert.equal(core.client_projection_preview.id, tenant.id);
});

test('tenant projection strips GitHub/PR/CI/agent/internal fields', () => {
  resetSyntheticStore(NS);
  const row = getSyntheticRequest(SYNTHETIC_REQUEST_ID, NS);
  const tenant = projectTenantRequest(row);
  const leaks = findTenantLeakPaths(tenant);
  assert.deepEqual(leaks, []);
  const blob = JSON.stringify(tenant).toLowerCase();
  assert.equal(blob.includes('github'), false);
  assert.equal(blob.includes('pr_number'), false);
  assert.equal(blob.includes('agent'), false);
  assert.equal(blob.includes('internal_note'), false);
  assert.equal(blob.includes('cursor/dispatcher'), false);
  assert.equal(blob.includes('workflow'), false);

  const core = projectCoreRequest(row);
  assert.ok(core.github);
  assert.ok(core.ci);
  assert.ok(core.agent);
  assert.ok(Array.isArray(core.evidence_refs) && core.evidence_refs.length > 0);
  assert.ok(Array.isArray(core.internal_notes) && core.internal_notes.length > 0);
});

test('exposed review succeeds; non-exposed review rejected; no external send flag path', () => {
  resetSyntheticStore(NS);
  const exposedFail = applyComponentReview({
    requestId: SYNTHETIC_REQUEST_ID,
    componentKey: 'internal_wiring',
    decision: 'approve',
    comment: 'should fail',
    namespace: NS,
  });
  assert.equal(exposedFail.ok, false);
  assert.equal(exposedFail.status, 403);

  const ok = applyComponentReview({
    requestId: SYNTHETIC_REQUEST_ID,
    componentKey: 'landing_copy',
    decision: 'approve',
    comment: 'Looks good',
    namespace: NS,
  });
  assert.equal(ok.ok, true);
  const tenant = projectTenantRequest(ok.request);
  const landing = tenant.components.find((c) => c.key === 'landing_copy');
  assert.equal(landing.milestone, 'approved');
  assert.equal(landing.exposed_for_client_review, false);
  assert.equal(landing.review.decision, 'approve');
});

test('Core exposure control toggles tenant review_allowed', () => {
  resetSyntheticStore(NS);
  const revoked = setComponentExposure(SYNTHETIC_REQUEST_ID, 'landing_copy', false, NS);
  assert.equal(revoked.ok, true);
  let tenant = projectTenantRequest(revoked.request);
  let landing = tenant.components.find((c) => c.key === 'landing_copy');
  assert.equal(landing.review_allowed, false);
  assert.equal(landing.view_only, true);

  const opened = setComponentExposure(SYNTHETIC_REQUEST_ID, 'internal_wiring', true, NS);
  assert.equal(opened.ok, true);
  tenant = projectTenantRequest(opened.request);
  const wiring = tenant.components.find((c) => c.key === 'internal_wiring');
  assert.equal(wiring.exposed_for_client_review, true);
  assert.equal(wiring.review_allowed, true);
  assert.equal(wiring.view_only, false);
});

test('initial fixture has one exposed and one view-only component', () => {
  const row = createInitialSyntheticRequest();
  const tenant = projectTenantRequest(row);
  const exposed = tenant.components.filter((c) => c.exposed_for_client_review);
  const viewOnly = tenant.components.filter((c) => c.view_only);
  assert.equal(exposed.length, 1);
  assert.equal(exposed[0].key, 'landing_copy');
  assert.ok(viewOnly.some((c) => c.key === 'internal_wiring'));
  assert.equal(tenant.attention_required, true);
  assert.ok(tenant.client_safe_blocker);
});
