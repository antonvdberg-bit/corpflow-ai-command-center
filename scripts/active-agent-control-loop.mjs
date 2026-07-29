#!/usr/bin/env node
/**
 * Active-agent control loop CLI — evaluate state, emit report, optional recovery markers.
 *
 * Usage:
 *   node scripts/active-agent-control-loop.mjs --fixtures
 *   node scripts/active-agent-control-loop.mjs --state .active-agent-state/runs.json
 *   node scripts/active-agent-control-loop.mjs --cursor-ops path/to/cursor-ops-status.json
 *   node scripts/active-agent-control-loop.mjs --scan path/to/cursor-issue-dispatch-scan.json
 *
 * @see docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ACTIVE_AGENT_CONTROL_LOOP_SCHEMA,
  ACTIVE_AGENT_REPORT_FILENAME,
  ACTIVE_AGENT_STATE_FILENAME,
  DEFAULT_STATE_DIR,
  evaluateActiveAgentControlLoop,
  markFollowUpSent,
  normalizeActiveAgentState,
  runRecordFromClaimedIssue,
  runRecordFromCursorOpsStatus,
} from '../lib/server/active-agent-control-loop.js';
import {
  buildOperatorDecisionPacket,
  detectCompletionSignals,
  formatOperatorDecisionPacketMarkdown,
} from '../lib/server/operator-review-handoff.js';
import {
  buildCodexDispatchTriggerPacket,
  formatCodexBridgeComment,
} from '../lib/server/codex-dispatch-adapter.js';
import {
  evaluateActivationCostGate,
  normalizeCostUsageState,
} from '../lib/server/agent-cost-controls.js';
import { routingDedupeKey } from '../lib/server/dispatcher-agent-activation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = {
    fixtures: false,
    stateDir: path.join(REPO_ROOT, DEFAULT_STATE_DIR),
    cursorOps: [],
    scanFile: null,
    outDir: null,
    markFollowUps: false,
    json: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fixtures') out.fixtures = true;
    else if (a === '--json') out.json = true;
    else if (a === '--mark-follow-ups') out.markFollowUps = true;
    else if (a === '--state-dir' && argv[i + 1]) out.stateDir = path.resolve(argv[++i]);
    else if (a === '--cursor-ops' && argv[i + 1]) out.cursorOps.push(path.resolve(argv[++i]));
    else if (a === '--scan' && argv[i + 1]) out.scanFile = path.resolve(argv[++i]);
    else if (a === '--out' && argv[i + 1]) out.outDir = path.resolve(argv[++i]);
  }
  if (!out.outDir) out.outDir = out.stateDir;
  return out;
}

function readJsonFile(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function fixtureReport() {
  const now = '2026-07-29T12:00:00.000Z';
  const staleStarted = '2026-07-28T00:00:00.000Z';
  const cursorOps = {
    schema: 'corpflow.cursor_ops_status.v1',
    activation_status: 'started',
    target_issue: '661',
    cursor_agent_url: 'https://cursor.com/agents/bc-test-run-661',
    branch: 'cursor/track-b-661',
    started_at: staleStarted,
    last_seen_at: staleStarted,
    workflow_run_id: '12345',
  };
  const claimedNoRun = {
    number: 662,
    labels: ['dispatch:cursor-claimed', 'status:in-progress'],
    updatedAt: staleStarted,
  };
  const readyNever = {
    number: 663,
    labels: ['dispatch:cursor-ready'],
    createdAt: '2026-07-28T00:00:00.000Z',
    updatedAt: '2026-07-28T00:00:00.000Z',
  };
  const codexRouting = {
    owner: 'codex',
    objectType: 'monitor',
    objectRef: 'erpnext:cross-check',
    executorPrompt: 'Research ERPNext cross-check gap; return ADR-lite memo.',
  };

  const report = evaluateActiveAgentControlLoop(normalizeActiveAgentState(null), {
    cursorOpsStatuses: [cursorOps],
    claimedIssues: [claimedNoRun],
    readyIssues: [readyNever],
    now,
  });

  const signals = detectCompletionSignals({
    run: report.state.runs[0],
    issue: { number: 661, body: 'CURSOR IMPLEMENTATION COMPLETE — READY FOR MERGE REVIEW\nEvidence: smoke passed' },
    comments: [{ body: 'CURSOR IMPLEMENTATION COMPLETE' }],
  });
  const packet = buildOperatorDecisionPacket(signals, {
    title: 'Track B control loop',
    businessOutcome: 'Harden active-agent control loop (#661)',
  });

  const codex = buildCodexDispatchTriggerPacket(codexRouting, { suffix: '661' });

  const costGate = evaluateActivationCostGate(
    {
      provider: 'cursor',
      dedupeKey: routingDedupeKey({
        owner: 'cursor',
        objectType: 'delivery',
        objectRef: 'ticket:661',
        severity: 'warning',
      }),
      objectRef: 'ticket:661',
      throughput_packet: { allowed_category: 'ops-unblocker' },
    },
    normalizeCostUsageState({ date: '2026-07-29', cursorActivations: 0, codexTriggers: 0, entries: [] }),
    report.state.runs,
  );

  return {
    report,
    reviewPacket: packet,
    reviewMarkdown: formatOperatorDecisionPacketMarkdown(packet),
    codex,
    codexComment: codex.valid && codex.packet ? formatCodexBridgeComment(codex.packet) : null,
    costGate,
  };
}

function main() {
  const args = parseArgs(process.argv);

  if (args.fixtures) {
    const fixture = fixtureReport();
    if (args.json) {
      console.log(JSON.stringify(fixture, null, 2));
    } else {
      console.log('Active-agent control loop — fixture evaluation');
      console.log(`findings: ${fixture.report.summary.findings}`);
      console.log(`actionable recoveries: ${fixture.report.summary.actionableRecoveries}`);
      console.log(`review route: ${fixture.reviewPacket.routeOwner}`);
      console.log(`codex valid: ${fixture.codex.valid}`);
      console.log(`cost allowed: ${fixture.costGate.allowed}`);
    }
    return;
  }

  mkdirSync(args.stateDir, { recursive: true });
  const statePath = path.join(args.stateDir, ACTIVE_AGENT_STATE_FILENAME);
  let state = normalizeActiveAgentState(readJsonFile(statePath));

  const cursorOpsStatuses = args.cursorOps.map((f) => readJsonFile(f)).filter(Boolean);
  if (cursorOpsStatuses.length === 0) {
    const defaultOps = path.join(args.stateDir, 'cursor-ops-status.json');
    const fallback = readJsonFile(defaultOps);
    if (fallback) cursorOpsStatuses.push(fallback);
  }

  /** @type {Array<{ number: number, labels?: unknown, updatedAt?: string | null, createdAt?: string | null }>} */
  let readyIssues = [];
  /** @type {typeof readyIssues} */
  let claimedIssues = [];

  if (args.scanFile) {
    const scan = readJsonFile(args.scanFile);
    if (scan && Array.isArray(scan.issues)) {
      for (const item of scan.issues) {
        const issue = {
          number: Number(item.number),
          labels: item.labels,
          updatedAt: item.updatedAt || item.updated_at,
          createdAt: item.createdAt || item.created_at,
        };
        const labels = (issue.labels || []).map((l) =>
          typeof l === 'string' ? l : String(l?.name || ''),
        );
        if (labels.some((l) => l.toLowerCase() === 'dispatch:cursor-ready')) {
          readyIssues.push(issue);
        }
        if (labels.some((l) => l.toLowerCase() === 'dispatch:cursor-claimed')) {
          claimedIssues.push(issue);
        }
      }
    }
    if (scan?.activationTargetIssue) {
      const target = scan.activationTargetIssue;
      claimedIssues.push({
        number: Number(target.number || target.issueNumber),
        labels: target.labels,
        updatedAt: target.updatedAt,
      });
    }
  }

  const evaluation = evaluateActiveAgentControlLoop(state, {
    cursorOpsStatuses,
    claimedIssues,
    readyIssues,
  });

  let nextState = evaluation.state;
  if (args.markFollowUps) {
    for (const recovery of evaluation.recoveries) {
      if (recovery.action === 'follow_up') {
        nextState = markFollowUpSent(nextState, recovery.target);
      }
    }
  }

  writeFileSync(statePath, JSON.stringify(nextState, null, 2));
  const reportPath = path.join(args.outDir, ACTIVE_AGENT_REPORT_FILENAME);
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        schema: ACTIVE_AGENT_CONTROL_LOOP_SCHEMA,
        evaluatedAt: evaluation.evaluatedAt,
        summary: evaluation.summary,
        findings: evaluation.findings,
        recoveries: evaluation.recoveries,
      },
      null,
      2,
    ),
  );

  if (args.json) {
    console.log(JSON.stringify(evaluation, null, 2));
  } else {
    console.log(`Wrote ${statePath}`);
    console.log(`Wrote ${reportPath}`);
    console.log(
      `summary: runs=${evaluation.summary.totalRuns} findings=${evaluation.summary.findings} actionable=${evaluation.summary.actionableRecoveries}`,
    );
    for (const r of evaluation.recoveries) {
      console.log(`- [${r.action}] ${r.target}: ${r.message.slice(0, 120)}`);
    }
  }
}

main();
