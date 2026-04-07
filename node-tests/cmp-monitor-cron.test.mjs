import test from 'node:test';
import assert from 'node:assert/strict';

import { validateAllowlistedResearchUrl } from '../lib/server/url-allowlist.js';

test('validateAllowlistedResearchUrl is off by default unless env flag enabled', () => {
  const prev = process.env.CORPFLOW_RESEARCH_FETCH_ENABLED;
  process.env.CORPFLOW_RESEARCH_FETCH_ENABLED = 'false';
  const r = validateAllowlistedResearchUrl('https://example.com/');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'research_fetch_disabled');
  process.env.CORPFLOW_RESEARCH_FETCH_ENABLED = prev;
});

