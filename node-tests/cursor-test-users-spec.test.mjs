import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  APPROVED_CORPFLOW_TEST_TENANTS,
  CURSOR_TEST_IDENTITIES,
  CURSOR_TEST_MEMBERSHIP_NOTES,
  CURSOR_TEST_METADATA_LABELS,
  CURSOR_TEST_RUNTIME_ENV,
  FORBIDDEN_CURSOR_TEST_USERNAMES,
  buildCursorTestProvisionPlan,
  formatCursorTestAccessIdentityLines,
  isForbiddenCursorTestUsername,
  membershipNotesMarkCursorTest,
  resolveApprovedMembershipTenantIds,
  resolveTenantSmokeRuntimeEnv,
  validateCursorTestUserRow,
} from '../scripts/lib/cursor-test-users-spec.mjs';

describe('cursor-test-users-spec (#696 generic tenant smoke)', () => {
  it('defines stable admin + generic tenant usernames with least-privilege defaults', () => {
    assert.equal(CURSOR_TEST_IDENTITIES.admin.username, 'cursor-test-admin@corpflowai.com');
    assert.equal(CURSOR_TEST_IDENTITIES.admin.level, 'admin');
    assert.equal(CURSOR_TEST_IDENTITIES.admin.tenantId, null);
    assert.equal(CURSOR_TEST_IDENTITIES.admin.factoryMaster, false);

    assert.equal(CURSOR_TEST_IDENTITIES.tenant.username, 'cursor-test-tenant@corpflowai.com');
    assert.equal(CURSOR_TEST_IDENTITIES.tenant.level, 'tenant');
    assert.equal(CURSOR_TEST_IDENTITIES.tenant.tenantId, 'luxe-maurice');
    assert.equal(CURSOR_TEST_IDENTITIES.tenant.factoryMaster, false);
    assert.equal(CURSOR_TEST_IDENTITIES.lux, undefined);
  });

  it('rejects cursor-test-lux as a live / canonical target', () => {
    assert.ok(FORBIDDEN_CURSOR_TEST_USERNAMES.includes('cursor-test-lux@corpflowai.com'));
    assert.equal(isForbiddenCursorTestUsername('cursor-test-lux@corpflowai.com'), true);
    assert.equal(isForbiddenCursorTestUsername('cursor-test-tenant@corpflowai.com'), false);
    assert.notEqual(
      CURSOR_TEST_IDENTITIES.tenant.username,
      'cursor-test-lux@corpflowai.com',
    );
    for (const id of Object.values(CURSOR_TEST_IDENTITIES)) {
      assert.notEqual(id.username, 'cursor-test-lux@corpflowai.com');
    }
  });

  it('buildCursorTestProvisionPlan targets admin + cursor-test-tenant only', () => {
    const plan = buildCursorTestProvisionPlan();
    assert.equal(plan.ok, true);
    assert.deepEqual(
      plan.identities.map((i) => i.username),
      ['cursor-test-admin@corpflowai.com', 'cursor-test-tenant@corpflowai.com'],
    );
    assert.ok(!plan.identities.some((i) => i.username === 'cursor-test-lux@corpflowai.com'));
    assert.deepEqual(plan.identities.find((i) => i.key === 'tenant')?.membershipTenantIds, [
      'luxe-maurice',
    ]);
    assert.equal(plan.runtimeEnv.tenantUsername, 'TENANT_SMOKE_USERNAME');
    assert.equal(plan.runtimeEnv.tenantPassword, 'TENANT_SMOKE_PASSWORD');
    assert.equal(plan.runtimeEnv.temporaryLuxAliases.username, 'LUX_SMOKE_USERNAME');
  });

  it('buildCursorTestProvisionPlan rejects --only=lux and unapproved tenants', () => {
    const luxKey = buildCursorTestProvisionPlan({ only: /** @type {any} */ ('lux') });
    assert.equal(luxKey.ok, false);
    assert.ok(luxKey.errors.some((e) => e.includes('rejected_identity_key:lux')));

    const badTenant = buildCursorTestProvisionPlan({
      membershipTenants: 'not-a-real-tenant',
    });
    assert.equal(badTenant.ok, false);
    assert.ok(badTenant.errors.some((e) => e.includes('tenant_not_in_approved_allowlist')));
  });

  it('allows additional approved memberships without auto-granting the full allowlist', () => {
    assert.ok(APPROVED_CORPFLOW_TEST_TENANTS.includes('cipc-desk'));
    const plan = buildCursorTestProvisionPlan({
      only: 'tenant',
      membershipTenants: 'luxe-maurice,cipc-desk',
    });
    assert.equal(plan.ok, true);
    assert.deepEqual(plan.identities[0].membershipTenantIds, ['luxe-maurice', 'cipc-desk']);

    const defaultPlan = buildCursorTestProvisionPlan({ only: 'tenant' });
    assert.deepEqual(defaultPlan.identities[0].membershipTenantIds, ['luxe-maurice']);
    assert.ok(
      defaultPlan.identities[0].membershipTenantIds.length < APPROVED_CORPFLOW_TEST_TENANTS.length,
    );
  });

  it('documents preferred TENANT_SMOKE_* env names with temporary LUX_SMOKE_* aliases', () => {
    assert.equal(CURSOR_TEST_RUNTIME_ENV.adminUsername, 'CURSOR_TEST_ADMIN_USERNAME');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.adminPassword, 'CURSOR_TEST_ADMIN_PASSWORD');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.tenantUsername, 'TENANT_SMOKE_USERNAME');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.tenantPassword, 'TENANT_SMOKE_PASSWORD');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.luxAliasUsername, 'LUX_SMOKE_USERNAME');
    assert.equal(CURSOR_TEST_RUNTIME_ENV.luxAliasPassword, 'LUX_SMOKE_PASSWORD');
  });

  it('resolveTenantSmokeRuntimeEnv prefers TENANT_SMOKE_* over LUX_SMOKE_* alias', () => {
    const preferred = resolveTenantSmokeRuntimeEnv({
      TENANT_SMOKE_USERNAME: 'cursor-test-tenant@corpflowai.com',
      TENANT_SMOKE_PASSWORD: 'from-tenant',
      LUX_SMOKE_USERNAME: 'ignored@example.com',
      LUX_SMOKE_PASSWORD: 'from-lux-alias',
    });
    assert.equal(preferred.source, 'TENANT_SMOKE');
    assert.equal(preferred.username, 'cursor-test-tenant@corpflowai.com');
    assert.equal(preferred.password, 'from-tenant');

    const alias = resolveTenantSmokeRuntimeEnv({
      LUX_SMOKE_USERNAME: 'cursor-test-tenant@corpflowai.com',
      LUX_SMOKE_PASSWORD: 'from-lux-alias',
    });
    assert.equal(alias.source, 'LUX_SMOKE_ALIAS');
    assert.equal(alias.username, 'cursor-test-tenant@corpflowai.com');
  });

  it('marks membership notes with TEST_ONLY / NON_HUMAN / CURSOR_AUTOMATION', () => {
    assert.ok(membershipNotesMarkCursorTest(CURSOR_TEST_MEMBERSHIP_NOTES));
    for (const label of CURSOR_TEST_METADATA_LABELS) {
      assert.ok(CURSOR_TEST_MEMBERSHIP_NOTES.includes(label));
    }
    assert.equal(membershipNotesMarkCursorTest('member only'), false);
  });

  it('validateCursorTestUserRow accepts matching rows and rejects privilege / lux-only drift', () => {
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

    const tenantOk = validateCursorTestUserRow(
      {
        username: 'cursor-test-tenant@corpflowai.com',
        level: 'tenant',
        tenantId: 'luxe-maurice',
        factoryMaster: false,
        enabled: true,
      },
      'tenant',
    );
    assert.equal(tenantOk.ok, true);

    const luxOnly = validateCursorTestUserRow(
      {
        username: 'cursor-test-lux@corpflowai.com',
        level: 'tenant',
        tenantId: 'luxe-maurice',
        factoryMaster: false,
        enabled: true,
      },
      'tenant',
    );
    assert.equal(luxOnly.ok, false);
    assert.ok(luxOnly.errors.some((e) => e.includes('forbidden_lux_only') || e.includes('username_mismatch')));

    const unapproved = validateCursorTestUserRow(
      {
        username: 'cursor-test-tenant@corpflowai.com',
        level: 'tenant',
        tenantId: 'someone-else',
        factoryMaster: false,
        enabled: true,
      },
      'tenant',
    );
    assert.equal(unapproved.ok, false);
  });

  it('resolveApprovedMembershipTenantIds defaults to luxe-maurice only', () => {
    const def = resolveApprovedMembershipTenantIds(undefined);
    assert.equal(def.ok, true);
    assert.deepEqual(def.tenantIds, ['luxe-maurice']);
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
      tenant: {
        id: 'cuid_tenant',
        username: 'cursor-test-tenant@corpflowai.com',
        level: 'tenant',
        tenantId: 'luxe-maurice',
        enabled: true,
      },
      tenantMembershipNotes: CURSOR_TEST_MEMBERSHIP_NOTES,
      tenantMembershipTenantIds: ['luxe-maurice'],
    }).join('\n');
    assert.match(lines, /admin\.id=cuid_admin/);
    assert.match(lines, /tenant\.username=cursor-test-tenant@corpflowai.com/);
    assert.match(lines, /tenant\.membership\.notes_marked=true/);
    assert.match(lines, /forbidden_usernames=cursor-test-lux@corpflowai.com/);
    assert.doesNotMatch(lines, /^tenant\.username=cursor-test-lux@/m);
    assert.doesNotMatch(lines, /password/i);
    assert.doesNotMatch(lines, /secret/i);
  });
});
