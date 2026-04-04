/**
 * Change Console file uploads: store bytes in Postgres, serve with ticket-scoped auth.
 *
 * POST JSON /api/change-attachment/upload — { ticket_id, file_name, content_type, data_base64 }
 * GET      /api/change-attachment/list?ticket_id=
 * GET      /api/change-attachment/download?id=
 */

import { PrismaClient } from '@prisma/client';

import { cfg } from './runtime-config.js';
import { getSessionFromRequest } from './session.js';

const prisma = new PrismaClient();

/**
 * @param {import('http').IncomingMessage} req
 * @returns {{ admin: boolean, tenantId: string | null } | null}
 */
function resolveUploadScope(req) {
  const sess = getSessionFromRequest(req);
  if (sess?.ok === true && sess.payload?.typ === 'admin') {
    return { admin: true, tenantId: null };
  }
  if (sess?.ok === true && sess.payload?.typ === 'tenant' && sess.payload?.tenant_id) {
    return { admin: false, tenantId: String(sess.payload.tenant_id).trim() };
  }
  return null;
}

/**
 * @param {{ admin: boolean, tenantId: string | null }} scope
 * @param {string} ticketId
 * @returns {Promise<{ ok: true, row: { tenantId: string | null } } | { ok: false, status: number, error: string }>}
 */
async function assertTicketAccess(scope, ticketId) {
  const row = await prisma.cmpTicket.findUnique({
    where: { id: ticketId },
    select: { tenantId: true },
  });
  if (!row) return { ok: false, status: 404, error: 'Ticket not found' };
  if (scope.admin) return { ok: true, row };
  const rowTid = String(row.tenantId || '').trim();
  const need = scope.tenantId != null ? String(scope.tenantId).trim() : '';
  if (!need || rowTid !== need) {
    return { ok: false, status: 404, error: 'Ticket not found' };
  }
  return { ok: true, row };
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleChangeAttachmentUpload(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const scope = resolveUploadScope(req);
  if (!scope) {
    res.status(401).json({ error: 'LOGIN_REQUIRED', hint: 'Sign in on /change with a tenant or admin session.' });
    return;
  }

  const maxBytes = Math.min(
    Math.max(Number(cfg('CORPFLOW_CHANGE_UPLOAD_MAX_BYTES', '3145728')) || 3145728, 65536),
    20971520,
  );
  const maxFiles = Math.min(Math.max(Number(cfg('CORPFLOW_CHANGE_UPLOAD_MAX_FILES_PER_TICKET', '8')) || 8, 1), 25);

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: 'INVALID_JSON' });
      return;
    }
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'JSON_BODY_REQUIRED' });
    return;
  }

  const ticketId = body.ticket_id != null ? String(body.ticket_id).trim() : '';
  const fileName = body.file_name != null ? String(body.file_name).trim().slice(0, 240) : 'upload.bin';
  const contentType =
    body.content_type != null ? String(body.content_type).trim().slice(0, 160) : 'application/octet-stream';
  const dataB64 = body.data_base64 != null ? String(body.data_base64).trim() : '';

  if (!ticketId) {
    res.status(400).json({ error: 'ticket_id required' });
    return;
  }
  if (!dataB64) {
    res.status(400).json({ error: 'data_base64 required' });
    return;
  }

  const access = await assertTicketAccess(scope, ticketId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const allowRaw = String(cfg('CORPFLOW_CHANGE_UPLOAD_ALLOWED_MIME', 'image/,video/,application/pdf')).trim();
  const allowed = allowRaw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const ctLower = contentType.toLowerCase();
  const mimeOk = allowed.some((p) => {
    if (!p) return false;
    if (p === 'application/pdf') return ctLower === 'application/pdf';
    if (p.endsWith('/')) return ctLower.startsWith(p);
    return ctLower === p;
  });
  if (!mimeOk) {
    res.status(400).json({ error: 'MIME_TYPE_NOT_ALLOWED', content_type: contentType });
    return;
  }

  let buf;
  try {
    const raw = dataB64.includes('base64,') ? dataB64.split('base64,').pop() || '' : dataB64;
    buf = Buffer.from(raw.replace(/\s/g, ''), 'base64');
  } catch {
    res.status(400).json({ error: 'INVALID_BASE64' });
    return;
  }
  if (!buf.length || buf.length > maxBytes) {
    res.status(400).json({ error: 'FILE_TOO_LARGE', max_bytes: maxBytes });
    return;
  }

  const count = await prisma.cmpTicketAttachment.count({ where: { ticketId } });
  if (count >= maxFiles) {
    res.status(400).json({ error: 'TOO_MANY_FILES', max_files: maxFiles });
    return;
  }

  try {
    const created = await prisma.cmpTicketAttachment.create({
      data: {
        ticketId,
        tenantId: access.row.tenantId != null ? String(access.row.tenantId) : null,
        fileName,
        contentType,
        byteSize: buf.length,
        data: buf,
      },
      select: { id: true },
    });
    res.status(200).json({
      ok: true,
      attachment_id: created.id,
      download_url: `/api/change-attachment/download?id=${encodeURIComponent(created.id)}`,
      file_name: fileName,
      content_type: contentType,
      byte_size: buf.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('does not exist') || msg.includes('Unknown model')) {
      res.status(503).json({
        error: 'ATTACHMENTS_TABLE_MISSING',
        hint: 'Run POST /api/factory/postgres/ensure-schema (factory auth) then prisma migrate / db push for CmpTicketAttachment.',
      });
      return;
    }
    res.status(500).json({ error: 'UPLOAD_FAILED', detail: msg.slice(0, 500) });
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleChangeAttachmentList(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const scope = resolveUploadScope(req);
  if (!scope) {
    res.status(401).json({ error: 'LOGIN_REQUIRED' });
    return;
  }
  const ticketId =
    req.query?.ticket_id != null
      ? String(Array.isArray(req.query.ticket_id) ? req.query.ticket_id[0] : req.query.ticket_id).trim()
      : '';
  if (!ticketId) {
    res.status(400).json({ error: 'ticket_id required' });
    return;
  }
  const access = await assertTicketAccess(scope, ticketId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }
  try {
    const rows = await prisma.cmpTicketAttachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, fileName: true, contentType: true, byteSize: true, createdAt: true },
    });
    res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      attachments: rows.map((r) => ({
        id: r.id,
        file_name: r.fileName,
        content_type: r.contentType,
        byte_size: r.byteSize,
        created_at: r.createdAt.toISOString(),
        download_url: `/api/change-attachment/download?id=${encodeURIComponent(r.id)}`,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(503).json({ error: 'LIST_FAILED', detail: msg.slice(0, 300) });
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleChangeAttachmentDownload(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end();
    return;
  }
  const scope = resolveUploadScope(req);
  if (!scope) {
    res.status(401).end();
    return;
  }
  const id =
    req.query?.id != null ? String(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id).trim() : '';
  if (!id) {
    res.status(400).end();
    return;
  }
  try {
    const row = await prisma.cmpTicketAttachment.findUnique({
      where: { id },
      select: { ticketId: true, data: true, contentType: true, fileName: true },
    });
    if (!row) {
      res.status(404).end();
      return;
    }
    const access = await assertTicketAccess(scope, row.ticketId);
    if (!access.ok) {
      res.status(404).end();
      return;
    }
    const buf = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
    const safeName = String(row.fileName || 'file').replace(/[\r\n"]/g, '_');
    res.setHeader('Content-Type', row.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.status(200);
    res.end(buf);
  } catch {
    res.status(500).end();
  }
}
