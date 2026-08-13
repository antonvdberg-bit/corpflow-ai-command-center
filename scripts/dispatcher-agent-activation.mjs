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
  buildDispatcherActivationPlan,
  DISPATCHER_ACTIVATION_AUDIT_FILENAME,
  DISPATCHER_ACTIVATION_SCHEMA,
  fetchGitHubIssue,
  formatActivationResultText,
  normalizeActivationMode,
  normalizeDedupeState,
  parseDispatcherFetchResponse,
  parseTargetIssueNumber,
  resolveDispatcherActivationUrl,
  runDispatcherActivation,
  validateDirectIssueActivationContext,
} from '../lib/server/dispatcher-agent-activation.js';
import {
  acquireCursorIssueActivationClaim,
  CLAIM_ACQUIRED,
  listGitHubIssueComments,
  releaseCursorIssueActivationClaim,
  SKIP_ALREADY_CLAIMED,
} from '../lib/server/cursor-activation-claim.js';
import {
  assertStrictTargetIssueObservabilityPrerequisites,
  buildCursorOpsStatus,
  buildCursorOpsStatusFromActivation,
  buildObservabilityFailedStatus,
  createEmptyObservability,
  CURSOR_OPS_STATUS_FILENAME,
  formatCursorOpsStatusLogBlock,
  postCursorActivationFinishedComment,
  postCursorActivationStartedComment,
  postCursorOpsStatusComment,
  postGitHubIssueComment,
  requiresStrictTargetIssueObservability,
  resolveGithubWorkflowContextFromEnv,
} from '../lib/server/cursor-ops-status.js';

const FIXTURE_DISPATCHER = 'node-tests/fixtures/business-operations-dispatcher-sample.json';
const DEFAULT_DEDUPE_PATH = '.dispatcher-activation-state/dedupe.json';
const CURSOR_OPS_STATUS_PATH = CURSOR_OPS_STATUS_FILENAME;

/**
 * @param {string | null | undefined} value
 */
function parseBooleanFlag(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(normalized);
}

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
 * @param {ReturnType<typeof buildCursorOpsStatus>} status
 */
