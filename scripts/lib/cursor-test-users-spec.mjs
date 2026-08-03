/**
 * Canonical non-secret identity spec for Cursor authenticated testing (#696).
 *
 * Approved model (Anton follow-up):
 *   - cursor-test-admin@corpflowai.com  — CorpFlowAI admin test access
 *   - cursor-test-tenant@corpflowai.com — generic tenant smoke identity
 *
 * Do NOT provision cursor-test-lux@corpflowai.com (Lux-only) as a live target.
 *
 * Passwords are never defined here. Values live only in the operator secret store
 * / protected agent runtime (see docs/runbooks/CURSOR_TEST_USERS_PROVISIONING.md).
 */

/** @typedef {'admin' | 'tenant'} CursorTestIdentityKey */

/**
 * Machine-readable labels stored in user_tenant_memberships.notes (tenant rows)
 * and echoed in operator docs for the admin row (no notes column on auth_users).
 */
export const CURSOR_TEST_METADATA_LABELS = Object.freeze([
  'TEST_ONLY',
  'NON_HUMAN',
  'CURSOR_AUTOMATION',
]);

export const CURSOR_TEST_MEMBERSHIP_NOTES =
  'TEST_ONLY | NON_HUMAN | CURSOR_AUTOMATION | issue=#696 | generic_tenant_smoke';

/**
 * Lux-only identity from the original #698 tooling — must not be a live provision target.
 * Kept only so tests and operators can reject it explicitly.
 */
export const FORBIDDEN_CURSOR_TEST_USERNAMES = Object.freeze([
  'cursor-test-lux@corpflowai.com',
]);

/**
 * Approved corpflow_test tenants that may receive a membership grant for the
 * generic tenant smoke user. Never auto-grant the full list — only tenants
 * explicitly requested at provision time (default: luxe-maurice).
 */
export const APPROVED_CORPFLOW_TEST_TENANTS = Object.freeze([
  'luxe-maurice',
  'cipc-desk',
]);

export const DEFAULT_TENANT_SMOKE_MEMBERSHIPS = Object.freeze(['luxe-maurice']);

/** Secure runtime variable names — document placeholders only; never commit values. */
export const CURSOR_TEST_RUNTIME_ENV = Object.freeze({
  adminUsername: 'CURSOR_TEST_ADMIN_USERNAME',
  adminPassword: 'CURSOR_TEST_ADMIN_PASSWORD',
  adminLoginBaseUrl: 'CURSOR_TEST_ADMIN_LOGIN_BASE_URL',
  /** Preferred names for the generic tenant smoke identity. */
  tenantUsername: 'TENANT_SMOKE_USERNAME',
  tenantPassword: 'TENANT_SMOKE_PASSWORD',
  tenantPrimaryId: 'TENANT_SMOKE_TENANT_ID',
  tenantBaseUrl: 'TENANT_SMOKE_BASE_URL',
  /**
   * Temporary aliases for scripts that still read LUX_SMOKE_*.
   * Map these to cursor-test-tenant@corpflowai.com — not to a Lux-only user.
   */
  luxAliasUsername: 'LUX_SMOKE_USERNAME',
  luxAliasPassword: 'LUX_SMOKE_PASSWORD',
  luxAliasTenantId: 'LUX_SMOKE_TENANT_ID',
  luxAliasBaseUrl: 'LUX_SMOKE_BASE_URL',
});

/**
 * Stable identities adapted to auth_users.username (email-ish, lowercased).
 *
 * Tenant smoke: auth_users.tenant_id is the primary/home tenant (required by
 * today's login model). Additional approved corpflow_test tenants are granted
 * only via user_tenant_memberships — never auto-grant every tenant.
 *
 * @type {Readonly<Record<CursorTestIdentityKey, {
 *   key: CursorTestIdentityKey,
 *   username: string,
 *   level: 'admin' | 'tenant',
 *   tenantId: string | null,
 *   factoryMaster: boolean,
 *   role: string,
 *   purpose: string,
 *   loginHostHint: string,
 * }>>}
 */
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
  tenant: Object.freeze({
    key: 'tenant',
    username: 'cursor-test-tenant@corpflowai.com',
    level: /** @type {const} */ ('tenant'),
    /** Primary auth_users.tenant_id (login session scope today). */
    tenantId: 'luxe-maurice',
    factoryMaster: false,
    role: 'member',
    purpose:
      'Generic tenant smoke for approved corpflow_test tenants (start: luxe-maurice; later cipc-desk etc.). Not Lux-only.',
    loginHostHint: 'https://lux.corpflowai.com/login',
  }),
});

