/**
 * Issue #528 — approve-build must not throw when guarding closed/withdrawn tickets.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { denyIfTicketClosed } from '../lib/cmp/_lib/ticket-mutable-guard.js';
import { isCmpTicketOperatorOpen } from '../lib/cmp/_lib/ticket-operator-withdraw.js';
import { formatCmpRouterOperatorError } from '../lib/cmp/_lib/cmp-operator-error-copy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readRepo(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

test('router.js — imports denyIfTicketClosed for approve-build guard', () => {
  const router = readRepo('lib/cmp/router.js');
  assert.match(router, /import \{ denyIfTicketClosed \} from '\.\/_lib\/ticket-mutable-guard\.js';/);
  assert.match(router, /const closedDenyApprove = denyIfTicketClosed\(res, exists, deny\)/);
  assert.match(router, /status: true,\s*\n\s*stage: true,/);
});

test('denyIfTicketClosed — closed ticket returns safe operator message (no throw)', () => {
  const calls = [];
  const fakeDeny = (res, status, error, extra) => {
    calls.push({ res, status, error, extra });
    return { status, error, extra };
  };
  const out = denyIfTicketClosed(fakeRes(), { status: 'Closed', stage: 'Closed' }, fakeDeny);
  assert.ok(out);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].status, 409);
  assert.equal(calls[0].error, 'TICKET_CLOSED');
  assert.equal(calls[0].extra.operator_message, 'This ticket is closed — approval is not available.');
});

test('denyIfTicketClosed — withdrawn workflow_state is blocked', () => {
  const calls = [];
  const fakeDeny = (res, status, error, extra) => {
    calls.push({ status, error, extra });
    return { status, error, extra };
  };
  const out = denyIfTicketClosed(
    fakeRes(),
    {
      status: 'Open',
      stage: 'Intake',
      consoleJson: { client_view: { workflow_state: 'closed' } },
    },
    fakeDeny,
  );
  assert.ok(out);
  assert.equal(calls[0].error, 'TICKET_CLOSED');
});

test('denyIfTicketClosed — estimated open ticket passes guard', () => {
  const row = {
    status: 'Open',
    stage: 'Estimate',
    consoleJson: {
      client_view: {
        workflow_state: 'estimated',
        last_estimate_at: '2026-07-06T00:00:00.000Z',
      },
    },
  };
  assert.equal(isCmpTicketOperatorOpen(row), true);
  assert.equal(denyIfTicketClosed(fakeRes(), row, fakeDenyNever), null);
});

test('formatCmpRouterOperatorError — TICKET_CLOSED maps to closed approval copy', () => {
  const msg = formatCmpRouterOperatorError(
    {
      error: 'TICKET_CLOSED',
      operator_message: 'This ticket is closed — approval is not available.',
    },
    409,
    { action: 'approve-build' },
  );
  assert.equal(msg, 'This ticket is closed — approval is not available.');
});

function fakeRes() {
  return {};
}

function fakeDenyNever() {
  throw new Error('deny should not be called for open estimated ticket');
}
