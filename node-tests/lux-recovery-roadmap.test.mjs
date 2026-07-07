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
  assert.equal(LUX_RECOVERY_READY_NOW.length, 3);
  assert.equal(LUX_RECOVERY_READY_NOW[0].label, 'Live brand surface');
  assert.equal(LUX_RECOVERY_READY_NOW[1].label, 'Publishing workflow');
  assert.equal(LUX_RECOVERY_READY_NOW[2].label, 'Operator control plane');
  assert.equal(LUX_RECOVERY_RELEASE1_PACKAGES.length, 7);
  assert.equal(LUX_RECOVERY_JAN_MUST_PROVIDE.length, 5);
  assert.deepEqual(
    LUX_RECOVERY_JAN_MUST_PROVIDE.map((x) => x.item),
    ['Homepage images', 'One opportunity', 'Gallery', 'Approvals', 'Editor session'],
  );
  const notMvpLabels = LUX_RECOVERY_NOT_MVP.map((x) => x.label);
  for (const label of ['Drive rebuild', 'IDX', 'Multiple listings', 'Dashboards', 'Automation', 'Broad advanced platform rebuild']) {
    assert.ok(notMvpLabels.includes(label), `missing not-mvp label: ${label}`);
  }
  assert.deepEqual(
    LUX_RECOVERY_48H_PLAN.map((x) => x.step),
    ['Share review', 'Capture confirmation', 'Align scope', 'Request content'],
  );
  assert.equal(luxRecoveryPackageStatusLabel('ready'), 'ready');
  assert.equal(luxRecoveryPackageStatusLabel('in_progress'), 'in progress');
  assert.equal(luxRecoveryPackageStatusLabel('waiting_on_content'), 'waiting on content');
});
