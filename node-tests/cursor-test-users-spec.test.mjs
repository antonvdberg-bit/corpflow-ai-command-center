import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CURSOR_TEST_DEPRECATED_RUNTIME_ALIASES,
  CURSOR_TEST_IDENTITIES,
  CURSOR_TEST_MEMBERSHIP_NOTES,
  CURSOR_TEST_METADATA_LABELS,
  CURSOR_TEST_RUNTIME_ENV,
  formatCursorTestAccessIdentityLines,
  membershipNotesMarkCursorTest,
  validateCursorTestUserRow,
} from '../scripts/lib/cursor-test-users-spec.mjs';

describe('cursor-test-users-spec (#696)', () => {
  it('defines the approved admin and generic tenant smoke targets', () => {
    assert.equal(CURSOR_TEST_IDENTITIES.admin.username, 'cursor-test-admin@corpflowai.com');
    assert.equal(CURSOR_TEST_IDENTITIES.admin.level, 'admin');
    assert.equal(CURSOR_TEST_IDENTITIES.admin.tenantId, null);
    assert.equal(CURSOR_TEST_IDENTITIES.admin.factoryMaster, false);

    assert.equal(CURSOR_TEST_IDENTITIES.lux.username, 'cursor-test-tenant@corpflowai.com');
    assert.notEqual(CURSOR_TEST_IDENTITIES.lux.username, 'cursor-test-lux@corpflowai.com');
    assert.equal(CURSOR_TEST_IDENTITIES.lux.level, 'tenant');
    assert.equal(CURSOR_TEST_IDENTITIES.lux.tenantId, 'luxe-maurice');
    assert.equal(CURSOR_TEST_IDENTITIES.lux.factoryMaster, false);
    assert.match(CURSOR_TEST_IDENTITIES.lux.purpose, /approved corpflow_test tenants/i);
  });

  it('prefers generic tenant runtime env names and exposes Lux aliases as deprecated only', () => {
    assert.equal(CURSOR_TEST_RUNTIME_ENV.adminUsername, 'CURSOR_TEST_ADMIN_USERNAME');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.adminPassword, 'CURSOR_TEST_ADMIN_PASSWORD');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.tenantUsername, 'TENANT_SMOKE_USERNAME');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.tenantPassword, 'TENANT_SMOKE_PASSWORD');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.luxUsername, 'TENANT_SMOKE_USERNAME');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.luxPassword, 'TENANT_SMOKE_PASSWORD');
    assert.equal(CURSOR_TEST_DEPRECATED_RUNTIME_ALIASES.LUX_SMOKE_USERNAME, 'TENANT_SMOKE_USERNAME');
    assert.equal(CURSOR_TEST_DEPRECATED_RUNTIME_ALIASES.LUX_SMOKE_PASSWORD, 'TENANT_SMOKE_PASSWORD');
  });

  it('marks membership notes with test-only labels and generic membership intent', () => {
    assert.ok(membershipNotesMarkCursorTest(CURSOR_TEST_MEMBERSHIP_NOTES));
    for (const label of CURSOR_TEST_METADATA_LABELS) {
      assert.ok(CURSOR_TEST_MEMBERSHIP_NOTES.includes(label));
    }
    assert.match(CURSOR_TEST_MEMBERSHIP_NOTES, /generic_tenant_smoke/);
    assert.equal(membershipNotesMarkCursorTest('member only'), false);
  });

  it('accepts the approved tenant row and rejects the former Lux-only live target', () => {
    const tenantOk = validateCursorTestUserRow(
      {
        username: 'cursor-test-tenant@corpflowai.com',
        level: 'tenant',
        tenantId: 'luxe-maurice',
        factoryMaster: false,
        enabled: true,
      },
      'lux',
    );
    assert.equal(tenantOk.ok, true);

    const formerLuxTarget = validateCursorTestUserRow(
      {
        username: 'cursor-test-lux@corpflowai.com',
        level: 'tenant',
        tenantId: 'luxe-maurice',
        factoryMaster: false,
        enabled: true,
      },
      'lux',
    );
    assert.equal(formerLuxTarget.ok, false);
    assert.ok(formerLuxTarget.errors.some((e) => e.includes('username_mismatch')));
  });

  it('keeps admin privilege drift rejected', () => {
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
  });

  it('formats a non-secret generic tenant handoff packet', () => {
    const lines = formatCursorTestAccessIdentityLines({
      admin: {
        id: 'cuid_admin',
        username: 'cursor-test-admin@corpflowai.com',
        level: 'admin',
        factoryMaster: false,
        enabled: true,
      },
      tenant: {
        id: 'cuid_tenant',
        username: 'cursor-test-tenant@corpflowai.com',
        level: 'tenant',
        tenantId: 'luxe-maurice',
        enabled: true,
      },
      tenantMembershipNotes: CURSOR_TEST_MEMBERSHIP_NOTES,
    }).join('\n');
    assert.match(lines, /admin\.id=cuid_admin/);
    assert.match(lines, /tenant\.username=cursor-test-tenant@corpflowai\.com/);
    assert.match(lines, /tenant\.membership\.notes_marked=true/);
    assert.match(lines, /approved_corpflow_test_tenants_only/);
    assert.doesNotMatch(lines, /cursor-test-lux@corpflowai\.com/);
    assert.doesNotMatch(lines, /password/i);
    assert.doesNotMatch(lines, /secret/i);
  });
});
