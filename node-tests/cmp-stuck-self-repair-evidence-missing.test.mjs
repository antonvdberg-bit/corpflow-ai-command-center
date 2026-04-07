import test from 'node:test';
import assert from 'node:assert/strict';

import { isStuckSandboxEvidenceMissing } from '../lib/cmp/_lib/cmp-stuck-self-repair.js';

test('isStuckSandboxEvidenceMissing: dispatch ok but no branch/pr evidence => stuck', async () => {
  const row = {
    status: 'Approved',
    stage: 'Build',
    consoleJson: {
      client_view: {
        automation: { dispatch_ok: true },
        promotion: {},
      },
    },
  };
  assert.equal(isStuckSandboxEvidenceMissing(row), true);
});

test('isStuckSandboxEvidenceMissing: dispatch ok and branch_name present => not stuck', async () => {
  const row = {
    status: 'Approved',
    stage: 'Build',
    consoleJson: {
      client_view: {
        automation: { dispatch_ok: true, branch_name: 'cmp/cmn...' },
        promotion: {},
      },
    },
  };
  assert.equal(isStuckSandboxEvidenceMissing(row), false);
});

test('isStuckSandboxEvidenceMissing: dispatch not ok => not stuck by this rule', async () => {
  const row = {
    status: 'Approved',
    stage: 'Build',
    consoleJson: {
      client_view: {
        automation: { dispatch_ok: false },
        promotion: {},
      },
    },
  };
  assert.equal(isStuckSandboxEvidenceMissing(row), false);
});

