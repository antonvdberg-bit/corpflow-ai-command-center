/**
 * Dispatcher agent activation — CLI (dry-run + optional Cursor live).
 *
 * @see docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  buildDirectIssueActivationReport,
  fetchGitHubIssue,
  formatActivationResultText,
  normalizeActivationMode,
  normalizeDedupeState,
  parseDispatcherFetchResponse,
  resolveDispatcherActivationUrl,
  runDispatcherActivation,
  validateDirectIssueActivationContext,
} from '../lib/server/dispatcher-agent-activation.js';
import {
  buildCursorOpsStatus,
  buildCursorOpsStatusFromActivation,
  CURSOR_OPS_STATUS_FILENAME,
  formatCursorOpsStatusLogBlock,
  postCursorOpsStatusComment,
} from '../lib/server/cursor-ops-status.js';

const FIXTURE_DISPATCHER = 'node-tests/fixtures/business-operations-dispatcher-sample.json';
const DEFAULT_DEDUPE_PATH = '.dispatcher-activation-state/dedupe.json';
const CURSOR_OPS_STATUS_PATH = CURSOR_OPS_STATUS_FILENAME;

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
 * @param {import('../lib/server/cursor-ops-status.js').ReturnType<typeof buildCursorOpsStatus>} status
 */
