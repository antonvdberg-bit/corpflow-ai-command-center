/**
 * Tenant-scoped schedule entry retrieval (schedule-source v1).
 *
 * Consumers (site-preview, future chatbot/AI) must use these helpers — never
 * query tenant_schedule_entries without tenant_id filter and approval gates.
 */

/** @typedef {'site_preview' | 'chatbot'} SchedulePurpose */

const SITE_VISIBLE = new Set(['public', 'unlisted']);

/**
 * Build Prisma `where` clause for approved, current, tenant-scoped schedule rows.
 *
 * @param {string} tenantId
 * @param {{ purpose?: SchedulePurpose; now?: Date }} [options]
 * @returns {object}
 */
export function buildApprovedScheduleWhere(tenantId, options = {}) {
  const tid = String(tenantId || '').trim();
  if (!tid) throw new Error('tenant_id_required');
  const purpose = options.purpose || 'site_preview';
  const now = options.now instanceof Date ? options.now : new Date();
  /** @type {Record<string, unknown>} */
  const where = {
    tenantId: tid,
    approved: true,
    visibility: { in: [...SITE_VISIBLE] },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
  if (purpose === 'chatbot') {
    where.chatbotAnswerEligible = true;
  }
  return where;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {{ purpose?: SchedulePurpose; now?: Date; limit?: number }} [options]
 * @returns {Promise<import('@prisma/client').TenantScheduleEntry[]>}
 */
export async function getApprovedScheduleEntriesForTenant(prisma, tenantId, options = {}) {
  const where = buildApprovedScheduleWhere(tenantId, options);
  const limit = Number.isFinite(options.limit) && options.limit > 0
    ? Math.floor(options.limit)
    : undefined;
  return prisma.tenantScheduleEntry.findMany({
    where,
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
    ...(limit ? { take: limit } : {}),
  });
}

/**
 * Map a DB row to a JSON-safe object for Next.js page props.
 *
 * @param {import('@prisma/client').TenantScheduleEntry} row
 * @returns {Record<string, unknown>}
 */
export function serializeScheduleEntryForProps(row) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    category: row.category,
    title: row.title,
    description: row.description || null,
    startsAt: row.startsAt ? row.startsAt.toISOString() : null,
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    recurrence: row.recurrence,
    weeklyDayOfWeek: row.weeklyDayOfWeek ?? null,
    weeklyTime: row.weeklyTime || null,
    locationName: row.locationName || null,
    locationMapUrl: row.locationMapUrl || null,
    ageBand: row.ageBand || null,
    visibility: row.visibility,
    approved: row.approved,
    source: row.source,
    lastReviewedAt: row.lastReviewedAt ? row.lastReviewedAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    chatbotAnswerEligible: row.chatbotAnswerEligible,
  };
}

/**
 * Human-readable schedule line for site-preview list items.
 *
 * @param {ReturnType<typeof serializeScheduleEntryForProps>} entry
 * @returns {string}
 */
export function formatScheduleEntrySubtitle(entry) {
  const parts = [entry.category];
  if (entry.recurrence === 'weekly' && entry.weeklyTime) {
    parts.push(`weekly ${entry.weeklyTime}`);
  } else if (entry.startsAt) {
    parts.push(new Date(entry.startsAt).toISOString().slice(0, 10));
  } else {
    parts.push(String(entry.recurrence || 'once'));
  }
  if (entry.locationName) parts.push(entry.locationName);
  parts.push('approved schedule entry');
  return parts.join(' · ');
}
