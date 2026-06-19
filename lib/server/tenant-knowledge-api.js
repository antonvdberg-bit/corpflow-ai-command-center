/**
 * Factory read API for tenant knowledge atoms (operator inspection).
 *
 * GET /api/factory/tenant-knowledge/atoms
 */

import { PrismaClient } from '@prisma/client';

import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import {
  getKnowledgeAtomsForTenant,
  serializeKnowledgeAtomForProps,
  isValidKnowledgeCategory,
} from './tenant-knowledge/atoms.js';

const defaultPrisma = new PrismaClient();

/**
 * @param {Record<string, unknown>} query
 * @param {string} key
 * @returns {string}
 */
function pickQuery(query, key) {
  const v = query?.[key];
  if (Array.isArray(v)) return v[0] != null ? String(v[0]).trim() : '';
  return v != null ? String(v).trim() : '';
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {import('@prisma/client').PrismaClient} [prisma]
 * @returns {Promise<void>}
 */
export async function handleTenantKnowledgeAtomsList(req, res, prisma = defaultPrisma) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ ok: false, error: 'factory_master_required' });
  }

  const q = req.query || {};
  const tenantId = pickQuery(q, 'tenant_id');
  if (!tenantId) {
    return res.status(400).json({ ok: false, error: 'tenant_id_required' });
  }

  const category = pickQuery(q, 'category');
  if (category && !isValidKnowledgeCategory(category)) {
    return res.status(400).json({ ok: false, error: 'invalid_category' });
  }

  const approvedOnlyRaw = pickQuery(q, 'approved_only');
  const approvedOnly = approvedOnlyRaw !== 'false';
  const purposeRaw = pickQuery(q, 'purpose');
  /** @type {'site_preview' | 'chatbot' | 'ai' | undefined} */
  const purpose =
    purposeRaw === 'chatbot' || purposeRaw === 'ai' || purposeRaw === 'site_preview'
      ? purposeRaw
      : undefined;

  const limitRaw = pickQuery(q, 'limit');
  const limit = Math.min(200, Math.max(1, parseInt(String(limitRaw || '100'), 10) || 100));

  try {
    const rows = await getKnowledgeAtomsForTenant(prisma, tenantId, {
      category: category || undefined,
      approvedOnly,
      purpose,
      limit,
    });
    const atoms = rows.map(serializeKnowledgeAtomForProps);
    return res.status(200).json({ ok: true, count: atoms.length, atoms });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('invalid_knowledge_category')) {
      return res.status(400).json({ ok: false, error: 'invalid_category' });
    }
    return res.status(500).json({ ok: false, error: 'knowledge_atoms_list_failed', detail: msg });
  }
}
