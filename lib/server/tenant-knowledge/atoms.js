/**
 * Tenant-scoped knowledge atom retrieval (knowledge atoms v1).
 *
 * Future AI/chatbot consumers must use these helpers — never query
 * tenant_knowledge_atoms without tenant_id filter and approval gates.
 */

import { KNOWLEDGE_ATOM_CATEGORIES } from './constants.js';

/** @typedef {'site_preview' | 'chatbot' | 'ai'} KnowledgePurpose */

const SITE_VISIBLE = new Set(['public', 'unlisted']);

/**
 * @param {string} category
 * @returns {boolean}
 */
export function isValidKnowledgeCategory(category) {
  return KNOWLEDGE_ATOM_CATEGORIES.includes(String(category || '').trim());
}

/**
 * Build Prisma `where` clause for approved, current, tenant-scoped knowledge atoms.
 *
 * @param {string} tenantId
 * @param {{
 *   purpose?: KnowledgePurpose;
 *   category?: string;
 *   approvedOnly?: boolean;
 *   now?: Date;
 * }} [options]
 * @returns {object}
 */
export function buildApprovedKnowledgeWhere(tenantId, options = {}) {
  const tid = String(tenantId || '').trim();
  if (!tid) throw new Error('tenant_id_required');

  const purpose = options.purpose || 'site_preview';
  const approvedOnly = options.approvedOnly !== false;
  const now = options.now instanceof Date ? options.now : new Date();
  const category = options.category != null ? String(options.category).trim() : '';

  /** @type {Record<string, unknown>} */
  const where = {
    tenantId: tid,
    visibility: { in: [...SITE_VISIBLE] },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };

  if (approvedOnly) {
    where.approved = true;
  }

  if (category) {
    if (!isValidKnowledgeCategory(category)) {
      throw new Error('invalid_knowledge_category');
    }
    where.category = category;
  }

  if (purpose === 'chatbot') {
    where.chatbotAnswerEligible = true;
  } else if (purpose === 'ai') {
    where.aiAnswerEligible = true;
  }

  return where;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {{
 *   purpose?: KnowledgePurpose;
 *   category?: string;
 *   approvedOnly?: boolean;
 *   now?: Date;
 *   limit?: number;
 * }} [options]
 * @returns {Promise<import('@prisma/client').TenantKnowledgeAtom[]>}
 */
export async function getKnowledgeAtomsForTenant(prisma, tenantId, options = {}) {
  const where = buildApprovedKnowledgeWhere(tenantId, options);
  const limit = Number.isFinite(options.limit) && options.limit > 0
    ? Math.floor(options.limit)
    : undefined;

  return prisma.tenantKnowledgeAtom.findMany({
    where,
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
    ...(limit ? { take: limit } : {}),
  });
}

/**
 * @param {import('@prisma/client').TenantKnowledgeAtom} row
 * @returns {Record<string, unknown>}
 */
export function serializeKnowledgeAtomForProps(row) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    atomKey: row.atomKey,
    title: row.title,
    category: row.category,
    body: row.body,
    summary: row.summary || null,
    sourceType: row.sourceType,
    sourceLabel: row.sourceLabel,
    sourceUrl: row.sourceUrl || null,
    approved: row.approved,
    approvedBy: row.approvedBy || null,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    lastReviewedAt: row.lastReviewedAt ? row.lastReviewedAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    visibility: row.visibility,
    chatbotAnswerEligible: row.chatbotAnswerEligible,
    aiAnswerEligible: row.aiAnswerEligible,
    sensitivity: row.sensitivity,
    tags: row.tagsJson ?? null,
    metadata: row.metadataJson ?? null,
  };
}

/**
 * Compact operator/debug view — title + category only (no full body).
 *
 * @param {ReturnType<typeof serializeKnowledgeAtomForProps>} atom
 * @returns {Record<string, unknown>}
 */
export function serializeKnowledgeAtomSummaryLine(atom) {
  return {
    id: atom.id,
    atomKey: atom.atomKey,
    title: atom.title,
    category: atom.category,
    approved: atom.approved,
    chatbotAnswerEligible: atom.chatbotAnswerEligible,
    aiAnswerEligible: atom.aiAnswerEligible,
  };
}
