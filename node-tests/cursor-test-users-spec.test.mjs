import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
    assert.equal(CURSOR_TEST_IDENTITIES.bad.username, 'cursor-test-bad@corpflowai.com');
    assert.equal(CURSOR_TEST_IDENTITIES.bad.level, 'tenant');
    assert.equal(CURSOR_TEST_IDENTITIES.bad.tenantId, 'cipc-desk');
    assert.equal(CURSOR_TEST_IDENTITIES.bad.factoryMaster, false);
  });

  it('prefers generic tenant runtime env names and exposes Lux aliases as deprecated only', () => {
    assert.equal(CURSOR_TEST_RUNTIME_ENV.adminUsername, 'CURSOR_TEST_ADMIN_USERNAME');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.adminPassword, 'CURSOR_TEST_ADMIN_PASSWORD');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.tenantUsername, 'TENANT_SMOKE_USERNAME');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.tenantPassword, 'TENANT_SMOKE_PASSWORD');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.luxUsername, 'TENANT_SMOKE_USERNAME');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.luxPassword, 'TENANT_SMOKE_PASSWORD');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.badUsername, 'BAD_TEST_BUYER_USERNAME');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.badPassword, 'BAD_TEST_BUYER_PASSWORD');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.badBaseUrl, 'BAD_TEST_BUYER_BASE_URL');
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

  it('accepts only the least-privilege BAD home-tenant shape', () => {
    const bad = validateCursorTestUserRow(
      {
        username: 'cursor-test-bad@corpflowai.com',
        level: 'tenant',
        tenantId: 'cipc-desk',
        factoryMaster: false,
        enabled: true,
      },
      'bad',
    );
    assert.equal(bad.ok, true);

    const privileged = validateCursorTestUserRow(
      {
        username: 'cursor-test-bad@corpflowai.com',
        level: 'tenant',
        tenantId: 'cipc-desk',
        factoryMaster: true,
        enabled: true,
      },
      'bad',
    );
    assert.equal(privileged.ok, false);
    assert.ok(privileged.errors.some((e) => e.includes('factory_master')));

    const wrongHome = validateCursorTestUserRow(
      {
        username: 'cursor-test-bad@corpflowai.com',
        level: 'tenant',
        tenantId: 'luxe-maurice',
        factoryMaster: false,
        enabled: true,
      },
      'bad',
    );
    assert.equal(wrongHome.ok, false);
    assert.ok(wrongHome.errors.some((e) => e.includes('tenant_id_mismatch')));

    const retargetedLux = validateCursorTestUserRow(
      {
        username: 'cursor-test-tenant@corpflowai.com',
        level: 'tenant',
        tenantId: 'cipc-desk',
        factoryMaster: false,
        enabled: true,
      },
      'bad',
    );
    assert.equal(retargetedLux.ok, false);
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
      bad: {
        id: 'cuid_bad',
        username: 'cursor-test-bad@corpflowai.com',
        level: 'tenant',
        tenantId: 'cipc-desk',
        factoryMaster: false,
        enabled: true,
      },
      badMembershipNotes: CURSOR_TEST_MEMBERSHIP_NOTES,
    }).join('\n');
    assert.match(lines, /admin\.id=cuid_admin/);
    assert.match(lines, /tenant\.username=cursor-test-tenant@corpflowai\.com/);
    assert.match(lines, /tenant\.membership\.notes_marked=true/);
    assert.match(lines, /approved_corpflow_test_tenants_only/);
    assert.match(lines, /bad\.tenant_id=cipc-desk/);
    assert.match(lines, /bad\.membership\.notes_marked=true/);
    assert.doesNotMatch(lines, /cursor-test-lux@corpflowai\.com/);
    assert.doesNotMatch(lines, /password/i);
    assert.doesNotMatch(lines, /secret/i);
  });
});

describe('BAD test buyer provision contract (#1531)', () => {
  const source = readFileSync(new URL('../scripts/provision-cursor-test-users.mjs', import.meta.url), 'utf8');

  it('does not rotate the Luxe identity when provisioning BAD, and does not print a BAD password', () => {
    assert.match(source, /args\.only === 'all'[\s\S]*\(\['admin', 'lux'\]\)/);
    assert.match(source, /key !== 'bad' && \(args\.genPassword \|\| args\.dryRun\)/);
    assert.match(source, /args\.genPassword && key !== 'bad'/);
    assert.match(source, /BAD credentials are never generated or printed/);
    assert.doesNotMatch(source, /printWalletCard\(\s*'bad'/);
  });

  it('requires the protected runtime password and refuses to create the BAD tenant row', () => {
    assert.match(source, /CURSOR_TEST_RUNTIME_ENV\.badPassword/);
    assert.match(source, /refusing to create tenant data/);
    assert.match(source, /ensureMembership\(/);
  });
});
