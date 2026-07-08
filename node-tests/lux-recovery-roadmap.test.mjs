import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LUX_RECOVERY_48H_PLAN,
  LUX_RECOVERY_FORBIDDEN_PACKAGE_TITLES,
  LUX_RECOVERY_JAN_MUST_PROVIDE,
  LUX_RECOVERY_NOT_MVP,
  LUX_RECOVERY_PAGE_TITLE,
  LUX_RECOVERY_READY_NOW,
  LUX_RECOVERY_RELEASE1_PACKAGES,
  luxRecoveryPackageStatusLabel,
} from '../lib/client/lux-recovery-roadmap-content.js';

const REQUIRED_PACKAGE_TITLES = [
  'Recovery review page',
  'Operator control in /change',
  'Decision confirmation flow',
  'Client content inputs',
  'Scope lock for first MVP',
  'Jan approval checkpoint',
  'Next build packet',
];

test('recovery roadmap content: recovery-ticket Release 1 packages', () => {
  assert.equal(LUX_RECOVERY_PAGE_TITLE, 'Recovery review');
  assert.equal(LUX_RECOVERY_READY_NOW.length, 3);
  assert.equal(LUX_RECOVERY_READY_NOW[0].label, 'Recovery review page');
  assert.equal(LUX_RECOVERY_READY_NOW[1].label, 'Operator preview access from /change');
  assert.equal(LUX_RECOVERY_READY_NOW[2].label, 'Manual / private decision-link model');
  assert.equal(LUX_RECOVERY_RELEASE1_PACKAGES.length, 7);

  const names = LUX_RECOVERY_RELEASE1_PACKAGES.map((p) => p.name);
  assert.deepEqual(names, REQUIRED_PACKAGE_TITLES);

  for (const forbidden of LUX_RECOVERY_FORBIDDEN_PACKAGE_TITLES) {
    assert.equal(names.includes(forbidden), false, `forbidden package title present: ${forbidden}`);
  }

  assert.equal(LUX_RECOVERY_RELEASE1_PACKAGES[0].status, 'ready');
  assert.equal(LUX_RECOVERY_RELEASE1_PACKAGES[2].status, 'in_progress');
  assert.equal(LUX_RECOVERY_RELEASE1_PACKAGES[5].status, 'waiting_on_confirmation');
  assert.equal(LUX_RECOVERY_RELEASE1_PACKAGES[6].status, 'waiting_on_approval');

  assert.equal(LUX_RECOVERY_JAN_MUST_PROVIDE.length, 4);
  assert.equal(LUX_RECOVERY_JAN_MUST_PROVIDE[0].item, 'Confirm recovery direction');

  const notMvpLabels = LUX_RECOVERY_NOT_MVP.map((x) => x.label);
  for (const label of ['Drive rebuild', 'IDX', 'Multiple listings', 'Dashboards', 'Automation', 'Broad advanced platform rebuild']) {
    assert.ok(notMvpLabels.includes(label), `missing not-mvp label: ${label}`);
  }

  assert.deepEqual(
    LUX_RECOVERY_48H_PLAN.map((x) => x.step),
    [
      'Anton reviews this preview',
      'Jan reviews the roadmap',
      'Jan confirms or requests changes',
      'Next bounded build packet',
    ],
  );

  assert.equal(luxRecoveryPackageStatusLabel('ready'), 'ready');
  assert.equal(luxRecoveryPackageStatusLabel('in_progress'), 'in progress');
  assert.equal(luxRecoveryPackageStatusLabel('waiting_on_content'), 'waiting on content');
  assert.equal(luxRecoveryPackageStatusLabel('waiting_on_confirmation'), 'waiting on confirmation');
  assert.equal(luxRecoveryPackageStatusLabel('waiting_on_approval'), 'waiting on approval');
});