function writeCursorOpsStatus(status) {
  fs.writeFileSync(CURSOR_OPS_STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
}

/**
 * @param {Record<string, unknown> | null | undefined} result
 * @param {{ error?: Error | string | null, requireThroughputPacket?: boolean, directIssue?: boolean }} [ctx]
 */
function writeActivationAudit(result, ctx = {}) {
  const decisions = Array.isArray(result?.decisions) ? result.decisions : [];
  const audit = {
    schema: 'corpflow.dispatcher_activation_audit.v1',
    generated_at: new Date().toISOString(),
    mode: result?.mode || null,
    require_throughput_packet: Boolean(ctx.requireThroughputPacket),
    direct_issue_manual_override: Boolean(ctx.directIssue),
    error: ctx.error
      ? ctx.error instanceof Error
        ? ctx.error.message
        : String(ctx.error)
      : null,
    candidates: decisions.map((d) => ({
      owner: d.owner || null,
      objectRef: d.objectRef || null,
      objectType: d.objectType || null,
      severity: d.severity || null,
      gated: Boolean(d.gated),
      action: d.action || null,
      why: d.reason || null,
      category: d.category || null,
      business_outcome: d.business_outcome || null,
      evidence_required: d.evidence_required || null,
      linked_issue_or_ticket: d.linked_issue_or_ticket || null,
      delivery_surface: d.delivery_surface || null,
      spend_risk_note: d.spend_risk_note || null,
      throughput_packet_eligible: d.throughput_packet_eligible ?? null,
      throughput_packet_missing_fields: Array.isArray(d.throughput_packet_missing_fields)
        ? d.throughput_packet_missing_fields
        : [],
      throughput_packet_invalid_fields: Array.isArray(d.throughput_packet_invalid_fields)
        ? d.throughput_packet_invalid_fields
        : [],
    })),
  };
  fs.writeFileSync(DISPATCHER_ACTIVATION_AUDIT_FILENAME, `${JSON.stringify(audit, null, 2)}\n`);
  return audit;
}

function resolveWorkflowContext() {
  const gh = resolveGithubWorkflowContextFromEnv();
  return {
    runId: gh.runId,
    jobId: gh.jobId,
    workflowRunUrl: gh.workflowRunUrl,
    sha: gh.sha,
    repository: gh.repository,
  };
}

/**
 * @param {{
 *   mode: string,
 *   targetIssue: string,
 *   eventName: string,
 *   githubToken: string,
 *   repoFullName: string,
 *   postComment?: boolean,
 *   observability: import('../lib/server/cursor-ops-status.js').CursorOpsObservability,
 *   startedAt: string,
 * }} ctx
 */
async function postStartedCommentIfRequired(ctx) {
  const strict = requiresStrictTargetIssueObservability({
    eventName: ctx.eventName,
    targetIssue: ctx.targetIssue,
  });
  if (!strict) return;

  assertStrictTargetIssueObservabilityPrerequisites({
    eventName: ctx.eventName,
    targetIssue: ctx.targetIssue,
    githubToken: ctx.githubToken,
  });

  const workflow = resolveWorkflowContext();
  await postCursorActivationStartedComment(
    {
      targetIssue: ctx.targetIssue,
      activationMode: ctx.mode,
      workflowRunId: workflow.runId,
      workflowRunUrl: workflow.workflowRunUrl,
      commitSha: workflow.sha,
    },
    {
      token: ctx.githubToken,
      repoFullName: ctx.repoFullName || workflow.repository || undefined,
    },
  );

  ctx.observability.started_comment_posted = true;
  ctx.observability.comment_issue = String(ctx.targetIssue);
  console.log(`Cursor activation STARTED comment posted to issue #${ctx.targetIssue}`);
}

/**
 * @param {{
 *   mode: string,
 *   targetIssue: string,
 *   eventName: string,
 *   githubToken: string,
 *   repoFullName: string,
 *   postComment?: boolean,
 *   result?: Record<string, unknown> | null,
 *   error?: Error | string | null,
 *   observability: import('../lib/server/cursor-ops-status.js').CursorOpsObservability,
 *   startedAt: string,
 * }} ctx
 */
async function finalizeOpsStatus(ctx) {
  const workflow = resolveWorkflowContext();
  let status = buildCursorOpsStatusFromActivation(ctx.mode, ctx.result, {
    error: ctx.error,
    targetIssue: ctx.targetIssue,
    workflow: {
      runId: workflow.runId,
      jobId: workflow.jobId,
      workflowRunUrl: workflow.workflowRunUrl,
    },
    startedAt: ctx.startedAt,
    observability: ctx.observability,
  });

  writeCursorOpsStatus(status);
  console.log(formatCursorOpsStatusLogBlock(status));

  const strict = requiresStrictTargetIssueObservability({
    eventName: ctx.eventName,
    targetIssue: ctx.targetIssue,
  });

  const shouldPostFinished =
    strict || (ctx.postComment && ctx.githubToken && (ctx.targetIssue || true));

  if (!shouldPostFinished) {
    return status;
  }

  try {
    if (strict) {
      await postCursorActivationFinishedComment(status, {
        token: ctx.githubToken,
        repoFullName: ctx.repoFullName || workflow.repository || undefined,
      });
    } else if (ctx.postComment && ctx.githubToken) {
      await postCursorOpsStatusComment(status, {
        token: ctx.githubToken,
        repoFullName: ctx.repoFullName || workflow.repository || undefined,
      });
    }
    ctx.observability.finished_comment_posted = true;
    if (!ctx.observability.comment_issue && status.target_issue) {
      ctx.observability.comment_issue = status.target_issue;
    }
    status = buildCursorOpsStatus({
      ...status,
      observability: { ...ctx.observability },
      last_seen_at: new Date().toISOString(),
    });
    writeCursorOpsStatus(status);
    console.log(
      `Cursor activation FINISHED comment posted to issue #${status.target_issue || '249'}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (strict) {
      status = buildObservabilityFailedStatus(status, message, {
        ...ctx.observability,
        finished_comment_posted: false,
      });
      writeCursorOpsStatus(status);
      console.log(formatCursorOpsStatusLogBlock(status));
      throw new Error(`FINISHED comment failed for target_issue #${ctx.targetIssue}: ${message}`);
    }
    console.log(`Cursor ops FINISHED comment skipped (non-strict): ${message}`);
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
 *   eventName?: string,
 *   githubToken?: string,
 *   repoFullName?: string,
 *   postComment?: boolean,
 *   requireThroughputPacket?: boolean,
 * }} opts
 */
/**
 * Durable pre-API claim for cursor_live activations keyed by source issue.
 * @param {{
 *   mode: string,
 *   targetIssue: string,
 *   githubToken: string,
 *   repoFullName: string,
 *   report: Record<string, unknown>,
 * }} ctx
 */
async function maybeAcquireLiveActivationClaim(ctx) {
  if (ctx.mode !== 'cursor_live') {
    return { skipped: true, reason: 'not_cursor_live' };
  }
  const parsed = parseTargetIssueNumber(ctx.targetIssue);
  if (!parsed.ok) {
    return { skipped: true, reason: 'no_target_issue' };
  }
  if (!ctx.githubToken || !ctx.repoFullName) {
    throw new Error(
      'cursor_live activation requires GITHUB_TOKEN and GITHUB_REPOSITORY for durable claim-before-API',
    );
  }

  const issueNumber = parsed.issueNumber;
  const issue =
    ctx.report &&
    typeof ctx.report === 'object' &&
    ctx.report.summary &&
    typeof ctx.report.summary === 'object' &&
    Number(ctx.report.summary.target_issue) === issueNumber
      ? {
          number: issueNumber,
          title: ctx.report.summary.title,
          body: ctx.report.summary.body,
          labels: ctx.report.summary.labels,
        }
      : await fetchGitHubIssue(issueNumber, {
          token: ctx.githubToken,
          repoFullName: ctx.repoFullName,
        });

  const allowExplicitRequeue = parseBooleanFlag(process.env.CURSOR_ACTIVATION_ALLOW_REQUEUE);
  const postComment = (n, body) =>
    postGitHubIssueComment(n, body, {
      token: ctx.githubToken,
      repoFullName: ctx.repoFullName,
    });

  const acquired = await acquireCursorIssueActivationClaim({
    token: ctx.githubToken,
    repo: ctx.repoFullName,
    issueNumber,
    labels: issue.labels,
    issueBody: issue.body,
    allowExplicitRequeue,
    workflowRunId: process.env.GITHUB_RUN_ID || null,
    postComment,
    listComments: (n) =>
      listGitHubIssueComments({
        token: ctx.githubToken,
        repo: ctx.repoFullName,
        issueNumber: n,
      }),
  });

  return { skipped: false, issueNumber, acquired, issue };
}

/**
 * @param {number} issueNumber
 * @param {string} reason
 * @param {string} mode
 * @param {ReturnType<typeof normalizeDedupeState>} dedupeState
 */
function buildSkipAlreadyClaimedActivationResult(issueNumber, reason, mode, dedupeState) {
  const plan = buildDispatcherActivationPlan(
    {
      schema: 'corpflow.business_operations_dispatcher.v1',
      ok: true,
      evaluated_at: new Date().toISOString(),
      routings: [],
      summary: { source: 'target_issue', target_issue: issueNumber },
    },
    { mode },
  );
  return {
    schema: DISPATCHER_ACTIVATION_SCHEMA,
    version: 2,
    mode,
    evaluated_at: plan.evaluated_at,
    dispatcher_ok: true,
    plan,
    decisions: [
      {
        owner: 'cursor',
        objectRef: `issue:#${issueNumber}`,
        objectType: 'issue',
        severity: 'P0',
        gated: false,
        action: SKIP_ALREADY_CLAIMED,
        reason,
        dedupeKey: null,
        category: null,
        business_outcome: null,
        evidence_required: null,
        linked_issue_or_ticket: `#${issueNumber}`,
        delivery_surface: null,
        spend_risk_note: null,
        throughput_packet: null,
        throughput_packet_eligible: null,
        throughput_packet_missing_fields: [],
        throughput_packet_invalid_fields: [],
      },
    ],
    live: { cursor: null },
    dedupeState,
    claim: {
      decision: SKIP_ALREADY_CLAIMED,
      reason,
      issueNumber,
    },
  };
}

async function emitActivation(report, opts) {
  const mode = normalizeActivationMode(opts.mode);
  const dedupeState = loadDedupeStateFile(opts.dedupePath);
  const cursorApiKey = String(process.env.CURSOR_API_KEY || '').trim();
  const startedAt = new Date().toISOString();
  const targetIssue = String(opts.targetIssue || '').trim();
  const eventName = String(opts.eventName || '').trim();
  const githubToken = String(opts.githubToken || '').trim();
  const repoFullName = String(opts.repoFullName || '').trim();
  const observability = createEmptyObservability(targetIssue || null);

  await postStartedCommentIfRequired({
    mode,
    targetIssue,
    eventName,
    githubToken,
    repoFullName,
    postComment: opts.postComment,
    observability,
    startedAt,
  });

  let result = null;
  let error = null;
  /** @type {Awaited<ReturnType<typeof maybeAcquireLiveActivationClaim>> | null} */
  let claimCtx = null;

  try {
    claimCtx = await maybeAcquireLiveActivationClaim({
      mode,
      targetIssue,
      githubToken,
      repoFullName,
      report,
    });

    if (
      claimCtx &&
      !claimCtx.skipped &&
      claimCtx.acquired &&
      claimCtx.acquired.decision === SKIP_ALREADY_CLAIMED
    ) {
      result = buildSkipAlreadyClaimedActivationResult(
        claimCtx.issueNumber,
        String(claimCtx.acquired.reason || 'already_claimed'),
        mode,
        dedupeState,
      );
      console.log(
        `SKIP_ALREADY_CLAIMED issue #${claimCtx.issueNumber}: ${claimCtx.acquired.reason}`,
      );
    } else {
      try {
        result = await runDispatcherActivation(report, {
          mode,
          dedupeState,
          cursorApiKey,
          smokeInternal: opts.smokeInternal,
          directIssue: Boolean(opts.directIssue),
          requireThroughputPacket: Boolean(opts.requireThroughputPacket),
        });
      } catch (activationErr) {
        if (
          claimCtx &&
          !claimCtx.skipped &&
          claimCtx.acquired &&
          claimCtx.acquired.decision === CLAIM_ACQUIRED
        ) {
          await releaseCursorIssueActivationClaim({
            token: githubToken,
            repo: repoFullName,
            issueNumber: claimCtx.issueNumber,
            claim: claimCtx.acquired.claim,
            postComment: (n, body) =>
              postGitHubIssueComment(n, body, {
                token: githubToken,
                repoFullName,
              }),
          });
          console.log(
            `activation failed — released claim for issue #${claimCtx.issueNumber}`,
          );
        }
        throw activationErr;
      }

      if (
        mode === 'cursor_live' &&
        claimCtx &&
        !claimCtx.skipped &&
        claimCtx.acquired &&
        claimCtx.acquired.decision === CLAIM_ACQUIRED &&
        !result?.live?.cursor
      ) {
        await releaseCursorIssueActivationClaim({
          token: githubToken,
          repo: repoFullName,
          issueNumber: claimCtx.issueNumber,
          claim: claimCtx.acquired.claim,
          postComment: (n, body) =>
            postGitHubIssueComment(n, body, {
              token: githubToken,
              repoFullName,
            }),
        });
        console.log(
          `no Cursor agent created — released claim for issue #${claimCtx.issueNumber}`,
        );
      }

      if (claimCtx && !claimCtx.skipped && claimCtx.acquired?.claim) {
        result = {
          ...result,
          claim: {
            decision: claimCtx.acquired.decision,
            reason: claimCtx.acquired.reason,
            generation: claimCtx.acquired.generation,
            claimToken: claimCtx.acquired.claim?.claimToken || null,
            issueNumber: claimCtx.issueNumber,
          },
        };
      }
    }

    console.log(formatActivationResultText(result));
    const json = JSON.stringify(result, null, 2);
    console.log(json);
    fs.writeFileSync('activation-plan.json', json);
    writeActivationAudit(result, {
      requireThroughputPacket: opts.requireThroughputPacket,
      directIssue: opts.directIssue,
    });

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
    writeActivationAudit(result, {
      error,
      requireThroughputPacket: opts.requireThroughputPacket,
      directIssue: opts.directIssue,
    });
  }

  const status = await finalizeOpsStatus({
    mode,
    targetIssue,
    eventName,
    githubToken,
    repoFullName,
    postComment: opts.postComment,
    result,
    error,
    observability,
    startedAt,
  });

  if (error) {
    throw error;
  }

  return { result, status };
}

function resolveCliOptions() {
  const mode = normalizeActivationMode(
    process.env.ACTIVATION_MODE ||
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
    process.env.TARGET_ISSUE ||
    process.env.DISPATCHER_ACTIVATION_TARGET_ISSUE ||
    (targetIssueArgIdx >= 0 ? process.argv[targetIssueArgIdx + 1] : '');
  const eventName =
    process.env.DISPATCHER_ACTIVATION_EVENT_NAME ||
    process.env.GITHUB_EVENT_NAME ||
    '';
  const githubToken = String(
    process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '',
  ).trim();
  const repoFullName = String(
    process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPO || '',
  ).trim();
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
  const issueScanHandoff =
    opts.issueScanHandoff ||
    ['issue_scan', 'scan', 'event_label'].includes(
      String(process.env.DISPATCHER_ACTIVATION_TARGET_SOURCE || '')
        .trim()
        .toLowerCase(),
    );
  const validation = validateDirectIssueActivationContext({
    targetIssue: opts.targetIssue,
    eventName: opts.eventName,
    issueScanHandoff,
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
  // #929: scheduled cursor_live is authoritative. CURSOR_LIVE_ENABLED no longer
  // gates schedule. Fail-closed remains CURSOR_API_KEY + WIP/protected gates.

  const persistDedupe = process.argv.includes('--persist-dedupe') || mode === 'cursor_live';
  const activationOpts = {
    mode,
    dedupePath,
    persistDedupe,
    smokeInternal,
    targetIssue,
    eventName,
    githubToken,
    repoFullName,
    postComment,
    requireThroughputPacket: mode === 'cursor_live',
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
          requireThroughputPacket: false,
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
    if (!fs.existsSync('activation-plan.json')) {
      const message = err instanceof Error ? err.message : String(err);
      fs.writeFileSync(
        'activation-plan.json',
        `${JSON.stringify({ ok: false, error: message }, null, 2)}\n`,
      );
      writeActivationAudit(null, { error: err instanceof Error ? err : String(err) });
    }
    if (!fs.existsSync(CURSOR_OPS_STATUS_PATH)) {
      const observability = createEmptyObservability(targetIssue || null);
      const workflow = resolveWorkflowContext();
      try {
        if (
          requiresStrictTargetIssueObservability({ eventName, targetIssue }) &&
          !observability.started_comment_posted
        ) {
          assertStrictTargetIssueObservabilityPrerequisites({
            eventName,
            targetIssue,
            githubToken,
          });
        }
      } catch {
        // fall through to status write below
      }
      const failedStatus = buildObservabilityFailedStatus(
        buildCursorOpsStatusFromActivation(mode, null, {
          targetIssue,
          workflow: {
            runId: workflow.runId,
            jobId: workflow.jobId,
            workflowRunUrl: workflow.workflowRunUrl,
          },
          observability,
        }),
        err instanceof Error ? err : new Error(String(err)),
        observability,
      );
      writeCursorOpsStatus(failedStatus);
      console.log(formatCursorOpsStatusLogBlock(failedStatus));
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
