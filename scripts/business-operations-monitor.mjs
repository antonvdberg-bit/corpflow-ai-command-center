/**
 * Business Operations Monitor v1 — hosted read-only findings for n8n / schedulers.
 *
 * Library: `buildBusinessOperationsMonitorLiveReport(prisma, opts)`
 * CLI:
 *   node scripts/business-operations-monitor.mjs --fixtures
 *   node scripts/business-operations-monitor.mjs --url https://core.corpflowai.com/api/factory/business-operations-monitor
 *
 * @see docs/runbooks/BUSINESS_OPERATIONS_MONITOR_V1.md
 */
import { pathToFileURL } from 'node:url';
import { Prisma } from '@prisma/client';

import {
  buildBusinessOperationsMonitorReport,
  BUSINESS_OPS_MONITOR_SCHEMA,
} from '../lib/server/business-operations-monitor.js';
import {
  AI_LEAD_RESCUE_PRODUCT,
  isAiLeadRescueLead,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import { cfg } from '../lib/server/runtime-config.js';

const LEAD_SCAN_LIMIT = 500;
const CMP_SCAN_LIMIT = 200;

/**
 * Synthetic rows for local verification — no PII, no production data.
 *
 * @param {Date} now
 */
export function buildBusinessOperationsMonitorFixtures(now = new Date()) {
  const twoHoursAgo = new Date(now.getTime() - 2.5 * 3600000);
  const threeDaysAgo = new Date(now.getTime() - 72 * 3600000);
  const thirtyHoursAgo = new Date(now.getTime() - 30 * 3600000);

  /** @type {import('@prisma/client').Lead[]} */
  const leads = [
    {
      id: 'fixture_lead_new_intake',
      tenantId: 'corpflowai',
      name: 'Synthetic Prospect',
      email: 'synthetic@example.test',
      contact: null,
      message: 'Fixture intake',
      phone: null,
      intent: 'lead-rescue',
      market: null,
      listing: null,
      status: 'NEW_INTAKE',
      qualificationJson: {
        intake_meta: { product: AI_LEAD_RESCUE_PRODUCT, business_name: 'Fixture Co' },
        ai_lead_rescue_operator: { payment_status: 'none', activity: [] },
      },
      score: null,
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
    },
    {
      id: 'fixture_lead_invoice_missing',
      tenantId: 'corpflowai',
      name: 'Synthetic Quote',
      email: 'quote@example.test',
      contact: null,
      message: 'Fixture quote',
      phone: null,
      intent: 'lead-rescue',
      market: null,
      listing: null,
      status: 'QUOTE_SENT',
      qualificationJson: {
        intake_meta: { product: AI_LEAD_RESCUE_PRODUCT, business_name: 'Quote Co' },
        ai_lead_rescue_operator: {
          payment_status: 'quoted',
          invoice_reference: null,
          owner: 'operator',
          activity: [{ at: threeDaysAgo.toISOString(), type: 'intake_reviewed', channel: 'manual' }],
        },
      },
      score: null,
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
    },
    {
      id: 'fixture_lead_setup_window',
      tenantId: 'corpflowai',
      name: 'Synthetic Paid',
      email: 'paid@example.test',
      contact: null,
      message: 'Fixture paid',
      phone: null,
      intent: 'lead-rescue',
      market: null,
      listing: null,
      status: 'SETUP_IN_PROGRESS',
      qualificationJson: {
        intake_meta: { product: AI_LEAD_RESCUE_PRODUCT, business_name: 'Paid Co' },
        ai_lead_rescue_operator: {
          payment_status: 'paid',
          invoice_reference: 'CFLR-FIXTURE-001',
          owner: 'anton',
          activity: [
            {
              at: thirtyHoursAgo.toISOString(),
              type: 'payment_confirmed_manual',
              channel: 'manual',
              status_after: 'PAID_SETUP',
            },
          ],
          setup_checklist: {
            version: 'v1',
            items: {
              intake_reviewed: { state: 'done', updated_at: thirtyHoursAgo.toISOString() },
              payment_invoice_confirmed: { state: 'done', updated_at: thirtyHoursAgo.toISOString() },
            },
          },
        },
      },
      score: null,
      createdAt: thirtyHoursAgo,
      updatedAt: thirtyHoursAgo,
    },
  ];

  /** @type {import('@prisma/client').CmpTicket[]} */
  const cmpTickets = [
    {
      id: 'fixture_ticket_in_review',
      tenantId: 'luxe-maurice',
      description: 'Fixture ticket',
      status: 'Approved',
      stage: 'Build',
      title: 'Fixture change',
      brief: null,
      locale: null,
      consoleJson: { client_view: { workflow_state: 'in_review' } },
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
    },
  ];

  const sources = [
    { name: 'corpflowai_db', ok: true },
    { name: 'erpnext', ok: null, skipped: true },
  ];

  return buildBusinessOperationsMonitorReport({
    leads,
    cmpTickets,
    sources,
    now,
    adminBaseUrl: 'https://core.corpflowai.com',
    changeBaseUrl: 'https://lux.corpflowai.com',
  });
}

/**
 * @param {string} [input]
 * @returns {string}
 */
export function resolveBusinessOpsMonitorUrl(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  const low = s.toLowerCase();
  if (low.includes('/api/factory/business-operations-monitor')) return s.replace(/\/+$/, '');
  const base = s.replace(/\/+$/, '');
  if (low.endsWith('/api/factory/health')) {
    return `${base.slice(0, base.length - '/api/factory/health'.length)}/api/factory/business-operations-monitor`;
  }
  return `${base}/api/factory/business-operations-monitor`;
}

/**
 * @param {import('@prisma/client').PrismaClient | null | undefined} prisma
 * @param {{ adminBaseUrl?: string, changeBaseUrl?: string, pingFactoryHealth?: boolean }} [opts]
 * @returns {Promise<ReturnType<typeof buildBusinessOperationsMonitorReport> & { error?: string }>}
 */
export async function buildBusinessOperationsMonitorLiveReport(prisma, opts = {}) {
  const now = new Date();
  /** @type {Array<{ name: string, ok: boolean | null, skipped?: boolean, error?: string | null }>} */
  const sources = [];

  let leads = [];
  let cmpTickets = [];

  if (!prisma || typeof prisma.lead?.findMany !== 'function') {
    sources.push({ name: 'corpflowai_db', ok: false, error: 'prisma_unavailable' });
  } else {
    try {
      await prisma.$queryRaw(Prisma.sql`SELECT 1`);
      sources.push({ name: 'corpflowai_db', ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      sources.push({ name: 'corpflowai_db', ok: false, error: msg.slice(0, 200) });
    }

    if (sources[sources.length - 1]?.ok) {
      try {
        const rawLeads = await prisma.lead.findMany({
          orderBy: { updatedAt: 'desc' },
          take: LEAD_SCAN_LIMIT,
        });
        leads = rawLeads.filter((row) => isAiLeadRescueLead(row.qualificationJson));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        sources.push({ name: 'corpflowai_leads', ok: false, error: msg.slice(0, 200) });
      }

      try {
        cmpTickets = await prisma.cmpTicket.findMany({
          orderBy: { updatedAt: 'desc' },
          take: CMP_SCAN_LIMIT,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        sources.push({ name: 'corpflowai_cmp', ok: false, error: msg.slice(0, 200) });
      }
    }
  }

  // ERPNext: interface only — never ping live ERPNext from repo code (operator/n8n Stage 2).
  sources.push({ name: 'erpnext', ok: null, skipped: true });

  if (opts.pingFactoryHealth) {
    const healthUrl = resolveBusinessOpsMonitorUrl(
      cfg('CORPFLOW_FACTORY_HEALTH_URL', '') || cfg('FACTORY_HEALTH_URL', ''),
    );
    if (!healthUrl) {
      sources.push({ name: 'factory_health', ok: null, skipped: true });
    } else {
      const pingUrl = healthUrl.includes('business-operations-monitor')
        ? healthUrl.replace('business-operations-monitor', 'health')
        : `${healthUrl.replace(/\/+$/, '')}/api/factory/health`.replace(/\/api\/factory\/api\//, '/api/');
      try {
        const res = await fetch(pingUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
        });
        sources.push({ name: 'factory_health', ok: res.ok });
      } catch (e) {
        const msg = e instanceof Error ? e.name : 'fetch_failed';
        sources.push({ name: 'factory_health', ok: false, error: msg });
      }
    }
  }

  const adminBase =
    opts.adminBaseUrl ||
    String(cfg('CORPFLOW_PUBLIC_BASE_URL', '') || cfg('CORPFLOW_CORE_HOSTS', '').split(',')[0] || '').trim() ||
    null;
  const changeBase = opts.changeBaseUrl || 'https://lux.corpflowai.com';

  return buildBusinessOperationsMonitorReport({
    leads,
    cmpTickets,
    sources,
    now,
    adminBaseUrl: adminBase,
    changeBaseUrl: changeBase,
  });
}

async function runCli() {
  if (process.argv.includes('--fixtures')) {
    const report = buildBusinessOperationsMonitorFixtures();
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  }

  const urlIdx = process.argv.indexOf('--url');
  const explicitUrl = urlIdx >= 0 && process.argv[urlIdx + 1] ? String(process.argv[urlIdx + 1]).trim() : '';
  const fromEnv = resolveBusinessOpsMonitorUrl(
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
    const ok = json && typeof json === 'object' && json.schema === BUSINESS_OPS_MONITOR_SCHEMA;
    process.exit(ok && res.ok ? 0 : 1);
  }

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const report = await buildBusinessOperationsMonitorLiveReport(prisma, { pingFactoryHealth: false });
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
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
