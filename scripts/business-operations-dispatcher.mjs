/**
 * Business Operations Dispatcher v1 — CLI + live report builder.
 *
 * @see docs/runbooks/BUSINESS_OPERATIONS_DISPATCHER_V1.md
 */
import { pathToFileURL } from 'node:url';

import {
  buildBusinessOperationsDispatcherReport,
  BUSINESS_OPS_DISPATCHER_SCHEMA,
} from '../lib/server/business-operations-dispatcher.js';
import { buildBusinessOperationsMonitorFixtures } from './business-operations-monitor.mjs';

/**
 * @param {import('./business-operations-monitor.mjs').buildBusinessOperationsMonitorLiveReport extends (...args: any) => Promise<infer R> ? R : never} monitorReport
 */
export function buildDispatcherFromMonitorReport(monitorReport) {
  return buildBusinessOperationsDispatcherReport(monitorReport, {
    evaluated_at: monitorReport?.evaluated_at,
  });
}

/**
 * Synthetic dispatcher report from monitor fixtures.
 */
export function buildBusinessOperationsDispatcherFixtures() {
  const monitor = buildBusinessOperationsMonitorFixtures();
  return buildDispatcherFromMonitorReport(monitor);
}

/**
 * @param {string} [input]
 * @returns {string}
 */
export function resolveBusinessOpsDispatcherUrl(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  const low = s.toLowerCase();
  if (low.includes('/api/factory/business-operations-dispatcher')) return s.replace(/\/+$/, '');
  const base = s.replace(/\/+$/, '');
  if (low.endsWith('/api/factory/business-operations-monitor')) {
    return `${base.slice(0, base.length - '/api/factory/business-operations-monitor'.length)}/api/factory/business-operations-dispatcher`;
  }
  if (low.endsWith('/api/factory/health')) {
    return `${base.slice(0, base.length - '/api/factory/health'.length)}/api/factory/business-operations-dispatcher`;
  }
  return `${base}/api/factory/business-operations-dispatcher`;
}

/**
 * @param {import('@prisma/client').PrismaClient | null | undefined} prisma
 * @param {{ monitorOpts?: object }} [opts]
 */
export async function buildBusinessOperationsDispatcherLiveReport(prisma, opts = {}) {
  const mod = await import('./business-operations-monitor.mjs');
  const monitor = await mod.buildBusinessOperationsMonitorLiveReport(prisma, opts.monitorOpts || {});
  const dispatcher = buildDispatcherFromMonitorReport(monitor);
  return {
    ...dispatcher,
    monitor,
  };
}

async function runCli() {
  if (process.argv.includes('--fixtures')) {
    const report = buildBusinessOperationsDispatcherFixtures();
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  }

  const urlIdx = process.argv.indexOf('--url');
  const explicitUrl = urlIdx >= 0 && process.argv[urlIdx + 1] ? String(process.argv[urlIdx + 1]).trim() : '';
  const { cfg } = await import('../lib/server/runtime-config.js');
  const fromEnv = resolveBusinessOpsDispatcherUrl(
    cfg('CORPFLOW_FACTORY_HEALTH_URL', '') || cfg('FACTORY_HEALTH_URL', ''),
  );
  const url = explicitUrl || fromEnv;

  if (url) {
    const token = String(cfg('CORPFLOW_CRON_SECRET', '') || cfg('CRON_SECRET', '')).trim();
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('Non-JSON response', res.status);
      console.error(text.slice(0, 500));
      process.exit(1);
    }
    console.log(JSON.stringify(json, null, 2));
    const ok = json && typeof json === 'object' && json.schema === BUSINESS_OPS_DISPATCHER_SCHEMA;
    process.exit(ok && res.ok ? 0 : 1);
  }

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const report = await buildBusinessOperationsDispatcherLiveReport(prisma);
    const { monitor, ...dispatcher } = report;
    void monitor;
    console.log(JSON.stringify(dispatcher, null, 2));
    process.exit(dispatcher.ok ? 0 : 1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
