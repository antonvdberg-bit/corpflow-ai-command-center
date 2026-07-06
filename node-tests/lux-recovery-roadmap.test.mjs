import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LUX_RECOVERY_RELEASE1_PACKAGES,
  LUX_RECOVERY_RELEASE1_TITLE,
} from '../lib/client/lux-recovery-roadmap-content.js';

test('recovery roadmap content: seven Release 1 packages', () => {
  assert.equal(LUX_RECOVERY_RELEASE1_PACKAGES.length, 7);
  assert.equal(LUX_RECOVERY_RELEASE1_TITLE.includes('First Real Opportunity'), true);
  assert.equal(LUX_RECOVERY_RELEASE1_PACKAGES[0].name, 'Clean public site');
  assert.equal(LUX_RECOVERY_RELEASE1_PACKAGES[6].name, 'Your editor walk-through');
});
