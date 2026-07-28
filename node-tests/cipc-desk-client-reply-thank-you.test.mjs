import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  getCipcDeskClientReplyDraftFromConsoleJson,
  resolveClientDecisionsThankYouMessage,
} from '../lib/cmp/_lib/cipc-desk-client-reply.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('CIPC Desk reply draft is read from client_view.cipc_desk.client_reply_draft', () => {
  const draft = getCipcDeskClientReplyDraftFromConsoleJson({
    client_view: {
      cipc_desk: {
        client_reply_draft: '  FICTIONAL PREVIEW REPLY DRAFT — thank you.  ',
      },
    },
  });
  assert.equal(draft, 'FICTIONAL PREVIEW REPLY DRAFT — thank you.');
});

test('CIPC Desk reply draft parses stringified console_json', () => {
  const draft = getCipcDeskClientReplyDraftFromConsoleJson(
    JSON.stringify({
      client_view: { cipc_desk: { client_reply_draft: 'Draft from string JSON' } },
    }),
  );
  assert.equal(draft, 'Draft from string JSON');
});

test('resolveClientDecisionsThankYouMessage prefers CIPC draft over default', () => {
  const msg = resolveClientDecisionsThankYouMessage(
    {
      client_view: {
        cipc_desk: { client_reply_draft: 'FICTIONAL PREVIEW REPLY DRAFT — operator text' },
      },
    },
    'ticket-1',
    () => 'generic thank you',
  );
  assert.equal(msg, 'FICTIONAL PREVIEW REPLY DRAFT — operator text');
});

test('resolveClientDecisionsThankYouMessage falls back when draft missing', () => {
  const msg = resolveClientDecisionsThankYouMessage({ client_view: {} }, 'ticket-2', (id) => `default for ${id}`);
  assert.equal(msg, 'default for ticket-2');
});

test('submit-client-decisions always attaches thank_you_message (not only magicOk)', () => {
  const p = path.join(repoRoot, 'lib', 'cmp', 'router.js');
  const chunk = fs.readFileSync(p, 'utf8');
  const start = chunk.indexOf('async function handleSubmitClientDecisions');
  assert.ok(start >= 0);
  const end = chunk.indexOf('async function handleClientDecisionsLinkMint', start);
  assert.ok(end > start);
  const fn = chunk.slice(start, end);

  assert.equal(fn.includes('resolveClientDecisionsThankYouMessage'), true);
  // thank_you_message must be part of the success payload object, not solely inside magicOk assign.
  assert.equal(fn.includes('thank_you_message: resolveClientDecisionsThankYouMessage'), true);
  const magicOnlyThankYou = fn.includes(
    "Object.assign(out, {\n        magic_link_completed: true,\n        thank_you_message:",
  );
  assert.equal(magicOnlyThankYou, false, 'thank_you must not be magic-link-only');
});

test('magic gate still validates token when dormant session already passed', () => {
  const p = path.join(repoRoot, 'lib', 'cmp', 'router.js');
  const chunk = fs.readFileSync(p, 'utf8');
  const start = chunk.indexOf('async function assertClientDecisionsMagicOrDormantGate');
  assert.ok(start >= 0);
  const end = chunk.indexOf('function verifyRigorViaPython', start);
  assert.ok(end > start);
  const fn = chunk.slice(start, end);
  assert.equal(fn.includes('const dormantOk = verifyDormantGateCredentials'), true);
  assert.equal(fn.includes('req.corpflowClientDecisionsMagicOk = true'), true);
  // Must not return dormantOk before attempting token validation when token is present.
  assert.equal(
    /if \(verifyDormantGateCredentials\(req, action\)\) \{\s*return true;\s*\}/.test(fn),
    false,
    'must not short-circuit dormant gate before magic token attempt',
  );
});
