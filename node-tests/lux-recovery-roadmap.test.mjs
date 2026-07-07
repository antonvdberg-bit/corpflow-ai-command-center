import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LUX_RECOVERY_48H_PLAN,
  LUX_RECOVERY_JAN_MUST_PROVIDE,
  LUX_RECOVERY_NOT_MVP,
  LUX_RECOVERY_PAGE_TITLE,
  LUX_RECOVERY_READY_NOW,
  LUX_RECOVERY_RELEASE1_PACKAGES,
  luxRecoveryPackageStatusLabel,
} from '../lib/client/lux-recovery-roadmap-content.js';

test('recovery roadmap content: required client review sections', () => {
  assert.equal(LUX_RECOVERY_PAGE_TITLE, 'Recovery review');
  assert.ok(LUX_RECOVERY_READY_NOW.length >= 3, 'ready now section');
  assert.equal(LUX_RECOVERY_RELEASE1_PACKAGES.length, 7);
  assert.ok(LUX_RECOVERY_JAN_MUST_PROVIDE.length >= 5, 'jan must provide');
  assert.ok(LUX_RECOVERY_NOT_MVP.length >= 4, 'not mvp');
  assert.equal(LUX_RECOVERY_48H_PLAN.length, 4);
  assert.equal(luxRecoveryPackageStatusLabel('ready'), 'Ready now');
});
