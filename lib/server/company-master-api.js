/**
 * Company Master HTTP API (#776).
 *
 * Routes (via /api/factory_router?__path=...):
 *   GET    company-master/companies
 *   POST   company-master/companies
 *   GET    company-master/companies/:companyId
 *   PATCH  company-master/companies/:companyId
 *   POST   company-master/artifacts/upload
 *   GET    company-master/artifacts?company_id=
 *   POST   company-master/artifacts/approve
 *   GET    company-master/artifacts/meta?id=
 *   GET    company-master/artifacts/download?id=
 *   GET    company-master/resolve?company_id=&alias=
 *   POST   company-master/synthetic-cleanup
 */

import { PrismaClient } from '@prisma/client';

import { getSessionFromRequest } from './session.js';
import {
  approveArtifact,
  cleanupSyntheticCompanies,
  createCompany,
  getArtifactMeta,
  getCompany,
  listCompanies,
  resolveCurrentArtifact,
  updateCompany,
  uploadArtifact,
} from './company-master-service.js';
import { readCompanyMasterArtifactBytes } from './company-master-storage.js';

const prisma = new PrismaClient();

function json(res, status, body) {
  res.status(status).json(body);
}

function firstQuery(query, key) {
  if (!query || typeof query !== 'object') return undefined;
  const v = query[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return { ok: false, error: 'INVALID_JSON' };
    }
  }
  if (body == null) return { ok: true, body: {} };
  if (typeof body !== 'object') return { ok: false, error: 'JSON_BODY_REQUIRED' };
  return { ok: true, body };
}

/**
 * Company Master is factory-admin only (operator surface).
 * @returns {{ admin: true, tenantId: null, username: string|null } | null}
 */
export function resolveCompanyMasterScope(req) {
  const sess = getSessionFromRequest(req);
  if (sess?.ok === true && sess.payload?.typ === 'admin') {
    return {
      admin: true,
      tenantId: null,
      username: sess.payload.username != null ? String(sess.payload.username) : null,
    };
  }
  return null;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} pathSeg
 */
