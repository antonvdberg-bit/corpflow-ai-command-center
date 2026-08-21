#!/usr/bin/env node
/**
 * CorpFlowAI Factory Temporal Phase 1 worker entry (#1032).
 *
 * Dry-run from Cursor Cloud / CI. `--live` is fail-closed here: starting the
 * worker on corpflow-exec-01 is operator-paste L3 only and must not
 * workflow_dispatch Handoff from this process (loop risk).
 */

import os from 'node:os';

import {
  FACTORY_CONTROL_PLANE_V1,
  FACTORY_TEMPORAL_PHASE1_SCHEMA,
  PHASE1_LIVE_ACTIVATION_APPROVAL_MARKER,
  PHASE1_LIVE_WORKER_BLOCKER,
  evaluateLiveActivationBoundary,
  resolveLiveTemporalWorkerGate,
} from '../../lib/server/factory-temporal-phase1.js';

const live = process.argv.includes('--live');
const gate = resolveLiveTemporalWorkerGate(process.env);
const boundary = evaluateLiveActivationBoundary({
  hostname: os.hostname(),
  comments: [{ body: PHASE1_LIVE_ACTIVATION_APPROVAL_MARKER }],
  env: process.env,
  tokenPathExists: false,
});

if (live) {
  process.stderr.write(
    `${JSON.stringify(
      {
        schema: FACTORY_TEMPORAL_PHASE1_SCHEMA,
        mode: 'live',
        verdict: `NOT READY — ${boundary.exactBlocker}`,
        exactProtectedAction: PHASE1_LIVE_WORKER_BLOCKER,
        gate,
        boundary,
        dispatchSent: false,
      },
      null,
      2,
    )}\n`,
  );
  process.exit(2);
}

process.stdout.write(
  `${JSON.stringify(
    {
      schema: FACTORY_TEMPORAL_PHASE1_SCHEMA,
      mode: 'dry-run',
      liveWorkerAllowed: false,
      gate,
      boundary,
      spine: FACTORY_CONTROL_PLANE_V1.spine,
      cursorWakePath: FACTORY_CONTROL_PLANE_V1.cursorWakePath,
    },
    null,
    2,
  )}\n`,
);
