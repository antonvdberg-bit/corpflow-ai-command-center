import test from 'node:test';
import assert from 'node:assert/strict';

import { buildNeedsBrainResponse } from '../lib/server/chat-escalation.js';

test('buildNeedsBrainResponse returns client option + checklist + brief', () => {
  const out = buildNeedsBrainResponse({
    message: 'How do I integrate vendor X?',
    tenant_id: 'luxetest',
    surface: 'tenant',
  });

  assert.equal(out.ok, false);
  assert.equal(out.response_kind, 'needs_brain');
  assert.equal(typeof out.response, 'string');
  assert.equal(out.client_options?.some((o) => o?.kind === 'i_dont_know'), true);
  assert.equal(Array.isArray(out.next_actions), true);
  assert.equal(out.next_actions.length > 0, true);
  assert.equal(typeof out.operator_brief, 'object');
  assert.equal(out.operator_brief?.tenant_id, 'luxetest');
});

