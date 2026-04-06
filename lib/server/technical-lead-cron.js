/**
 * Cron + factory routes for Technical Lead Phase A observer.
 *
 * Cron: GET|POST /api/cron/technical-lead — Authorization: Bearer CORPFLOW_CRON_SECRET (or CRON_SECRET).
 * On Vercel, set CRON_SECRET to the same value as CORPFLOW_CRON_SECRET so scheduled crons receive the Bearer token.
 *
 * Audits: GET /api/factory/technical-lead/audits?ticket_id=… — factory master auth.
 */

import { PrismaClient } from '@prisma/client';

import { timingSafeStringEquals, verifyFactoryMasterAuth } from './factory-master-auth.js';
import { cfg } from './runtime-config.js';
import { runTechnicalLeadObserver } from '../cmp/_lib/technical-lead-observer.js';

const prisma = new PrismaClient();

function firstQuery(query, key) {
  if (!query || typeof query !== 'object') return undefined;
  const v = query[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function readJsonBody(req) {
  if (req.method !== 'POST') return null;
  const chunks = [];
  for await (const ch of req) {
    chunks.push(ch);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ cron: boolean }} mode
 * @returns {Promise<void>}
 */
async function handleTechnicalLeadRun(req, res, mode) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });
  }

  let body = {};
  if (req.method === 'POST') {
    const parsed = await readJsonBody(req);
    if (parsed === null) return res.status(400).json({ error: 'Invalid JSON body' });
    body = parsed || {};
  }

  const limitRaw = firstQuery(req.query, 'limit') ?? body.limit ?? cfg('TECHNICAL_LEAD_LIMIT', '15');
  const limit = Math.min(50, Math.max(1, parseInt(String(limitRaw || '15'), 10) || 15));

  const qTicket = firstQuery(req.query, 'ticket_id');
  const bTicket = body.ticket_id != null ? String(body.ticket_id).trim() : '';
  const ticketIds = [];
  if (qTicket && String(qTicket).trim()) ticketIds.push(String(qTicket).trim());
  if (bTicket) ticketIds.push(bTicket);

  const dryRaw = firstQuery(req.query, 'dry_run') ?? body.dry_run;
  const dryRun =
    dryRaw === true ||
    dryRaw === 'true' ||
    dryRaw === '1' ||
    String(dryRaw || '').toLowerCase() === 'true';

  try {
    const out = await runTechnicalLeadObserver(prisma, {
      limit,
      ticketIds: ticketIds.length ? ticketIds : undefined,
      dryRun,
    });
    return res.status(200).json({
      ok: true,
      ...(mode.cron ? { cron: true } : {}),
      dry_run: dryRun,
      ...out,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ ok: false, error: 'technical_lead_failed', detail: msg.slice(0, 800) });
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export default async function technicalLeadCronHandler(req, res) {
  const secret = String(cfg('CORPFLOW_CRON_SECRET', '') || cfg('CRON_SECRET', '')).trim();
  if (!secret) {
    return res.status(503).json({ error: 'CORPFLOW_CRON_SECRET is not configured.' });
  }
  const authz = String(req.headers?.authorization || '').trim();
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : '';
  if (!token || !timingSafeStringEquals(token, secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return handleTechnicalLeadRun(req, res, { cron: true });
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleTechnicalLeadFactoryMaster(req, res) {
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ error: 'Factory master authentication required.' });
  }
  return handleTechnicalLeadRun(req, res, { cron: false });
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleTechnicalLeadAuditsList(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ error: 'Factory master authentication required.' });
  }

  const ticketId = String(firstQuery(req.query, 'ticket_id') || '').trim();
  if (!ticketId) {
    return res.status(400).json({ error: 'ticket_id query parameter is required' });
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });
  }

  const takeRaw = firstQuery(req.query, 'limit');
  const take = Math.min(100, Math.max(1, parseInt(String(takeRaw || '30'), 10) || 30));

  try {
    const rows = await prisma.technicalLeadAudit.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        ticketId: true,
        checklistVersion: true,
        evidenceJson: true,
        gapsJson: true,
        summaryText: true,
        createdAt: true,
      },
    });
    return res.status(200).json({ ok: true, ticket_id: ticketId, count: rows.length, audits: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/technical_lead_audits|does not exist|Unknown arg/i.test(msg)) {
      return res.status(503).json({
        ok: false,
        error: 'TABLE_MISSING',
        hint: 'Run POST /api/factory/postgres/ensure-schema (factory master) or prisma migrate.',
        detail: msg.slice(0, 400),
      });
    }
    return res.status(500).json({ ok: false, error: 'list_failed', detail: msg.slice(0, 800) });
  }
}
