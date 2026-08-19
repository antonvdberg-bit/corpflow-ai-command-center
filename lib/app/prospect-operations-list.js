/**
 * Prospect Operations list repository for /api/app/prospects.
 * Fixture in test / proof / no POSTGRES_URL. Read-only leads when configured.
 * Does not invent env vars. Does not expose connection metadata.
 */

import { PrismaClient } from '@prisma/client';

import { cfg } from '../server/runtime-config.js';
import {
  DATA_SOURCE_FIXTURE,
  DATA_SOURCE_LEADS_READ,
  PROSPECT_LIST_TAKE,
  getProspectFixtureById,
  getProspectFixtureRows,
  projectProspectDetail,
  projectProspectLeadRows,
  resolveProspectOperationsDataSource as resolveProspectOperationsDataSourcePure,
  upsertProspectFixtureRow,
} from './prospect-operations-workspace.js';
import { applySharedProspectOperatorPatch } from './prospect-operations-detail.js';

/** @type {PrismaClient | null} */
let defaultPrisma = null;

function getDefaultPrisma() {
  if (!defaultPrisma) defaultPrisma = new PrismaClient();
  return defaultPrisma;
}

/**
 * @param {{
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   postgresUrl?: string,
 * }} [opts]
 * @returns {'fixture'|'leads_read'}
 */
export function resolveProspectOperationsDataSource(opts = {}) {
  return resolveProspectOperationsDataSourcePure({
    ...opts,
    postgresUrl: opts.postgresUrl != null ? opts.postgresUrl : cfg('POSTGRES_URL', ''),
  });
}

/**
 * @param {{
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   prisma?: import('@prisma/client').PrismaClient,
 *   now?: Date,
 * }} [opts]
 * @returns {Promise<{
 *   ok: true,
 *   data_source: string,
 *   prospects: Array<Record<string, unknown>>,
 * } | {
 *   ok: false,
 *   error: string,
 *   data_source: string,
 * }>}
 */
export async function loadProspectOperationsList(opts = {}) {
  const dataSource = resolveProspectOperationsDataSource(opts);
  const now = opts.now instanceof Date ? opts.now : new Date();
  if (dataSource === DATA_SOURCE_FIXTURE) {
    return {
      ok: true,
      data_source: DATA_SOURCE_FIXTURE,
      prospects: projectProspectLeadRows(getProspectFixtureRows(), now),
    };
  }
  try {
    const db = opts.prisma || getDefaultPrisma();
    const rows = await db.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: PROSPECT_LIST_TAKE,
    });
    return {
      ok: true,
      data_source: DATA_SOURCE_LEADS_READ,
      prospects: projectProspectLeadRows(rows, now),
    };
  } catch {
    return {
      ok: false,
      error: 'repository_unavailable',
      data_source: DATA_SOURCE_LEADS_READ,
    };
  }
}

/**
 * @param {{
 *   id: string,
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   prisma?: import('@prisma/client').PrismaClient,
 *   now?: Date,
 * }} opts
 */
export async function loadProspectDetail(opts) {
  const id = String(opts?.id || '').trim();
  const dataSource = resolveProspectOperationsDataSource(opts);
  const now = opts.now instanceof Date ? opts.now : new Date();
  if (!id) {
    return { ok: false, error: 'id_required', http_status: 400, data_source: dataSource };
  }
  if (dataSource === DATA_SOURCE_FIXTURE) {
    const row = getProspectFixtureById(id);
    const prospect = projectProspectDetail(row, now);
    if (!row || !prospect) {
      return { ok: false, error: 'prospect_not_found', http_status: 404, data_source: dataSource };
    }
    return { ok: true, data_source: dataSource, prospect };
  }
  try {
    const db = opts.prisma || getDefaultPrisma();
    const row = await db.lead.findUnique({ where: { id } });
    const prospect = projectProspectDetail(row, now);
    if (!row || !prospect) {
      return { ok: false, error: 'prospect_not_found', http_status: 404, data_source: dataSource };
    }
    return { ok: true, data_source: dataSource, prospect };
  } catch {
    return {
      ok: false,
      error: 'repository_unavailable',
      http_status: 503,
      data_source: DATA_SOURCE_LEADS_READ,
    };
  }
}

/**
 * @param {{
 *   id: string,
 *   patch: Record<string, unknown>,
 *   actorLabel?: string,
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   prisma?: import('@prisma/client').PrismaClient,
 *   now?: Date,
 * }} opts
 */
export async function saveProspectDetail(opts) {
  const id = String(opts?.id || '').trim();
  const dataSource = resolveProspectOperationsDataSource(opts);
  const now = opts.now instanceof Date ? opts.now : new Date();
  const nowIso = now.toISOString();
  if (!id) {
    return { ok: false, error: 'id_required', http_status: 400, data_source: dataSource };
  }
  const actorLabel = String(opts.actorLabel || 'operator').trim() || 'operator';

  if (dataSource === DATA_SOURCE_FIXTURE) {
    const row = getProspectFixtureById(id);
    if (!row) {
      return { ok: false, error: 'prospect_not_found', http_status: 404, data_source: dataSource };
    }
    const applied = applySharedProspectOperatorPatch(row, opts.patch || {}, { actorLabel, nowIso });
    if (!applied.ok) return { ...applied, data_source: dataSource };
    upsertProspectFixtureRow(applied.row);
    const prospect = projectProspectDetail(applied.row, now);
    if (!prospect) {
      return { ok: false, error: 'prospect_not_found', http_status: 404, data_source: dataSource };
    }
    return { ok: true, data_source: dataSource, prospect };
  }

  try {
    const db = opts.prisma || getDefaultPrisma();
    const row = await db.lead.findUnique({ where: { id } });
    if (!row) {
      return { ok: false, error: 'prospect_not_found', http_status: 404, data_source: dataSource };
    }
    const applied = applySharedProspectOperatorPatch(row, opts.patch || {}, { actorLabel, nowIso });
    if (!applied.ok) return { ...applied, data_source: dataSource };
    const data = {
      qualificationJson: applied.row.qualificationJson,
    };
    if (applied.row.status != null && applied.row.status !== row.status) {
      data.status = applied.row.status;
    }
    const saved = await db.lead.update({ where: { id }, data });
    const prospect = projectProspectDetail(saved, now);
    if (!prospect) {
      return { ok: false, error: 'prospect_not_found', http_status: 404, data_source: dataSource };
    }
    return { ok: true, data_source: dataSource, prospect };
  } catch {
    return {
      ok: false,
      error: 'repository_unavailable',
      http_status: 503,
      data_source: DATA_SOURCE_LEADS_READ,
    };
  }
}
