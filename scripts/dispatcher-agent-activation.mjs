/**
 * Dispatcher agent activation — CLI (dry-run Phase 1).
 *
 * @see docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  buildDispatcherActivationPlan,
  formatActivationPlanText,
  resolveDispatcherActivationUrl,
} from '../lib/server/dispatcher-agent-activation.js';

const FIXTURE_DISPATCHER = 'node-tests/fixtures/business-operations-dispatcher-sample.json';

/**
 * @param {string} path
 */
function readJsonFile(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

/**
 * @param {string} url
 * @param {string} token
 */
async function fetchDispatcherReport(url, token) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`dispatcher GET failed HTTP ${res.status}: ${body.slice(0, 500)}`);
  }
  return JSON.parse(body);
}

/**
 * @param {Record<string, unknown>} report
 */
function emitPlan(report) {
  const plan = buildDispatcherActivationPlan(report);
  const json = JSON.stringify(plan, null, 2);
  console.log(formatActivationPlanText(plan));
  console.log(json);
  fs.writeFileSync('activation-plan.json', json);
  return plan;
}

async function runCli() {
  if (process.argv.includes('--fixtures')) {
    const report = readJsonFile(FIXTURE_DISPATCHER);
    emitPlan(report);
    process.exit(0);
  }

  const fileIdx = process.argv.indexOf('--file');
  if (fileIdx >= 0 && process.argv[fileIdx + 1]) {
    const report = readJsonFile(String(process.argv[fileIdx + 1]).trim());
    emitPlan(report);
    process.exit(0);
  }

  if (process.argv.includes('--fetch')) {
    const coreBase = String(process.env.CORPFLOW_CORE_BASE_URL || '').trim();
    const healthUrl = String(
      process.env.CORPFLOW_FACTORY_HEALTH_URL || process.env.FACTORY_HEALTH_URL || '',
    ).trim();
    const url =
      resolveDispatcherActivationUrl(coreBase) ||
      resolveDispatcherActivationUrl(healthUrl);

    const token = String(process.env.CORPFLOW_CRON_SECRET || process.env.CRON_SECRET || '').trim();

    if (!url || !token) {
      console.log(
        'Skip: set CORPFLOW_CORE_BASE_URL (or CORPFLOW_FACTORY_HEALTH_URL) and CORPFLOW_CRON_SECRET.',
      );
      process.exit(0);
    }

    const report = await fetchDispatcherReport(url, token);
    emitPlan(report);
    process.exit(0);
  }

  console.error(
    'Usage: node scripts/dispatcher-agent-activation.mjs --fixtures | --file <path> | --fetch',
  );
  process.exit(2);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runCli().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
