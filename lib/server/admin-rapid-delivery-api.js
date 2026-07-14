/**
 * Factory-admin API for CorpFlowAI MUR rapid-delivery discovery prospects.
 *
 * Routes (via factory_router pathSeg):
 *   GET   factory/rapid-delivery/list
 *   GET   factory/rapid-delivery/get?id=
 *   GET   factory/rapid-delivery/proposal?id=
 *   PATCH factory/rapid-delivery/patch
 */

import { PrismaClient } from '@prisma/client';

import {
  RAPID_DELIVERY_PRODUCT,
  buildRapidDeliveryProposalSummary,
  isRapidDeliveryLead,
  leadRowToRapidDeliveryDetail,
  leadRowToRapidDeliveryListItem,
  mergeRapidDeliveryOperatorPatch,
  normalizeRapidDeliveryStatus,
} from '../cmp/_lib/rapid-delivery-operator.js';
import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { getSessionFromRequest } from './session.js';

const prisma = new PrismaClient();
const LIST_SCAN_LIMIT = 500;

prisma.$connect().catch((e) => {
  const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
  // eslint-disable-next-line no-console
  console.warn('[admin-rapid-delivery] Prisma eager $connect failed:', msg);
});

function actorFromReq(req) {
  const sess = getSessionFromRequest(req);
  if (sess?.ok && sess.payload?.email) return String(sess.payload.email);
  if (sess?.ok && sess.payload?.typ === 'admin') return 'admin';
  return 'factory_master';
}

/**
 * @param {{ filters?: { status?: string, offer_slug?: string } }} [opts]
 */
export async function loadRapidDeliveryListData(opts = {}) {
  const filters = opts.filters && typeof opts.filters === 'object' ? opts.filters : {};
  const statusFilter = filters.status ? normalizeRapidDeliveryStatus(String(filters.status)) : '';
  const offerFilter = String(filters.offer_slug || '').trim();

  const rows = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: LIST_SCAN_LIMIT,
    select: {
      id: true,
      tenantId: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      qualificationJson: true,
    },
  });

  let leads = rows.filter(isRapidDeliveryLead).map(leadRowToRapidDeliveryListItem);
  if (statusFilter) {
    leads = leads.filter((l) => l.operator_status === statusFilter);
  }
  if (offerFilter) {
    leads = leads.filter((l) => l.offer_slug === offerFilter);
  }

  return {
    ok: true,
    product: RAPID_DELIVERY_PRODUCT,
    count: leads.length,
    filters: { status: statusFilter || null, offer_slug: offerFilter || null },
    leads,
  };
}

async function handleList(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED', http_status: 405 });
  }
  const url = new URL(req.url || '', 'http://localhost');
  const result = await loadRapidDeliveryListData({
    filters: {
      status: url.searchParams.get('status') || '',
      offer_slug: url.searchParams.get('offer_slug') || '',
    },
  });
  return res.status(200).json(result);
}

async function handleGet(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED', http_status: 405 });
  }
  const url = new URL(req.url || '', 'http://localhost');
  const id = String(url.searchParams.get('id') || '').trim();
  if (!id) {
    return res.status(400).json({ ok: false, error: 'MISSING_ID', http_status: 400 });
  }
  const row = await prisma.lead.findUnique({ where: { id } });
  if (!row || !isRapidDeliveryLead(row)) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', http_status: 404 });
  }
  return res.status(200).json({ ok: true, lead: leadRowToRapidDeliveryDetail(row) });
}

async function handleProposal(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED', http_status: 405 });
  }
  const url = new URL(req.url || '', 'http://localhost');
  const id = String(url.searchParams.get('id') || '').trim();
  if (!id) {
    return res.status(400).json({ ok: false, error: 'MISSING_ID', http_status: 400 });
  }
  const row = await prisma.lead.findUnique({ where: { id } });
  if (!row || !isRapidDeliveryLead(row)) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', http_status: 404 });
  }
  const summary = buildRapidDeliveryProposalSummary(row);
  if (!summary.ok) {
    return res.status(400).json({ ok: false, error: summary.error, http_status: 400 });
  }
  return res.status(200).json(summary);
}

async function handlePatch(req, res) {
  if (req.method !== 'PATCH' && req.method !== 'POST') {
    res.setHeader('Allow', 'PATCH, POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED', http_status: 405 });
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const id = String(body.id || '').trim();
  if (!id) {
    return res.status(400).json({ ok: false, error: 'MISSING_ID', http_status: 400 });
  }
  const row = await prisma.lead.findUnique({ where: { id } });
  if (!row || !isRapidDeliveryLead(row)) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', http_status: 404 });
  }
  const q =
    row.qualificationJson && typeof row.qualificationJson === 'object' && !Array.isArray(row.qualificationJson)
      ? { .../** @type {Record<string, unknown>} */ (row.qualificationJson) }
      : {};
  const nowIso = new Date().toISOString();
  const nextOp = mergeRapidDeliveryOperatorPatch(
    /** @type {Record<string, unknown> | null} */ (q.rapid_delivery_operator),
    {
      status: body.status,
      notes: body.notes,
    },
    nowIso,
    actorFromReq(req),
  );
  q.rapid_delivery_operator = nextOp;

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      qualificationJson: q,
      status: String(nextOp.status) === 'closed' ? 'CLOSED' : row.status || 'NEW_INTAKE',
    },
  });

  return res.status(200).json({ ok: true, lead: leadRowToRapidDeliveryDetail(updated) });
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} pathSeg
 */
export async function adminRapidDeliveryHandler(req, res, pathSeg) {
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(401).json({
      ok: false,
      error: 'UNAUTHORIZED',
      message: 'Factory master or admin session required.',
      http_status: 401,
    });
  }

  const prefix = 'factory/rapid-delivery';
  const route = pathSeg === prefix ? 'list' : pathSeg.slice(prefix.length + 1);

  try {
    if (route === 'list' || route === '') return await handleList(req, res);
    if (route === 'get') return await handleGet(req, res);
    if (route === 'proposal') return await handleProposal(req, res);
    if (route === 'patch') return await handlePatch(req, res);
    return res.status(404).json({
      ok: false,
      error: 'UNKNOWN_ROUTE',
      message: `Unknown rapid-delivery route: ${route}`,
      http_status: 404,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({
      ok: false,
      error: 'RAPID_DELIVERY_FAILED',
      message: msg,
      http_status: 500,
    });
  }
}
