/**
 * Finalize or rollback dispatch claim labels after Cursor activation.
 *
 * Success: apply dispatch:cursor-claimed + status:in-progress, remove ready, post run ID comment.
 * Failure: remove premature claimed labels, restore dispatch:cursor-ready.
 *
 * Usage:
 *   node scripts/cursor-issue-dispatch-finalize.mjs --scan-file cursor-issue-dispatch-scan.json \
 *     --activation-file activation-plan.json --ops-status-file cursor-ops-status.json
 *
 * @see docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  buildCursorActivationClaim,
  formatCursorActivationClaimComment,
} from '../lib/server/cursor-activation-claim.js';
import {
  finalizeIssueClaimAfterActivation,
  inferIssueClassification,
  rollbackPrematureIssueClaim,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import { postGitHubIssueComment } from '../lib/server/cursor-ops-status.js';
import {
  buildCursorOriginMetadata,
  formatCursorOriginMetadataComment,
} from '../lib/server/cursor-origin-metadata.js';

const DEFAULT_REPO = 'antonvdberg-bit/corpflow-ai-command-center';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  function fileArg(flag, envKey, fallback) {
    const inline = argv.find((a) => a.startsWith(`${flag}=`));
    if (inline) return inline.slice(flag.length + 1);
    const idx = argv.indexOf(flag);
    if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) return argv[idx + 1];
    return process.env[envKey] || fallback;
  }

  return {
    scanFile: fileArg('--scan-file', 'CURSOR_ISSUE_DISPATCH_SCAN_PATH', 'cursor-issue-dispatch-scan.json'),
    activationFile: fileArg('--activation-file', 'DISPATCHER_ACTIVATION_PLAN_PATH', 'activation-plan.json'),
    opsStatusFile: fileArg('--ops-status-file', 'CURSOR_OPS_STATUS_PATH', 'cursor-ops-status.json'),
    dryRun: argv.includes('--dry-run'),
    forceRollback: argv.includes('--rollback'),
  };
}

/**
 * @param {string} filePath
 */
function readJsonIfExists(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return null;
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

/**
 * @param {Record<string, unknown> | null} activation
 * @param {Record<string, unknown> | null} opsStatus
 */
function resolveCursorRunId(activation, opsStatus) {
  const live = activation?.live && typeof activation.live === 'object' ? activation.live : null;
  const cursor = live?.cursor && typeof live.cursor === 'object' ? live.cursor : null;
  const fromActivation = cursor?.runId || cursor?.agentId || null;
  if (fromActivation) return String(fromActivation);

  const url = opsStatus?.cursor_agent_url ? String(opsStatus.cursor_agent_url) : '';
  if (url) {
    const m = url.match(/\/agents\/([^/?#]+)/i);
    if (m) return m[1];
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null} scan
 * @param {number} issueNumber
 */
function findScanAction(scan, issueNumber) {
  const actions = Array.isArray(scan?.actions) ? scan.actions : [];
  return actions.find((a) => Number(a.issue) === issueNumber) || null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const repo = String(process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPO || DEFAULT_REPO).trim();

  const scan = readJsonIfExists(args.scanFile);
  const activation = readJsonIfExists(args.activationFile);
  const opsStatus = readJsonIfExists(args.opsStatusFile);

  const targetIssue = Number(
    scan?.activationTargetIssue || opsStatus?.target_issue || process.env.TARGET_ISSUE || 0,
  );
  if (!Number.isInteger(targetIssue) || targetIssue < 1) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'no activationTargetIssue' }, null, 2));
    return;
  }

  const activationStatus = String(opsStatus?.activation_status || '');
  const runId = resolveCursorRunId(activation, opsStatus);
  const skipAlreadyClaimed =
    Array.isArray(activation?.decisions) &&
    activation.decisions.some(
      (d) => d && (d.action === 'SKIP_ALREADY_CLAIMED' || d.reason === 'lost_claim_race'),
    );
  const activationFailed =
    args.forceRollback ||
    (!skipAlreadyClaimed && activation?.ok === false) ||
    activationStatus === 'failed' ||
    activationStatus === 'blocked' ||
    activationStatus === 'observability_failed';

  const action = findScanAction(scan, targetIssue);
  const classification =
    action?.classification && typeof action.classification === 'object'
      ? action.classification
      : inferIssueClassification({
          number: targetIssue,
          title: '',
          body: '',
          labels: [],
        });

  /** @type {Record<string, unknown>} */
  const result = {
    schema: 'corpflow.cursor_issue_dispatch_finalize.v1',
    issueNumber: targetIssue,
    dryRun: args.dryRun,
    activationStatus,
    runId,
    activationFailed,
    skipAlreadyClaimed,
    finalized: false,
    rolledBack: false,
  };

  if (!token) {
    result.skipped = true;
    result.reason = 'GITHUB_TOKEN missing';
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (skipAlreadyClaimed) {
    result.skipped = true;
    result.reason = 'SKIP_ALREADY_CLAIMED — leave existing claim intact';
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (activationFailed || !runId) {
    if (!args.dryRun) {
      await rollbackPrematureIssueClaim({ token, repo, issueNumber: targetIssue });
    }
    result.rolledBack = true;
    result.reason = activationFailed
      ? 'activation failed — restored dispatch:cursor-ready'
      : 'no Cursor run ID — restored dispatch:cursor-ready';
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!args.dryRun) {
    const agentUrl = opsStatus?.cursor_agent_url || activation?.live?.cursor?.agentUrl || null;
    const branch = opsStatus?.branch || activation?.live?.cursor?.branch || null;
    const finalized = await finalizeIssueClaimAfterActivation({
      token,
      repo,
      issueNumber: targetIssue,
      agentRunId: runId,
      agentUrl,
      branch,
      classification,
      postComment: (issueNumber, body) =>
        postGitHubIssueComment(issueNumber, body, { token, repoFullName: repo }),
    });
    result.finalized = true;
    result.finalize = finalized;

    const agentIdMatch = String(agentUrl || '').match(/\/agents\/([^/?#]+)/i);
    const originBody = formatCursorOriginMetadataComment(
      buildCursorOriginMetadata({
        sourceIssue: targetIssue,
        activationWorkflowRunId: opsStatus?.workflow_run_id || process.env.GITHUB_RUN_ID || null,
        cursorRunId: runId,
        cursorAgentId: agentIdMatch ? agentIdMatch[1] : null,
        cursorAgentUrl: agentUrl,
        branch,
        prNumber: opsStatus?.pr_number || null,
        headSha: process.env.GITHUB_SHA || null,
        followUpAttemptCount: 0,
      }),
    );
    await postGitHubIssueComment(targetIssue, originBody, { token, repoFullName: repo });

    // Durable activated claim with verified run ID (preserves prior pending claim history).
    const activatedClaim = buildCursorActivationClaim({
      sourceIssue: targetIssue,
      generation: 1,
      claimToken: `activated-${runId}`,
      status: 'activated',
      agentRunId: runId,
      claimedAt: new Date().toISOString(),
      workflowRunId: opsStatus?.workflow_run_id || process.env.GITHUB_RUN_ID || null,
    });
    await postGitHubIssueComment(
      targetIssue,
      formatCursorActivationClaimComment(activatedClaim),
      { token, repoFullName: repo },
    );
  } else {
    result.finalized = true;
    result.dryRunWouldApply = {
      labels: ['dispatch:cursor-claimed', 'status:in-progress'],
      remove: ['dispatch:cursor-ready'],
      runId,
    };
  }

  console.log(JSON.stringify(result, null, 2));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

export { resolveCursorRunId };
