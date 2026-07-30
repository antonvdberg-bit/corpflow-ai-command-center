/**
 * Stable, non-secret identifiers for Cursor authenticated test access (#696).
 *
 * Usernames follow the existing auth_users emailish convention (lowercased).
 * Labels are encoded in membership notes + automation_events payload because
 * auth_users has no metadata column (no schema change).
 */

export const CURSOR_TEST_LABELS = Object.freeze([
  'TEST_ONLY',
  'NON_HUMAN',
  'CURSOR_AUTOMATION',
]);

export const CURSOR_TEST_LABEL_NOTES =
  'TEST_ONLY|NON_HUMAN|CURSOR_AUTOMATION|#696';

export const CURSOR_TEST_ADMIN = Object.freeze({
  /** Machine-readable handle (issue #696). */
  handle: 'cursor-test-admin',
  /** auth_users.username (emailish). */
  username: 'cursor-test-admin@corpflowai.com',
  level: 'admin',
  /** Least privilege: never factory_master=true for this identity. */
  factoryMaster: false,
  tenantId: null,
  purpose: 'Authenticated CorpFlowAI admin/operator smoke and control-surface verification',
});

export const CURSOR_TEST_LUX = Object.freeze({
  handle: 'cursor-test-lux',
  username: 'cursor-test-lux@corpflowai.com',
  level: 'tenant',
  factoryMaster: false,
  tenantId: 'luxe-maurice',
  membershipRole: 'member',
  purpose: 'Lux /change queue, stage, notes, qualification, shortlist and draft verification',
});

/** Cursor / operator runtime variable names (values never in repo). */
export const CURSOR_TEST_ENV_NAMES = Object.freeze({
  adminUsername: 'CURSOR_TEST_ADMIN_USERNAME',
  adminPassword: 'CURSOR_TEST_ADMIN_PASSWORD',
  adminBaseUrl: 'CURSOR_TEST_ADMIN_BASE_URL',
  luxUsername: 'LUX_SMOKE_USERNAME',
  luxPassword: 'LUX_SMOKE_PASSWORD',
  luxTenantId: 'LUX_SMOKE_TENANT_ID',
  luxBaseUrl: 'LUX_SMOKE_BASE_URL',
});

export const CURSOR_TEST_DEFAULT_URLS = Object.freeze({
  adminBaseUrl: 'https://core.corpflowai.com',
  luxBaseUrl: 'https://lux.corpflowai.com',
});

export const PROVISION_EVENT_TYPE = 'ops.cursor_test_access.provisioned.v1';
export const VERIFY_EVENT_TYPE = 'ops.cursor_test_access.verified.v1';
