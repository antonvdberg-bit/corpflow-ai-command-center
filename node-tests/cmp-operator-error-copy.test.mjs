/**
 * CMP operator error copy — approve-build / Proceed path.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCmpRouterOperatorError,
  mapApproveBuildServerException,
} from '../lib/cmp/_lib/cmp-operator-error-copy.js';

test('formatCmpRouterOperatorError — prefers operator_message over generic error', () => {
  const msg = formatCmpRouterOperatorError(
    {
      error: 'Approve build failed',
      operator_message: 'Approval failed: provisioning unavailable',
      detail: 'provisioning failed (exit 1)',
    },
    500,
    { action: 'approve-build' },
  );
  assert.equal(msg, 'Approval failed: provisioning unavailable');
});

test('formatCmpRouterOperatorError — surfaces detail when error is generic', () => {
  const msg = formatCmpRouterOperatorError(
    { error: 'Approve build failed', detail: 'verify-rigor failed (exit 2): budget' },
    500,
    { action: 'approve-build' },
  );
  assert.equal(msg, 'verify-rigor failed (exit 2): budget');
});

test('formatCmpRouterOperatorError — insufficient credits', () => {
  const msg = formatCmpRouterOperatorError(
    {
      error: 'FACTORY_DORMANT: INSUFFICIENT_CREDITS',
      reason: 'INSUFFICIENT_CREDITS',
      token_credit_balance_usd: 0,
    },
    402,
    { action: 'approve-build' },
  );
  assert.match(msg, /Insufficient token credits/i);
});

test('formatCmpRouterOperatorError — tenant boundary', () => {
  const msg = formatCmpRouterOperatorError(
    {
      error: 'Ticket not found',
      operator_message: 'Approval blocked by tenant boundary validation.',
    },
    404,
    { action: 'approve-build' },
  );
  assert.match(msg, /tenant boundary/i);
});

test('formatCmpRouterOperatorError — estimate required', () => {
  const msg = formatCmpRouterOperatorError(
    {
      error: 'This ticket cannot be approved until an estimate exists.',
      operator_message: 'This ticket cannot be approved until an estimate exists.',
    },
    409,
    { action: 'approve-build' },
  );
  assert.match(msg, /estimate exists/i);
});

test('mapApproveBuildServerException — provisioning', () => {
  const msg = mapApproveBuildServerException('provisioning failed (exit 1): stderr');
  assert.match(msg, /provisioning/i);
});
