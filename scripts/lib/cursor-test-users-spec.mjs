/**
 * Canonical non-secret identity spec for Cursor authenticated testing (#696).
 *
 * Passwords are never defined here. Values live only in the operator secret store
 * / protected agent runtime (see docs/runbooks/CURSOR_TEST_USERS_PROVISIONING.md).
 */

/** @typedef {'admin' | 'lux'} CursorTestIdentityKey */

/**
 * Machine-readable labels stored in user_tenant_memberships.notes (tenant row)
 * and echoed in operator docs for the admin row (no notes column on auth_users).
 */
export const CURSOR_TEST_METADATA_LABELS = Object.freeze([
  'TEST_ONLY',
  'NON_HUMAN',
  'CURSOR_AUTOMATION',
]);

export const CURSOR_TEST_MEMBERSHIP_NOTES =
  'TEST_ONLY | NON_HUMAN | CURSOR_AUTOMATION | issue=#696';

/** Secure runtime variable names — document placeholders only; never commit values. */
export const CURSOR_TEST_RUNTIME_ENV = Object.freeze({
  adminUsername: 'CURSOR_TEST_ADMIN_USERNAME',
  adminPassword: 'CURSOR_TEST_ADMIN_PASSWORD',
  luxUsername: 'LUX_SMOKE_USERNAME',
  luxPassword: 'LUX_SMOKE_PASSWORD',
  luxTenantId: 'LUX_SMOKE_TENANT_ID',
  luxBaseUrl: 'LUX_SMOKE_BASE_URL',
  adminLoginBaseUrl: 'CURSOR_TEST_ADMIN_LOGIN_BASE_URL',
});

/**
 * Stable identities adapted to auth_users.username (email-ish, lowercased).
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
  lux: Object.freeze({
    key: 'lux',
    username: 'cursor-test-lux@corpflowai.com',
    level: /** @type {const} */ ('tenant'),
    tenantId: 'luxe-maurice',
    factoryMaster: false,
    role: 'member',
    purpose:
      'Lux /change queue, stage, notes, qualification, shortlist and draft verification on lux.corpflowai.com.',
    loginHostHint: 'https://lux.corpflowai.com/login',
  }),
});

/**
 * @param {string} notes
 * @returns {boolean}
 */
export function membershipNotesMarkCursorTest(notes) {
  const n = String(notes || '');
  return CURSOR_TEST_METADATA_LABELS.every((label) => n.includes(label));
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
  const username = String(row?.username || '')
    .trim()
    .toLowerCase();
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

/**
 * Non-secret summary lines for the CURSOR TEST ACCESS READY packet.
 *
 * @param {{
 *   admin?: { id?: string, username?: string, level?: string, factoryMaster?: boolean, enabled?: boolean } | null,
 *   lux?: { id?: string, username?: string, level?: string, tenantId?: string | null, enabled?: boolean } | null,
 *   luxMembershipNotes?: string | null,
 * }} evidence
 * @returns {string[]}
 */
export function formatCursorTestAccessIdentityLines(evidence) {
  const admin = evidence?.admin || null;
  const lux = evidence?.lux || null;
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
  lines.push(`lux.username=${CURSOR_TEST_IDENTITIES.lux.username}`);
  lines.push(`lux.id=${lux?.id || '(pending_provision)'}`);
  lines.push(`lux.level=${lux?.level || CURSOR_TEST_IDENTITIES.lux.level}`);
  lines.push(`lux.tenant_id=${lux?.tenantId || CURSOR_TEST_IDENTITIES.lux.tenantId}`);
  lines.push(`lux.enabled=${lux ? String(lux.enabled !== false) : '(pending_provision)'}`);
  lines.push(
    `lux.membership.notes_marked=${
      evidence?.luxMembershipNotes != null
        ? String(membershipNotesMarkCursorTest(evidence.luxMembershipNotes))
        : '(pending_provision)'
    }`,
  );
  lines.push(`metadata_labels=${CURSOR_TEST_METADATA_LABELS.join(',')}`);
  return lines;
}
