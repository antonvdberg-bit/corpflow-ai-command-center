import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CURSOR_TEST_IDENTITIES,
  CURSOR_TEST_MEMBERSHIP_NOTES,
  CURSOR_TEST_METADATA_LABELS,
  CURSOR_TEST_RUNTIME_ENV,
  formatCursorTestAccessIdentityLines,
  membershipNotesMarkCursorTest,
  validateCursorTestUserRow,
} from '../scripts/lib/cursor-test-users-spec.mjs';

describe('cursor-test-users-spec (#696)', () => {
  it('defines stable admin and lux usernames with least-privilege defaults', () => {
    assert.equal(CURSOR_TEST_IDENTITIES.admin.username, 'cursor-test-admin@corpflowai.com');
    assert.equal(CURSOR_TEST_IDENTITIES.admin.level, 'admin');
    assert.equal(CURSOR_TEST_IDENTITIES.admin.tenantId, null);
    assert.equal(CURSOR_TEST_IDENTITIES.admin.factoryMaster, false);

    assert.equal(CURSOR_TEST_IDENTITIES.lux.username, 'cursor-test-lux@corpflowai.com');
    assert.equal(CURSOR_TEST_IDENTITIES.lux.level, 'tenant');
    assert.equal(CURSOR_TEST_IDENTITIES.lux.tenantId, 'luxe-maurice');
    assert.equal(CURSOR_TEST_IDENTITIES.lux.factoryMaster, false);
  });

  it('documents secure runtime env names without values', () => {
    assert.equal(CURSOR_TEST_RUNTIME_ENV.adminUsername, 'CURSOR_TEST_ADMIN_USERNAME');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.adminPassword, 'CURSOR_TEST_ADMIN_PASSWORD');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.luxUsername, 'LUX_SMOKE_USERNAME');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.luxPassword, 'LUX_SMOKE_PASSWORD');
  });

  it('marks membership notes with TEST_ONLY / NON_HUMAN / CURSOR_AUTOMATION', () => {
    assert.ok(membershipNotesMarkCursorTest(CURSOR_TEST_MEMBERSHIP_NOTES));
    for (const label of CURSOR_TEST_METADATA_LABELS) {
      assert.ok(CURSOR_TEST_MEMBERSHIP_NOTES.includes(label));
    }
    assert.equal(membershipNotesMarkCursorTest('member only'), false);
  });

  it('validateCursorTestUserRow accepts matching rows and rejects privilege drift', () => {
    const adminOk = validateCursorTestUserRow(
      {
        username: 'cursor-test-admin@corpflowai.com',
        level: 'admin',
        tenantId: null,
        factoryMaster: false,
        enabled: true,
      },
      'admin',
    );
    assert.equal(adminOk.ok, true);

    const adminBad = validateCursorTestUserRow(
      {
        username: 'cursor-test-admin@corpflowai.com',
        level: 'admin',
        tenantId: null,
        factoryMaster: true,
        enabled: true,
      },
      'admin',
    );
    assert.equal(adminBad.ok, false);
    assert.ok(adminBad.errors.some((e) => e.includes('factory_master')));

    const luxOk = validateCursorTestUserRow(
      {
        username: 'cursor-test-lux@corpflowai.com',
        level: 'tenant',
        tenantId: 'luxe-maurice',
        factoryMaster: false,
        enabled: true,
      },
      'lux',
    );
    assert.equal(luxOk.ok, true);

    const luxOtherTenant = validateCursorTestUserRow(
      {
        username: 'cursor-test-lux@corpflowai.com',
        level: 'tenant',
        tenantId: 'someone-else',
        factoryMaster: false,
        enabled: true,
      },
      'lux',
    );
    assert.equal(luxOtherTenant.ok, false);
  });

  it('formatCursorTestAccessIdentityLines never includes password-like fields', () => {
    const lines = formatCursorTestAccessIdentityLines({
      admin: {
        id: 'cuid_admin',
        username: 'cursor-test-admin@corpflowai.com',
        level: 'admin',
        factoryMaster: false,
        enabled: true,
      },
      lux: {
        id: 'cuid_lux',
        username: 'cursor-test-lux@corpflowai.com',
        level: 'tenant',
        tenantId: 'luxe-maurice',
        enabled: true,
      },
      luxMembershipNotes: CURSOR_TEST_MEMBERSHIP_NOTES,
    }).join('\n');
    assert.match(lines, /admin\.id=cuid_admin/);
    assert.match(lines, /lux\.membership\.notes_marked=true/);
    assert.doesNotMatch(lines, /password/i);
    assert.doesNotMatch(lines, /secret/i);
  });
});
