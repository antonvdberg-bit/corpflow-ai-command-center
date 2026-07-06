/**
 * Dispatcher agent activation — CLI (dry-run + optional Cursor live).
 *
 * @see docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  formatActivationResultText,
  normalizeActivationMode,
  normalizeDedupeState,
  parseDispatcherFetchResponse,
  resolveDispatcherActivationUrl,
  runDispatcherActivation,
} from '../lib/server/dispatcher-agent-activation.js';

const FIXTURE_DISPATCHER = 'node-tests/fixtures/business-operations-dispatcher-sample.json';
const DEFAULT_DEDUPE_PATH = '.dispatcher-activation-state/dedupe.json';

/**
 * @param {string} filePath
 */
function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * @param {string} filePath
 * @returns {import('../lib/server/dispatcher-agent-activation.js').DispatcherActivationDedupeState}
 */
function loadDedupeStateFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return normalizeDedupeState(null);
    }
    return normalizeDedupeState(readJsonFile(filePath));
  } catch {
    return normalizeDedupeState(null);
  }
}

/**
 * @param {string} filePath
 * @param {import('../lib/server/dispatcher-agent-activation.js').DispatcherActivationDedupeState} state
 */
function saveDedupeStateFile(filePath, state) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
}

/**
 * @param {string} url
 * @param {string} token
 */
async function fetchDispatcherReport(url, token) {
  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`dispatcher GET unreachable: ${msg}`);
  }

  const body = await res.text();
  const { report, httpStatus } = parseDispatcherFetchResponse(res.status, body);

  if (httpStatus < 200 || httpStatus >= 300) {
    console.log(
      `dispatcher HTTP ${httpStatus} (schema valid; action may be required; continuing)`,
    );
  }

  return report;
}

/**
 * @param {Record<string, unknown>} report
 * @param {{ mode: string, dedupePath: string, persistDedupe: boolean }} opts
 */
async function emitActivation(report, opts) {
  const mode = normalizeActivationMode(opts.mode);
  const dedupeState = loadDedupeStateFile(opts.dedupePath);
  const cursorApiKey = String(process.env.CURSOR_API_KEY || '').trim();

  const result = await runDispatcherActivation(report, {
    mode,
    dedupeState,
    cursorApiKey,
    smokeInternal: opts.smokeInternal,
  });

  console.log(formatActivationResultText(result));
  const json = JSON.stringify(result, null, 2);
  console.log(json);
  fs.writeFileSync('activation-plan.json', json);

  if (opts.persistDedupe && mode === 'cursor_live' && result.live?.cursor) {
    saveDedupeStateFile(opts.dedupePath, result.dedupeState);
    console.log(`dedupe state updated: ${opts.dedupePath}`);
  }

  return result;
}

function resolveCliOptions() {
  const mode = normalizeActivationMode(
    process.env.DISPATCHER_ACTIVATION_MODE ||
      (process.argv.includes('--cursor-live') ? 'cursor_live' : 'dry_run'),
  );
  const dedupePath = String(
    process.env.DISPATCHER_ACTIVATION_STATE_PATH || DEFAULT_DEDUPE_PATH,
  ).trim();
  const smokeInternal =
    process.env.DISPATCHER_ACTIVATION_SMOKE_INTERNAL === '1' ||
    process.argv.includes('--smoke-internal');
  return { mode, dedupePath, smokeInternal };
}

async function runCli() {
  const { mode, dedupePath, smokeInternal } = resolveCliOptions();
  const persistDedupe = process.argv.includes('--persist-dedupe') || mode === 'cursor_live';

  if (process.argv.includes('--fixtures')) {
    const report = readJsonFile(FIXTURE_DISPATCHER);
    await emitActivation(report, { mode, dedupePath, persistDedupe: false, smokeInternal });
    process.exit(0);
  }

  const fileIdx = process.argv.indexOf('--file');
  if (fileIdx >= 0 && process.argv[fileIdx + 1]) {
    const report = readJsonFile(String(process.argv[fileIdx + 1]).trim());
    await emitActivation(report, { mode, dedupePath, persistDedupe: false, smokeInternal });
    process.exit(0);
  }

  if (process.argv.includes('--fetch') || process.argv.includes('--activate')) {
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
    await emitActivation(report, { mode, dedupePath, persistDedupe, smokeInternal });
    process.exit(0);
  }

  console.error(
    'Usage: node scripts/dispatcher-agent-activation.mjs --fixtures | --file <path> | --fetch [--activate] [--cursor-live]',
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
