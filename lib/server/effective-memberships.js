/**
 * Multi-tenant membership helper — read-only computation of the effective tenant set
 * for a given user. Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md
 * §2.3 (membership matrix), §2.6 (factory_master expansion).
 *
 * IM-2 (2026-06-15) — no production code path consumes this helper yet. It is read by
 * the new GET /api/membership/effective + GET /api/membership/list endpoints
 * (Core-host-only) and exercised in node-tests/user-tenant-membership-tampering.test.mjs.
 *
 * Design rules respected (per the credential doc + IM-2 guardrails):
 *
 * 1. The helper NEVER widens beyond auth_users.user_tenant_memberships + the optional
 *    factory_master expansion. There is no implicit "every admin sees every tenant"
 *    fallback.
 *
 * 2. The factory_master expansion is admins-only by deliberate, defensive design:
 *    even though IM-1's auth_users_factory_master_admin_only CHECK constraint enforces
 *    this at the DB level, this helper re-checks `level === 'admin' && enabled === true`
 *    in JS so bad test data, legacy data, or a future DB-level mistake cannot bypass
 *    the rule.
 *
 * 3. The factory_master expansion is bounded to tenants where tenant_status='Active'.
 *    Inactive / archived tenants never appear in the effective set, even for factory_master.
 *
 * 4. Returned shape always tags each membership with source='explicit'|'factory_master'
 *    so future audit / picker code can distinguish "this user is bound to this tenant
 *    via a real grant" vs "this user sees this tenant because they are factory_master".
 *
 * 5. There is no caching. Every call recomputes — IM-5 / IM-6 session and CMP layers
 *    can call this on every request without worrying about a stale view of revocations.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @typedef {{
 *   tenant_id: string,
 *   tenant_name: string | null,
 *   tenant_status: string | null,
 *   role: string,
 *   capability: string | null,
 *   source: 'explicit' | 'factory_master',
 * }} EffectiveMembership
 *
 * @typedef {{
 *   user_id: string,
 *   username: string | null,
 *   level: 'admin' | 'tenant' | null,
 *   enabled: boolean,
 *   factory_master: boolean,
 *   memberships: EffectiveMembership[],
 *   not_found: boolean,
 * }} EffectiveMembershipResult
 */

/**
 * Compute the effective set of tenants visible to a given auth_users row.
 *
 * Pass `{ prismaClient }` to inject a fake Prisma client for tests; production
 * callers omit it and reuse the module-scoped client.
 *
 * @param {string} userId  auth_users.id
 * @param {{ prismaClient?: any }} [opts]
 * @returns {Promise<EffectiveMembershipResult>}
 */
export async function getEffectiveMemberships(userId, opts = {}) {
  const client = opts.prismaClient || prisma;
  const id = String(userId || '').trim();

  /** @type {EffectiveMembershipResult} */
  const blank = {
    user_id: id,
    username: null,
    level: null,
    enabled: false,
    factory_master: false,
    memberships: [],
    not_found: true,
  };

  if (!id) {
    return blank;
  }

  const user = await client.authUser.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      level: true,
      enabled: true,
      factoryMaster: true,
    },
  });

  if (!user) {
    return blank;
  }

  const level = user.level === 'admin' || user.level === 'tenant' ? user.level : null;
  const enabled = user.enabled === true;
  const factoryMasterEligible = user.factoryMaster === true && level === 'admin' && enabled === true;

  /** @type {EffectiveMembership[]} */
  const explicit = enabled
    ? (
        await client.userTenantMembership.findMany({
          where: {
            userId: id,
            enabled: true,
            revokedAt: null,
            disabledAt: null,
          },
          select: {
            tenantId: true,
            role: true,
            capability: true,
          },
          orderBy: { tenantId: 'asc' },
        })
      ).map((row) => ({
        tenant_id: row.tenantId,
        tenant_name: null,
        tenant_status: null,
        role: row.role,
        capability: row.capability,
        source: /** @type {const} */ ('explicit'),
      }))
    : [];

  /** @type {EffectiveMembership[]} */
  let factoryMasterMemberships = [];
  if (factoryMasterEligible) {
    const activeTenants = await client.tenant.findMany({
      where: { tenantStatus: 'Active' },
      select: { tenantId: true, name: true },
      orderBy: { tenantId: 'asc' },
    });
    const explicitTenantIds = new Set(explicit.map((m) => m.tenant_id));
    factoryMasterMemberships = activeTenants
      .filter((t) => !explicitTenantIds.has(t.tenantId))
      .map((t) => ({
        tenant_id: t.tenantId,
        tenant_name: t.name || null,
        tenant_status: 'Active',
        role: 'factory_master',
        capability: null,
        source: /** @type {const} */ ('factory_master'),
      }));
  }

  const explicitTenantIds = explicit.map((m) => m.tenant_id);
  let explicitWithMeta = explicit;
  if (explicitTenantIds.length > 0) {
    const rows = await client.tenant.findMany({
      where: { tenantId: { in: explicitTenantIds } },
      select: { tenantId: true, name: true, tenantStatus: true },
    });
    const lookup = new Map(rows.map((r) => [r.tenantId, r]));
    explicitWithMeta = explicit.map((m) => {
      const meta = lookup.get(m.tenant_id);
      return {
        ...m,
        tenant_name: meta?.name || null,
        tenant_status: meta?.tenantStatus || null,
      };
    });
  }

  const memberships = [...explicitWithMeta, ...factoryMasterMemberships].sort((a, b) =>
    a.tenant_id.localeCompare(b.tenant_id),
  );

  return {
    user_id: user.id,
    username: user.username || null,
    level,
    enabled,
    factory_master: factoryMasterEligible,
    memberships,
    not_found: false,
  };
}
