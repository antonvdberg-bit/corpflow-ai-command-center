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
  fixtureProspectLeadRows,
  projectProspectLeadRows,
  resolveProspectOperationsDataSource as resolveProspectOperationsDataSourcePure,
} from './prospect-operations-workspace.js';

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
      prospects: projectProspectLeadRows(fixtureProspectLeadRows(), now),
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
