/**
 * Clients list / summary repository for /api/app/clients (#999).
 * Fixture in test / proof / no POSTGRES_URL. Company Master read when configured.
 * Related prospects reuse the existing Prospect Operations reader.
 * No schema. No ERPNext write. No external send.
 */

import { cfg } from '../server/runtime-config.js';
import { getCompany, listCompanies } from '../server/company-master-service.js';
import { loadProspectOperationsList } from './prospect-operations-list.js';
import {
  DATA_SOURCE_COMPANY_MASTER_READ,
  DATA_SOURCE_FIXTURE,
  fixtureClientRows,
  projectClientSummaries,
  projectClientSummary,
  resolveClientsDataSource as resolveClientsDataSourcePure,
} from './clients-workspace.js';

/**
 * @param {{
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   postgresUrl?: string,
 * }} [opts]
 * @returns {'fixture'|'company_master_read'}
 */
export function resolveClientsDataSource(opts = {}) {
  return resolveClientsDataSourcePure({
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
 * }} [opts]
 * @returns {Promise<{
 *   ok: true,
 *   data_source: string,
 *   clients: Array<Record<string, unknown>>,
 * } | {
 *   ok: false,
 *   error: string,
 *   data_source: string,
 * }>}
 */
export async function loadClientsList(opts = {}) {
  const dataSource = resolveClientsDataSource(opts);
  const prospectsLoaded = await loadProspectOperationsList(opts);
  const prospects = prospectsLoaded.ok ? prospectsLoaded.prospects : [];

  if (dataSource === DATA_SOURCE_FIXTURE) {
    return {
      ok: true,
      data_source: DATA_SOURCE_FIXTURE,
      clients: projectClientSummaries(fixtureClientRows(), prospects),
    };
  }

  try {
    const listed = await listCompanies(opts.prisma ? { prisma: opts.prisma } : {}, {
      limit: 200,
    });
    if (!listed?.ok) {
      return {
        ok: false,
        error: String(listed?.code || 'company_master_unavailable'),
        data_source: DATA_SOURCE_COMPANY_MASTER_READ,
      };
    }
    return {
      ok: true,
      data_source: DATA_SOURCE_COMPANY_MASTER_READ,
      clients: projectClientSummaries(listed.companies || [], prospects),
    };
  } catch {
    return {
      ok: false,
      error: 'company_master_unavailable',
      data_source: DATA_SOURCE_COMPANY_MASTER_READ,
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
 * }} opts
 * @returns {Promise<{
 *   ok: true,
 *   data_source: string,
 *   client: Record<string, unknown>,
 * } | {
 *   ok: false,
 *   error: string,
 *   data_source: string,
 *   http_status: number,
 * }>}
 */
export async function loadClientDetail(opts) {
  const id = String(opts?.id || '').trim();
  const dataSource = resolveClientsDataSource(opts);
  if (!id) {
    return {
      ok: false,
      error: 'id_required',
      data_source: dataSource,
      http_status: 400,
    };
  }

  const prospectsLoaded = await loadProspectOperationsList(opts);
  const prospects = prospectsLoaded.ok ? prospectsLoaded.prospects : [];

  if (dataSource === DATA_SOURCE_FIXTURE) {
    const row = fixtureClientRows().find((client) => String(client.company_id) === id);
    if (!row) {
      return {
        ok: false,
        error: 'client_not_found',
        data_source: DATA_SOURCE_FIXTURE,
        http_status: 404,
      };
    }
    return {
      ok: true,
      data_source: DATA_SOURCE_FIXTURE,
      client: projectClientSummary(row, prospects),
    };
  }

  try {
    const loaded = await getCompany(id, opts.prisma ? { prisma: opts.prisma } : {}, {
      admin: true,
    });
    if (!loaded?.ok || !loaded.company) {
      return {
        ok: false,
        error: loaded?.code === 'COMPANY_NOT_FOUND' ? 'client_not_found' : 'company_master_unavailable',
        data_source: DATA_SOURCE_COMPANY_MASTER_READ,
        http_status: loaded?.status === 404 ? 404 : 503,
      };
    }
    return {
      ok: true,
      data_source: DATA_SOURCE_COMPANY_MASTER_READ,
      client: projectClientSummary(loaded.company, prospects),
    };
  } catch {
    return {
      ok: false,
      error: 'company_master_unavailable',
      data_source: DATA_SOURCE_COMPANY_MASTER_READ,
      http_status: 503,
    };
  }
}
