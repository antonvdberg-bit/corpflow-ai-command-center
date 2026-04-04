import { PrismaClient } from '@prisma/client';

/**
 * Resolve tenant_id for an incoming host using Postgres `tenant_hostnames`.
 *
 * @param {string} host
 * @returns {Promise<string | null>}
 */
export async function resolveTenantIdForHostPg(host) {
  const h = String(host || '').trim().toLowerCase().replace(/:\d+$/, '');
  if (!h) return null;
  const prisma = new PrismaClient();
  try {
    const row = await prisma.tenantHostname.findUnique({
      where: { host: h },
      select: { tenantId: true, enabled: true },
    });
    if (!row || row.enabled !== true) return null;
    const tid = String(row.tenantId || '').trim();
    return tid || null;
  } catch {
    return null;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

/**
 * Reads tenant website draft (persona_json.website_draft) if present.
 *
 * @param {string} tenantId
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function readTenantWebsiteDraftPg(tenantId) {
  const tid = String(tenantId || '').trim();
  if (!tid) return null;
  const prisma = new PrismaClient();
  try {
    const row = await prisma.tenantPersona.findUnique({
      where: { tenantId: tid },
      select: { personaJson: true },
    });
    const pj = row?.personaJson && typeof row.personaJson === 'object' ? row.personaJson : null;
    const draft =
      pj && typeof pj === 'object' && pj.website_draft && typeof pj.website_draft === 'object'
        ? pj.website_draft
        : null;
    return draft ? /** @type {Record<string, unknown>} */ (draft) : null;
  } catch {
    return null;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

/**
 * Upserts persona_json.website_draft for a tenant (factory-only endpoints should call this).
 *
 * @param {string} tenantId
 * @param {Record<string, unknown>} websiteDraft
 * @returns {Promise<boolean>}
 */
export async function upsertTenantWebsiteDraftPg(tenantId, websiteDraft) {
  const tid = String(tenantId || '').trim();
  if (!tid) return false;
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.tenantPersona.findUnique({
      where: { tenantId: tid },
      select: { id: true, personaJson: true },
    });
    const prev = existing?.personaJson && typeof existing.personaJson === 'object' ? existing.personaJson : {};
    const next = { ...(prev || {}), website_draft: websiteDraft };
    await prisma.tenantPersona.upsert({
      where: { tenantId: tid },
      create: {
        tenantId: tid,
        tokenCreditBalanceUsd: 0,
        billingExempt: false,
        personaJson: next,
      },
      update: {
        personaJson: next,
      },
    });
    return true;
  } catch {
    return false;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