function writeCursorOpsStatus(status) {
  fs.writeFileSync(CURSOR_OPS_STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
}

function resolveWorkflowContext() {
  return {
    runId: String(process.env.GITHUB_RUN_ID || '').trim() || null,
    jobId: String(process.env.GITHUB_JOB || '').trim() || null,
  };
}

/**
 * @param {{
 *   mode: string,
 *   targetIssue: string,
 *   result?: Record<string, unknown> | null,
 *   error?: Error | string | null,
 *   startedAt: string,
 *   githubToken: string,
 *   repoFullName: string,
 *   postComment?: boolean,
 * }} ctx
 */
async function finalizeOpsStatus(ctx) {
  const status = buildCursorOpsStatusFromActivation(ctx.mode, ctx.result, {
    error: ctx.error,
    targetIssue: ctx.targetIssue,
    workflow: resolveWorkflowContext(),
    startedAt: ctx.startedAt,
  });

  writeCursorOpsStatus(status);
  console.log(formatCursorOpsStatusLogBlock(status));

  if (ctx.postComment && ctx.githubToken) {
    try {
      await postCursorOpsStatusComment(status, {
        token: ctx.githubToken,
        repoFullName: ctx.repoFullName || undefined,
      });
      console.log(
        `Cursor ops status comment posted to issue #${status.target_issue || '249'}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`Cursor ops status comment skipped: ${msg}`);
    }
  }

  return status;
}

/**
 * @param {Record<string, unknown>} report
 * @param {{
 *   mode: string,
 *   dedupePath: string,
 *   persistDedupe: boolean,
 *   smokeInternal?: boolean,
 *   directIssue?: boolean,
 *   targetIssue?: string,
 *   githubToken?: string,
 *   repoFullName?: string,
 *   postComment?: boolean,
 * }} opts
 */
async function emitActivation(report, opts) {
  const mode = normalizeActivationMode(opts.mode);
  const dedupeState = loadDedupeStateFile(opts.dedupePath);
  const cursorApiKey = String(process.env.CURSOR_API_KEY || '').trim();
  const startedAt = new Date().toISOString();

  let result = null;
  let error = null;

  try {
    result = await runDispatcherActivation(report, {
      mode,
      dedupeState,
      cursorApiKey,
      smokeInternal: opts.smokeInternal,
      directIssue: Boolean(opts.directIssue),
    });

    console.log(formatActivationResultText(result));
    const json = JSON.stringify(result, null, 2);
    console.log(json);
    fs.writeFileSync('activation-plan.json', json);

    if (opts.persistDedupe && mode === 'cursor_live' && result.live?.cursor) {
      saveDedupeStateFile(opts.dedupePath, result.dedupeState);
      console.log(`dedupe state updated: ${opts.dedupePath}`);
    }
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err));
    console.error(error.message);
    fs.writeFileSync(
      'activation-plan.json',
      `${JSON.stringify({ ok: false, error: error.message }, null, 2)}\n`,
    );
  }

  const status = await finalizeOpsStatus({
    mode,
    targetIssue: String(opts.targetIssue || ''),
    result,
    error,
    startedAt,
    githubToken: String(opts.githubToken || ''),
    repoFullName: String(opts.repoFullName || ''),
    postComment: Boolean(opts.postComment),
  });

  if (error) {
    throw error;
  }

  return { result, status };
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
  const targetIssueArgIdx = process.argv.indexOf('--target-issue');
  const targetIssue =
    process.env.DISPATCHER_ACTIVATION_TARGET_ISSUE ||
    (targetIssueArgIdx >= 0 ? process.argv[targetIssueArgIdx + 1] : '');
  const eventName =
    process.env.DISPATCHER_ACTIVATION_EVENT_NAME ||
    process.env.GITHUB_EVENT_NAME ||
    '';
  const githubToken = String(
    process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '',
  ).trim();
  const repoFullName = String(process.env.GITHUB_REPO || '').trim();
  const postComment = process.env.DISPATCHER_ACTIVATION_POST_COMMENT === '1';
  return {
    mode,
    dedupePath,
    smokeInternal,
    targetIssue,
    eventName,
    githubToken,
    repoFullName,
    postComment,
  };
}

/**
 * @param {{ targetIssue: string, eventName: string, githubToken: string, repoFullName: string }} opts
 */
async function resolveDirectIssueReport(opts) {
  const validation = validateDirectIssueActivationContext({
    targetIssue: opts.targetIssue,
    eventName: opts.eventName,
  });

  if (!validation.allowed) {
    if (validation.reason === 'blank') {
      return null;
    }
    if (validation.reason === 'scheduled_run_forbidden') {
      throw new Error(
        `target_issue=${validation.issueNumber} is not allowed on scheduled runs (manual workflow_dispatch only)`,
      );
    }
    throw new Error(
      `target_issue invalid (${validation.reason}) — use a numeric GitHub issue number only`,
    );
  }

  const issue = await fetchGitHubIssue(validation.issueNumber, {
    token: opts.githubToken,
    repoFullName: opts.repoFullName || undefined,
  });

  console.log(
    `Direct-issue activation: #${issue.number} — ${String(issue.title || '').trim() || '(no title)'}`,
  );

  return buildDirectIssueActivationReport(issue, {
    repoFullName: opts.repoFullName || undefined,
  });
}

async function runCli() {
  const {
    mode,
    dedupePath,
    smokeInternal,
    targetIssue,
    eventName,
    githubToken,
    repoFullName,
    postComment,
  } = resolveCliOptions();
  const persistDedupe = process.argv.includes('--persist-dedupe') || mode === 'cursor_live';
  const activationOpts = {
    mode,
    dedupePath,
    persistDedupe,
    smokeInternal,
    targetIssue,
    githubToken,
    repoFullName,
    postComment,
  };

  try {
    if (process.argv.includes('--fixtures')) {
      const report = readJsonFile(FIXTURE_DISPATCHER);
      await emitActivation(report, { ...activationOpts, persistDedupe: false });
      process.exit(0);
    }

    const fileIdx = process.argv.indexOf('--file');
    if (fileIdx >= 0 && process.argv[fileIdx + 1]) {
      const report = readJsonFile(String(process.argv[fileIdx + 1]).trim());
      await emitActivation(report, { ...activationOpts, persistDedupe: false });
      process.exit(0);
    }

    if (process.argv.includes('--fetch') || process.argv.includes('--activate')) {
      const directReport = await resolveDirectIssueReport({
        targetIssue,
        eventName,
        githubToken,
        repoFullName,
      });

      if (directReport) {
        await emitActivation(directReport, {
          ...activationOpts,
          persistDedupe,
          smokeInternal: false,
          directIssue: true,
        });
        process.exit(0);
      }

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
        const status = buildCursorOpsStatus({
          ...buildCursorOpsStatusFromActivation(mode, null, {
            targetIssue,
            workflow: resolveWorkflowContext(),
          }),
          activation_status: 'skipped',
          notes: 'Dispatcher secrets missing — activation skipped (fork-safe exit 0).',
        });
        writeCursorOpsStatus(status);
        console.log(formatCursorOpsStatusLogBlock(status));
        process.exit(0);
      }

      const report = await fetchDispatcherReport(url, token);
      await emitActivation(report, activationOpts);
      process.exit(0);
    }

    console.error(
      'Usage: node scripts/dispatcher-agent-activation.mjs --fixtures | --file <path> | --fetch [--activate] [--cursor-live] [--target-issue <n>]',
    );
    process.exit(2);
  } catch (err) {
    if (!fs.existsSync(CURSOR_OPS_STATUS_PATH)) {
      await finalizeOpsStatus({
        mode,
        targetIssue,
        result: null,
        error: err instanceof Error ? err : new Error(String(err)),
        startedAt: new Date().toISOString(),
        githubToken,
        repoFullName,
        postComment,
      });
    }
    process.exit(1);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runCli().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
