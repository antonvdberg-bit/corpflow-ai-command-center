import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';

import { applyComponentReview, setComponentExposure } from '../lib/app/component-review.js';
import { SYNTHETIC_REQUEST_ID } from '../lib/app/constants.js';
import { projectTenantRequest } from '../lib/app/project.js';
import { getSyntheticRequest, resetSyntheticStore } from '../lib/app/synthetic-store.js';

beforeEach(() => {
  resetSyntheticStore();
});

test('exposed review action succeeds (approve) with synthetic data — no external send', () => {
  const result = applyComponentReview({
    requestId: SYNTHETIC_REQUEST_ID,
    componentKey: 'landing_copy',
    decision: 'approve',
    comment: 'Looks good for Slice 1.',
    byRole: 'tenant_member',
    nowIso: '2026-08-06T12:00:00.000Z',
  });
  assert.equal(result.ok, true);
  assert.equal(result.decision, 'approve');
  const tenant = projectTenantRequest(result.request);
  const landing = tenant.components.find((c) => c.key === 'landing_copy');
  assert.equal(landing.milestone, 'approved');
  assert.equal(landing.latest_review.decision, 'approve');
  assert.equal(tenant.progress.percent, 50);
});

test('amend requires comment and updates milestone', () => {
  const missing = applyComponentReview({
    requestId: SYNTHETIC_REQUEST_ID,
    componentKey: 'landing_copy',
    decision: 'amend',
    comment: '',
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, 'comment_required');

  const ok = applyComponentReview({
    requestId: SYNTHETIC_REQUEST_ID,
    componentKey: 'landing_copy',
    decision: 'amend',
    comment: 'Please shorten the headline.',
  });
  assert.equal(ok.ok, true);
  assert.equal(
    getSyntheticRequest(SYNTHETIC_REQUEST_ID).console_json.client_view.components.find(
      (c) => c.key === 'landing_copy',
    ).milestone,
    'changes_requested',
  );
});

test('non-exposed review action is rejected', () => {
  const result = applyComponentReview({
    requestId: SYNTHETIC_REQUEST_ID,
    componentKey: 'internal_wiring',
    decision: 'approve',
    comment: 'should fail',
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'component_not_exposed');
  assert.equal(result.http_status, 403);
});

test('core exposure control can open then close review', () => {
  // Hide landing_copy first
  const hide = setComponentExposure({
    requestId: SYNTHETIC_REQUEST_ID,
    componentKey: 'landing_copy',
    exposed: false,
  });
  assert.equal(hide.ok, true);
  assert.equal(
    getSyntheticRequest(SYNTHETIC_REQUEST_ID).console_json.client_view.components.find(
      (c) => c.key === 'landing_copy',
    ).exposed_for_client_review,
    false,
  );
  const rejected = applyComponentReview({
    requestId: SYNTHETIC_REQUEST_ID,
    componentKey: 'landing_copy',
    decision: 'approve',
  });
  assert.equal(rejected.error, 'component_not_exposed');

  const show = setComponentExposure({
    requestId: SYNTHETIC_REQUEST_ID,
    componentKey: 'landing_copy',
    exposed: true,
  });
  assert.equal(show.ok, true);
  const accepted = applyComponentReview({
    requestId: SYNTHETIC_REQUEST_ID,
    componentKey: 'landing_copy',
    decision: 'reject',
    comment: 'Needs another pass',
  });
  assert.equal(accepted.ok, true);
});