export async function companyMasterHandler(req, res, pathSeg) {
  const scope = resolveCompanyMasterScope(req);
  if (!scope) {
    return json(res, 401, {
      error: 'LOGIN_REQUIRED',
      hint: 'Sign in as factory admin to use Company Master.',
    });
  }

  const seg = String(pathSeg || '').replace(/^\/+/, '');

  try {
    if (seg === 'company-master/companies' && req.method === 'GET') {
      const result = await listCompanies({ prisma }, {
        tenantId: firstQuery(req.query, 'tenant_id') || undefined,
        syntheticOnly: firstQuery(req.query, 'synthetic') === '1',
      });
      return json(res, 200, result);
    }

    if (seg === 'company-master/companies' && req.method === 'POST') {
      const parsed = parseBody(req);
      if (!parsed.ok) return json(res, 400, { error: parsed.error });
      const result = await createCompany(
        { ...parsed.body, actor: scope.username },
        { prisma },
      );
      if (!result.ok) return json(res, result.status || 400, result);
      return json(res, 201, result);
    }

    const companyMatch = seg.match(/^company-master\/companies\/([^/]+)$/);
    if (companyMatch) {
      const companyId = decodeURIComponent(companyMatch[1]);
      if (req.method === 'GET') {
        const result = await getCompany(companyId, { prisma }, scope);
        if (!result.ok) return json(res, result.status || 404, result);
        return json(res, 200, result);
      }
      if (req.method === 'PATCH') {
        const parsed = parseBody(req);
        if (!parsed.ok) return json(res, 400, { error: parsed.error });
        const result = await updateCompany(
          companyId,
          { ...parsed.body, actor: scope.username },
          { prisma },
          scope,
        );
        if (!result.ok) return json(res, result.status || 400, result);
        return json(res, 200, result);
      }
      res.setHeader('Allow', 'GET, PATCH');
      return json(res, 405, { error: 'Method not allowed' });
    }

    if (seg === 'company-master/artifacts/upload' && req.method === 'POST') {
      const parsed = parseBody(req);
      if (!parsed.ok) return json(res, 400, { error: parsed.error });
      const result = await uploadArtifact(
        { ...parsed.body, actor: scope.username },
        { prisma },
        scope,
      );
      if (!result.ok) return json(res, result.status || 400, result);
      return json(res, 200, result);
    }

    if (seg === 'company-master/artifacts' && req.method === 'GET') {
      const companyId = firstQuery(req.query, 'company_id');
      if (!companyId) return json(res, 400, { error: 'company_id required' });
      const result = await getCompany(String(companyId), { prisma }, scope);
      if (!result.ok) return json(res, result.status || 404, result);
      return json(res, 200, { ok: true, artifacts: result.artifacts });
    }

    if (seg === 'company-master/artifacts/approve' && req.method === 'POST') {
      const parsed = parseBody(req);
      if (!parsed.ok) return json(res, 400, { error: parsed.error });
      const artifactId = parsed.body.artifact_id || parsed.body.id;
      const result = await approveArtifact(artifactId, { prisma }, scope, scope.username);
      if (!result.ok) return json(res, result.status || 400, result);
      return json(res, 200, result);
    }

    if (seg === 'company-master/artifacts/meta' && req.method === 'GET') {
      const id = firstQuery(req.query, 'id');
      const result = await getArtifactMeta(id, { prisma }, scope, {
        authorised_for_restricted: true,
      });
      if (!result.ok) return json(res, result.status || 404, result);
      return json(res, 200, result);
    }

    if (seg === 'company-master/artifacts/download' && req.method === 'GET') {
      const id = firstQuery(req.query, 'id');
      if (!id) return json(res, 400, { error: 'id required' });
      const meta = await getArtifactMeta(id, { prisma }, scope, {
        authorised_for_restricted: true,
      });
      if (!meta.ok) return json(res, meta.status || 404, meta);
      const read = await readCompanyMasterArtifactBytes(prisma, String(id));
      if (!read.ok) return json(res, 404, { error: 'NOT_FOUND' });
      const restricted =
        meta.artifact.sensitivity_classification === 'CONFIDENTIAL' ||
        meta.artifact.sensitivity_classification === 'HIGHLY_RESTRICTED' ||
        meta.artifact.publication_status === 'RESTRICTED';
      res.setHeader('Content-Type', meta.artifact.mime_type || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `${restricted ? 'attachment' : 'inline'}; filename="${String(meta.artifact.original_filename || 'file').replace(/"/g, '')}"`,
      );
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Never expose as a long-lived public URL.
      res.status(200).end(read.bytes);
      return;
    }

    if (seg === 'company-master/resolve' && req.method === 'GET') {
      const companyId = firstQuery(req.query, 'company_id');
      const alias = firstQuery(req.query, 'alias') || firstQuery(req.query, 'logical_alias');
      const restricted = firstQuery(req.query, 'authorised_for_restricted') === '1';
      const result = await resolveCurrentArtifact(
        companyId,
        alias,
        { prisma },
        scope,
        { authorised_for_restricted: restricted },
      );
      if (!result.ok) return json(res, result.status || 404, result);
      return json(res, 200, result);
    }

    if (seg === 'company-master/synthetic-cleanup' && req.method === 'POST') {
      const parsed = parseBody(req);
      if (!parsed.ok) return json(res, 400, { error: parsed.error });
      const result = await cleanupSyntheticCompanies(
        { prisma },
        {
          companyId: parsed.body.company_id,
          companyIdPrefix: parsed.body.prefix || 'cmp_synthetic_',
        },
      );
      return json(res, 200, result);
    }

    return json(res, 404, { error: 'UNKNOWN_COMPANY_MASTER_ROUTE', path: seg });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('does not exist') || msg.includes('Unknown model') || msg.includes('company_master_')) {
      return json(res, 503, {
        error: 'COMPANY_MASTER_SCHEMA_MISSING',
        hint: 'Run POST /api/factory/postgres/ensure-schema (factory auth) or prisma migrate deploy.',
        detail: msg.slice(0, 300),
      });
    }
    return json(res, 500, { error: 'COMPANY_MASTER_FAILED', detail: msg.slice(0, 500) });
  }
}