/**
 * @param {string} username
 * @returns {boolean}
 */
export function isForbiddenCursorTestUsername(username) {
  const u = String(username || '')
    .trim()
    .toLowerCase();
  return FORBIDDEN_CURSOR_TEST_USERNAMES.includes(u);
}

/**
 * @param {string} notes
 * @returns {boolean}
 */
export function membershipNotesMarkCursorTest(notes) {
  const n = String(notes || '');
  return CURSOR_TEST_METADATA_LABELS.every((label) => n.includes(label));
}

/**
 * @param {string | string[] | undefined | null} raw
 * @returns {{ ok: true, tenantIds: string[] } | { ok: false, errors: string[] }}
 */
export function resolveApprovedMembershipTenantIds(raw) {
  /** @type {string[]} */
  let list;
  if (raw == null || raw === '') {
    list = [...DEFAULT_TENANT_SMOKE_MEMBERSHIPS];
  } else if (Array.isArray(raw)) {
    list = raw.map((t) => String(t || '').trim()).filter(Boolean);
  } else {
    list = String(raw)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  if (list.length === 0) {
    return { ok: false, errors: ['membership_tenants_empty'] };
  }
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const out = [];
  for (const tid of list) {
    if (isForbiddenCursorTestUsername(tid)) {
      errors.push(`forbidden_as_tenant_id:${tid}`);
      continue;
    }
    if (!APPROVED_CORPFLOW_TEST_TENANTS.includes(tid)) {
      errors.push(`tenant_not_in_approved_allowlist:${tid}`);
      continue;
    }
    if (!out.includes(tid)) out.push(tid);
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, tenantIds: out };
}

/**
 * Non-secret provision plan used by dry-run and unit tests.
 *
 * @param {{
 *   only?: 'all' | CursorTestIdentityKey,
 *   membershipTenants?: string | string[] | null,
 *   primaryTenantId?: string | null,
 * }} [opts]
 * @returns {{
 *   ok: boolean,
 *   errors: string[],
 *   identities: Array<{
 *     key: CursorTestIdentityKey,
 *     username: string,
 *     level: string,
 *     primaryTenantId: string | null,
 *     membershipTenantIds: string[],
 *     factoryMaster: boolean,
 *   }>,
 *   runtimeEnv: {
 *     adminUsername: string,
 *     adminPassword: string,
 *     tenantUsername: string,
 *     tenantPassword: string,
 *     temporaryLuxAliases: { username: string, password: string },
 *   },
 *   forbiddenUsernames: string[],
 * }}
 */
export function buildCursorTestProvisionPlan(opts = {}) {
  /** @type {string[]} */
  const errors = [];
  const only = opts.only || 'all';
  if (only !== 'all' && only !== 'admin' && only !== 'tenant') {
    errors.push(`invalid_only:${only}`);
  }
  // Explicit rejection of the superseded Lux-only key / username.
  if (String(only).toLowerCase() === 'lux') {
    errors.push(
      'rejected_identity_key:lux — use tenant (cursor-test-tenant@corpflowai.com); do not provision cursor-test-lux@corpflowai.com',
    );
  }

  const membershipRes = resolveApprovedMembershipTenantIds(opts.membershipTenants);
  if (!membershipRes.ok) errors.push(...membershipRes.errors);

  let primary =
    opts.primaryTenantId != null && String(opts.primaryTenantId).trim() !== ''
      ? String(opts.primaryTenantId).trim()
      : membershipRes.ok
        ? membershipRes.tenantIds[0]
        : CURSOR_TEST_IDENTITIES.tenant.tenantId;

  if (membershipRes.ok && !membershipRes.tenantIds.includes(primary)) {
    errors.push(`primary_tenant_not_in_membership_list:${primary}`);
  }
  if (!APPROVED_CORPFLOW_TEST_TENANTS.includes(/** @type {string} */ (primary))) {
    errors.push(`primary_tenant_not_in_approved_allowlist:${primary}`);
  }

  for (const forbidden of FORBIDDEN_CURSOR_TEST_USERNAMES) {
    if (
      CURSOR_TEST_IDENTITIES.admin.username === forbidden ||
      CURSOR_TEST_IDENTITIES.tenant.username === forbidden
    ) {
      errors.push(`canonical_identity_uses_forbidden_username:${forbidden}`);
    }
  }

  /** @type {CursorTestIdentityKey[]} */
  const keys =
    only === 'admin' ? ['admin'] : only === 'tenant' ? ['tenant'] : ['admin', 'tenant'];

  /** @type {Array<{
   *   key: CursorTestIdentityKey,
   *   username: string,
   *   level: string,
   *   primaryTenantId: string | null,
   *   membershipTenantIds: string[],
   *   factoryMaster: boolean,
   * }>} */
  const identities = [];
  for (const key of keys) {
    const spec = CURSOR_TEST_IDENTITIES[key];
    if (isForbiddenCursorTestUsername(spec.username)) {
      errors.push(`plan_targets_forbidden_username:${spec.username}`);
    }
    identities.push({
      key,
      username: spec.username,
      level: spec.level,
      primaryTenantId: key === 'tenant' ? primary : null,
      membershipTenantIds: key === 'tenant' && membershipRes.ok ? membershipRes.tenantIds : [],
      factoryMaster: false,
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    identities,
    runtimeEnv: {
      adminUsername: CURSOR_TEST_RUNTIME_ENV.adminUsername,
      adminPassword: CURSOR_TEST_RUNTIME_ENV.adminPassword,
      tenantUsername: CURSOR_TEST_RUNTIME_ENV.tenantUsername,
      tenantPassword: CURSOR_TEST_RUNTIME_ENV.tenantPassword,
      temporaryLuxAliases: {
        username: CURSOR_TEST_RUNTIME_ENV.luxAliasUsername,
        password: CURSOR_TEST_RUNTIME_ENV.luxAliasPassword,
      },
    },
    forbiddenUsernames: [...FORBIDDEN_CURSOR_TEST_USERNAMES],
  };
}

/**
 * @param {{ username?: string, level?: string, tenantId?: string | null, factoryMaster?: boolean, enabled?: boolean }} row
 * @param {CursorTestIdentityKey} key
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateCursorTestUserRow(row, key) {
  const spec = CURSOR_TEST_IDENTITIES[key];
  const errors = [];
  if (!spec) {
    errors.push(`unknown_identity_key:${key}`);
    return { ok: false, errors };
  }
  if (key === 'lux' || isForbiddenCursorTestUsername(String(row?.username || ''))) {
    errors.push(
      `forbidden_lux_only_identity: use ${CURSOR_TEST_IDENTITIES.tenant.username} (generic tenant smoke)`,
    );
  }
  const username = String(row?.username || '')
    .trim()
    .toLowerCase();
  if (username !== spec.username) errors.push(`username_mismatch:expected=${spec.username}`);
  if (String(row?.level || '').trim().toLowerCase() !== spec.level) {
    errors.push(`level_mismatch:expected=${spec.level}`);
  }
  const tid = row?.tenantId == null || row?.tenantId === '' ? null : String(row.tenantId).trim();
  if (key === 'admin') {
    if (tid !== null) errors.push('tenant_id_mismatch:expected=null');
  } else if (key === 'tenant') {
    if (!tid) {
      errors.push('tenant_id_mismatch:expected=approved_primary');
    } else if (!APPROVED_CORPFLOW_TEST_TENANTS.includes(tid)) {
      errors.push(`tenant_id_not_approved:${tid}`);
    }
  }
  if (Boolean(row?.factoryMaster) !== Boolean(spec.factoryMaster)) {
    errors.push(`factory_master_mismatch:expected=${spec.factoryMaster}`);
  }
  if (row?.enabled === false) errors.push('user_disabled');
  return { ok: errors.length === 0, errors };
}

/**
 * Resolve tenant smoke credentials: prefer TENANT_SMOKE_*, fall back to LUX_SMOKE_* alias.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ username: string, password: string, tenantId: string, baseUrl: string, source: 'TENANT_SMOKE' | 'LUX_SMOKE_ALIAS' | 'DEFAULT' }}
 */
export function resolveTenantSmokeRuntimeEnv(env = process.env) {
  const preferredUser = String(env[CURSOR_TEST_RUNTIME_ENV.tenantUsername] || '').trim();
  const preferredPass = String(env[CURSOR_TEST_RUNTIME_ENV.tenantPassword] || '').trim();
  const aliasUser = String(env[CURSOR_TEST_RUNTIME_ENV.luxAliasUsername] || '').trim();
  const aliasPass = String(env[CURSOR_TEST_RUNTIME_ENV.luxAliasPassword] || '').trim();

  const username =
    preferredUser || aliasUser || CURSOR_TEST_IDENTITIES.tenant.username;
  const password = preferredPass || aliasPass;
  const tenantId =
    String(env[CURSOR_TEST_RUNTIME_ENV.tenantPrimaryId] || '').trim() ||
    String(env[CURSOR_TEST_RUNTIME_ENV.luxAliasTenantId] || '').trim() ||
    CURSOR_TEST_IDENTITIES.tenant.tenantId ||
    'luxe-maurice';
  const baseUrl = (
    String(env[CURSOR_TEST_RUNTIME_ENV.tenantBaseUrl] || '').trim() ||
    String(env[CURSOR_TEST_RUNTIME_ENV.luxAliasBaseUrl] || '').trim() ||
    'https://lux.corpflowai.com'
  ).replace(/\/+$/, '');

  let source = /** @type {'TENANT_SMOKE' | 'LUX_SMOKE_ALIAS' | 'DEFAULT'} */ ('DEFAULT');
  if (preferredUser || preferredPass) source = 'TENANT_SMOKE';
  else if (aliasUser || aliasPass) source = 'LUX_SMOKE_ALIAS';

  return { username, password, tenantId, baseUrl, source };
}

/**
 * Non-secret summary lines for the CURSOR TEST ACCESS READY packet.
 *
 * @param {{
 *   admin?: { id?: string, username?: string, level?: string, factoryMaster?: boolean, enabled?: boolean } | null,
 *   tenant?: { id?: string, username?: string, level?: string, tenantId?: string | null, enabled?: boolean } | null,
 *   tenantMembershipNotes?: string | null,
 *   tenantMembershipTenantIds?: string[] | null,
 * }} evidence
 * @returns {string[]}
 */
export function formatCursorTestAccessIdentityLines(evidence) {
  const admin = evidence?.admin || null;
  const tenant = evidence?.tenant || null;
  const lines = [];
  lines.push(`admin.username=${CURSOR_TEST_IDENTITIES.admin.username}`);
  lines.push(`admin.id=${admin?.id || '(pending_provision)'}`);
  lines.push(`admin.level=${admin?.level || CURSOR_TEST_IDENTITIES.admin.level}`);
  lines.push(
    `admin.factory_master=${
      admin ? String(Boolean(admin.factoryMaster)) : String(CURSOR_TEST_IDENTITIES.admin.factoryMaster)
    }`,
  );
  lines.push(`admin.enabled=${admin ? String(admin.enabled !== false) : '(pending_provision)'}`);
  lines.push(`tenant.username=${CURSOR_TEST_IDENTITIES.tenant.username}`);
  lines.push(`tenant.id=${tenant?.id || '(pending_provision)'}`);
  lines.push(`tenant.level=${tenant?.level || CURSOR_TEST_IDENTITIES.tenant.level}`);
  lines.push(
    `tenant.primary_tenant_id=${tenant?.tenantId || CURSOR_TEST_IDENTITIES.tenant.tenantId}`,
  );
  lines.push(`tenant.enabled=${tenant ? String(tenant.enabled !== false) : '(pending_provision)'}`);
  lines.push(
    `tenant.membership.tenants=${
      evidence?.tenantMembershipTenantIds != null
        ? evidence.tenantMembershipTenantIds.join(',') || '(none)'
        : '(pending_provision)'
    }`,
  );
  lines.push(
    `tenant.membership.notes_marked=${
      evidence?.tenantMembershipNotes != null
        ? String(membershipNotesMarkCursorTest(evidence.tenantMembershipNotes))
        : '(pending_provision)'
    }`,
  );
  lines.push(`metadata_labels=${CURSOR_TEST_METADATA_LABELS.join(',')}`);
  lines.push(`forbidden_usernames=${FORBIDDEN_CURSOR_TEST_USERNAMES.join(',')}`);
  return lines;
}
