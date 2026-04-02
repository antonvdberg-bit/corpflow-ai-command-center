/**
 * Tenant scope key for automation idempotency and partitioning.
 *
 * @param {unknown} tenantId
 * @returns {string}
 */
export function resolveTenantScope(tenantId) {
  const t = tenantId != null ? String(tenantId).trim() : '';
  return t || 'global';
}
