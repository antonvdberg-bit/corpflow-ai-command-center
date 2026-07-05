/**
 * Issue #523 — Lux /change create-ticket discoverability + operator withdraw path.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OPERATOR_WITHDRAWAL_CONTEXT_NOTE,
  buildOperatorWithdrawalConsoleJson,
  isCmpTicketOperatorOpen,
  validateOperatorWithdrawalTarget,
} from '../lib/cmp/_lib/ticket-operator-withdraw.js';
import { denyIfTicketClosed } from '../lib/cmp/_lib/ticket-mutable-guard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readRepo(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

test('ticket-operator-withdraw — open vs closed detection', () => {
  assert.equal(isCmpTicketOperatorOpen({ status: 'Open', stage: 'Intake' }), true);
  assert.equal(isCmpTicketOperatorOpen({ status: 'Closed', stage: 'Closed' }), false);
  assert.equal(
    isCmpTicketOperatorOpen({
      status: 'Open',
      stage: 'Intake',
      consoleJson: { client_view: { workflow_state: 'closed' } },
    }),
    false,
  );
});

test('ticket-operator-withdraw — protected programme ticket cannot be withdrawn', () => {
  const blocked = validateOperatorWithdrawalTarget('cmo8mjijk0000jl04l1jz0v6d');
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, 'WITHDRAWAL_PROTECTED_TICKET');
});

test('ticket-operator-withdraw — stamps audit note and preserves messages', () => {
  const now = '2026-07-05T12:00:00.000Z';
  const prev = {
    client_view: { workflow_state: 'intake' },
    messages: [{ role: 'user', content: 'hello', ts: '2026-07-05T11:00:00.000Z' }],
  };
  const next = buildOperatorWithdrawalConsoleJson(prev, now);
  assert.equal(next.client_view.workflow_state, 'closed');
  assert.equal(next.client_view.closure.context_note, OPERATOR_WITHDRAWAL_CONTEXT_NOTE);
  assert.equal(next.messages.length, 2);
  assert.match(String(next.messages[1].content), /Withdrawn by operator request/);
});

test('ticket-mutable-guard — denies closed ticket mutations', () => {
  const calls = [];
  const fakeRes = {};
  const fakeDeny = (res, status, error, extra) => {
    calls.push({ res, status, error, extra });
    return { status, error, extra };
  };
  const out = denyIfTicketClosed(fakeRes, { status: 'Closed', stage: 'Closed' }, fakeDeny);
  assert.ok(out);
  assert.equal(calls[0].status, 409);
  assert.equal(calls[0].error, 'TICKET_CLOSED');
});

test('change.js — session gate + create ticket panel + withdraw control', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /const \[sessionReady, setSessionReady\] = useState\(false\)/);
  assert.match(change, /data-testid="lux-change-session-checking"/);
  assert.match(change, /Login required before creating or editing tickets\./);
  assert.match(change, /data-testid="lux-change-create-ticket-panel"/);
  assert.match(change, /data-testid="lux-change-create-ticket-btn"/);
  assert.match(change, /action=ticket-create/);
  assert.match(change, /data-testid="lux-change-withdraw-ticket-btn"/);
  assert.match(change, /action=ticket-withdraw/);
  assert.match(change, /Withdraw \/ Cancel ticket/);
});

test('router.js — ticket-withdraw action registered for tenant sessions', () => {
  const router = readRepo('lib/cmp/router.js');
  assert.match(router, /async function handleTicketWithdraw/);
  assert.match(router, /case 'ticket-withdraw':/);
  assert.match(router, /'ticket-withdraw'/);
  assert.match(router, /cmp\.ticket\.withdrawn/);
  assert.match(router, /denyIfTicketClosed/);
});
