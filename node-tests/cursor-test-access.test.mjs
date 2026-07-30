/**
 * #696 — Cursor test access identity constants and help surfaces (no DB, no secrets).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import {
  CURSOR_TEST_ADMIN,
  CURSOR_TEST_LUX,
  CURSOR_TEST_LABELS,
  CURSOR_TEST_ENV_NAMES,
  CURSOR_TEST_LABEL_NOTES,
} from '../scripts/lib/cursor-test-access-ids.mjs';

describe('cursor-test-access ids (#696)', () => {
  it('uses stable emailish usernames adapted to auth_users', () => {
    assert.equal(CURSOR_TEST_ADMIN.username, 'cursor-test-admin@corpflowai.com');
    assert.equal(CURSOR_TEST_LUX.username, 'cursor-test-lux@corpflowai.com');
    assert.equal(CURSOR_TEST_ADMIN.level, 'admin');
    assert.equal(CURSOR_TEST_ADMIN.factoryMaster, false);
    assert.equal(CURSOR_TEST_LUX.level, 'tenant');
    assert.equal(CURSOR_TEST_LUX.tenantId, 'luxe-maurice');
  });

  it('encodes TEST_ONLY / NON_HUMAN / CURSOR_AUTOMATION without schema metadata', () => {
    assert.deepEqual(CURSOR_TEST_LABELS, ['TEST_ONLY', 'NON_HUMAN', 'CURSOR_AUTOMATION']);
    assert.match(CURSOR_TEST_LABEL_NOTES, /TEST_ONLY/);
    assert.match(CURSOR_TEST_LABEL_NOTES, /NON_HUMAN/);
    assert.match(CURSOR_TEST_LABEL_NOTES, /CURSOR_AUTOMATION/);
    assert.match(CURSOR_TEST_LABEL_NOTES, /#696/);
  });

  it('documents Cursor runtime env names (values never in repo)', () => {
    assert.equal(CURSOR_TEST_ENV_NAMES.adminUsername, 'CURSOR_TEST_ADMIN_USERNAME');
    assert.equal(CURSOR_TEST_ENV_NAMES.adminPassword, 'CURSOR_TEST_ADMIN_PASSWORD');
    assert.equal(CURSOR_TEST_ENV_NAMES.luxUsername, 'LUX_SMOKE_USERNAME');
    assert.equal(CURSOR_TEST_ENV_NAMES.luxPassword, 'LUX_SMOKE_PASSWORD');
  });
});

describe('cursor-test-access scripts help', () => {
  it('provision --help exits 0 and mentions both identities', () => {
    const r = spawnSync(process.execPath, ['scripts/provision-cursor-test-access.mjs', '--help'], {
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /cursor-test-admin@corpflowai.com/);
    assert.match(r.stdout, /cursor-test-lux@corpflowai.com/);
    assert.match(r.stdout, /factory_master=false/);
    assert.doesNotMatch(r.stdout, /password=\S{8,}/i);
  });

  it('verify --help exits 0 and never implies secret values', () => {
    const r = spawnSync(process.execPath, ['scripts/verify-cursor-test-access.mjs', '--help'], {
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /CURSOR_TEST_ADMIN_/);
    assert.match(r.stdout, /LUX_SMOKE_/);
  });
});
