/**
 * Commercial summary repository for /api/app/commercial (#1004).
 * Reuses the existing Prospect Operations lead reader. No schema.
 * No payment execution. No ERPNext write. No external send.
 */

import { PrismaClient } from '@prisma/client';

import {
  DATA_SOURCE_FIXTURE,
  DATA_SOURCE_LEADS_READ,
  buildCommercialSummaryPayload,
} from './commercial-summary.js';
import {
  PROSPECT_LIST_TAKE,
  getProspectFixtureRows,
} from './prospect-operations-workspace.js';
import { resolveProspectOperationsDataSource } from './prospect-operations-list.js';

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
 *   prisma?: import('@prisma/client').PrismaClient,
 *   now?: Date,
 * }} [opts]
 */
export async function loadCommercialSummaryList(opts = {}) {
  const dataSource = resolveProspectOperationsDataSource(opts);
  const now = opts.now instanceof Date ? opts.now : new Date();
  if (dataSource === DATA_SOURCE_FIXTURE) {
    return {
      ok: true,
      data_source: DATA_SOURCE_FIXTURE,
      leads: getProspectFixtureRows(),
      now,
    };
  }
  try {
    const db = opts.prisma || getDefaultPrisma();
    const leads = await db.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: PROSPECT_LIST_TAKE,
    });
    return {
      ok: true,
      data_source: DATA_SOURCE_LEADS_READ,
      leads,
      now,
    };
  } catch {
    return {
      ok: false,
      error: 'repository_unavailable',
      data_source: DATA_SOURCE_LEADS_READ,
    };
  }
}

export { buildCommercialSummaryPayload, resolveProspectOperationsDataSource };
