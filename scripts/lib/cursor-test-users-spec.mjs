/**
 * Canonical non-secret identity spec for Cursor authenticated testing (#696).
 *
 * Passwords are never defined here. Values live only in the operator secret store
 * / protected agent runtime (see docs/runbooks/CURSOR_TEST_USERS_PROVISIONING.md).
 */

/** @typedef {'admin' | 'lux'} CursorTestIdentityKey */

export const CURSOR_TEST_METADATA_LABELS = Object.freeze([
  'TEST_ONLY',
  'NON_HUMAN',
  'CURSOR_AUTOMATION',
]);

export const CURSOR_TEST_MEMBERSHIP_NOTES =
  'TEST_ONLY | NON_HUMAN | CURSOR_AUTOMATION | generic_tenant_smoke | issue=#696';

/** Secure runtime variable names — document placeholders only; never commit values. */
export const CURSOR_TEST_RUNTIME_ENV = Object.freeze({
  adminUsername: 'CURSOR_TEST_ADMIN_USERNAME',
  adminPassword: 'CURSOR_TEST_ADMIN_PASSWORD',
  tenantUsername: 'TENANT_SMOKE_USERNAME',
  tenantPassword: 'TENANT_SMOKE_PASSWORD',
  tenantId: 'TENANT_SMOKE_TENANT_ID',
  tenantBaseUrl: 'TENANT_SMOKE_BASE_URL',
  adminLoginBaseUrl: 'CURSOR_TEST_ADMIN_LOGIN_BASE_URL',
  // Temporary backward-compatible property aliases for existing callers only.
  // They resolve to the generic TENANT_SMOKE_* variables and never imply a Lux-only user.
  luxUsername: 'TENANT_SMOKE_USERNAME',
  luxPassword: 'TENANT_SMOKE_PASSWORD',
  luxTenantId: 'TENANT_SMOKE_TENANT_ID',
  luxBaseUrl: 'TENANT_SMOKE_BASE_URL',
});

/** Deprecated external runtime aliases. Do not prefer these for new configuration. */
export const CURSOR_TEST_DEPRECATED_RUNTIME_ALIASES = Object.freeze({
  LUX_SMOKE_USERNAME: 'TENANT_SMOKE_USERNAME',
  LUX_SMOKE_PASSWORD: 'TENANT_SMOKE_PASSWORD',
  LUX_SMOKE_TENANT_ID: 'TENANT_SMOKE_TENANT_ID',
  LUX_SMOKE_BASE_URL: 'TENANT_SMOKE_BASE_URL',
});

export const CURSOR_TEST_IDENTITIES = Object.freeze({
  admin: Object.freeze({
    key: 'admin',
    username: 'cursor-test-admin@corpflowai.com',
    level: /** @type {const} */ ('admin'),
    tenantId: null,
    factoryMaster: false,
    role: 'admin (factory_master=false)',
    purpose:
      'Authenticated CorpFlowAI admin/operator smoke on corpflow_test; not billing/secret/deploy owner.',
    loginHostHint: 'https://core.corpflowai.com/login',
  }),
  // Internal key remains `lux` temporarily so merged scripts keep working without a broad refactor.
  // The live target is the generic tenant smoke identity. Its initial approved membership is Luxe Maurice only.
  lux: Object.freeze({
    key: 'lux',
    username: 'cursor-test-tenant@corpflowai.com',
    level: /** @type {const} */ ('tenant'),
    tenantId: 'luxe-maurice',
    factoryMaster: false,
    role: 'member',
    purpose:
      'Generic tenant smoke identity; membership is granted only to explicitly approved corpflow_test tenants. Initial approved membership: luxe-maurice.',
    loginHostHint: 'https://lux.corpflowai.com/login',
  }),
});

export function membershipNotesMarkCursorTest(notes) {
  const n = String(notes || '');
  return CURSOR_TEST_METADATA_LABELS.every((label) => n.includes(label));
}

export function validateCursorTestUserRow(row, key) {
  const spec = CURSOR_TEST_IDENTITIES[key];
  const errors = [];
  if (!spec) {
    errors.push(`unknown_identity_key:${key}`);
    return { ok: false, errors };
  }
  const username = String(row?.username || '').trim().toLowerCase();
  if (username !== spec.username) errors.push(`username_mismatch:expected=${spec.username}`);
  if (String(row?.level || '').trim().toLowerCase() !== spec.level) {
    errors.push(`level_mismatch:expected=${spec.level}`);
  }
  const tid = row?.tenantId == null || row?.tenantId === '' ? null : String(row.tenantId).trim();
  if (tid !== spec.tenantId) {
    errors.push(`tenant_id_mismatch:expected=${spec.tenantId === null ? 'null' : spec.tenantId}`);
  }
  if (Boolean(row?.factoryMaster) !== Boolean(spec.factoryMaster)) {
    errors.push(`factory_master_mismatch:expected=${spec.factoryMaster}`);
  }
  if (row?.enabled === false) errors.push('user_disabled');
  return { ok: errors.length === 0, errors };
}

export function formatCursorTestAccessIdentityLines(evidence) {
  const admin = evidence?.admin || null;
  const tenant = evidence?.lux || evidence?.tenant || null;
  const membershipNotes = evidence?.luxMembershipNotes ?? evidence?.tenantMembershipNotes;
  const lines = [];
  lines.push(`admin.username=${CURSOR_TEST_IDENTITIES.admin.username}`);
  lines.push(`admin.id=${admin?.id || '(pending_provision)'}`);
  lines.push(`admin.level=${admin?.level || CURSOR_TEST_IDENTITIES.admin.level}`);
  lines.push(`admin.factory_master=${admin ? String(Boolean(admin.factoryMaster)) : String(CURSOR_TEST_IDENTITIES.admin.factoryMaster)}`);
  lines.push(`admin.enabled=${admin ? String(admin.enabled !== false) : '(pending_provision)'}`);
  lines.push(`tenant.username=${CURSOR_TEST_IDENTITIES.lux.username}`);
  lines.push(`tenant.id=${tenant?.id || '(pending_provision)'}`);
  lines.push(`tenant.level=${tenant?.level || CURSOR_TEST_IDENTITIES.lux.level}`);
  lines.push(`tenant.tenant_id=${tenant?.tenantId || CURSOR_TEST_IDENTITIES.lux.tenantId}`);
  lines.push(`tenant.enabled=${tenant ? String(tenant.enabled !== false) : '(pending_provision)'}`);
  lines.push(`tenant.membership.notes_marked=${membershipNotes != null ? String(membershipNotesMarkCursorTest(membershipNotes)) : '(pending_provision)'}`);
  lines.push('tenant.membership_policy=approved_corpflow_test_tenants_only');
  lines.push(`metadata_labels=${CURSOR_TEST_METADATA_LABELS.join(',')}`);
  return lines;
}
