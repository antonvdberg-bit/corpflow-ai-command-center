/**
 * Select fixture vs read-only cmp_tickets repository.
 * Conventions: existing POSTGRES_URL via cfg(); proof/test/no-DB → fixture.
 * Does not invent new env vars. Does not expose credentials/hosts.
 */

import { cfg } from '../server/runtime-config.js';
import {
  DATA_SOURCE_CMP_TICKETS_READ,
  DATA_SOURCE_FIXTURE,
} from './request-repository.js';
import { createFixtureRequestRepository } from './request-repository-fixture.js';
import {
  createPrismaRequestRepository,
  isPostgresConfigured,
} from './request-repository-prisma.js';

/**
 * @param {{
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   forceCmpTicketsRead?: boolean,
 *   nodeEnv?: string,
 *   prisma?: import('@prisma/client').PrismaClient,
 * }} [opts]
 * @returns {'fixture'|'cmp_tickets_read'}
 */
export function resolveRequestDataSource(opts = {}) {
  if (opts.forceFixture === true) return DATA_SOURCE_FIXTURE;
  if (opts.forceCmpTicketsRead === true) return DATA_SOURCE_CMP_TICKETS_READ;

  const nodeEnv = String(opts.nodeEnv ?? process.env.NODE_ENV ?? '').trim();
  if (nodeEnv === 'test') return DATA_SOURCE_FIXTURE;
  if (opts.proofMode === true) return DATA_SOURCE_FIXTURE;

  const url = String(cfg('POSTGRES_URL', '') || '').trim();
  if (!url) return DATA_SOURCE_FIXTURE;
  return DATA_SOURCE_CMP_TICKETS_READ;
}

/**
 * @param {{
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   forceCmpTicketsRead?: boolean,
 *   nodeEnv?: string,
 *   prisma?: import('@prisma/client').PrismaClient,
 * }} [opts]
 */
export function getRequestRepository(opts = {}) {
  const mode = resolveRequestDataSource(opts);
  if (mode === DATA_SOURCE_CMP_TICKETS_READ) {
    return createPrismaRequestRepository(opts.prisma);
  }
  return createFixtureRequestRepository();
}

export {
  DATA_SOURCE_CMP_TICKETS_READ,
  DATA_SOURCE_FIXTURE,
  createFixtureRequestRepository,
  createPrismaRequestRepository,
  isPostgresConfigured,
};
