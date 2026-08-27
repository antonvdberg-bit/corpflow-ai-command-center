#!/usr/bin/env node
/**
 * CorpFlowAI Factory Temporal real-production pilot worker entry (#1130).
 *
 * Dry-run from Cursor Cloud / CI. `--live` is fail-closed here: starting the
 * 72-hour pilot is the exact Anton GitHub activation packet only and must not
 * workflow_dispatch Handoff from this process (loop risk).
 */

import {
  FACTORY_CONTROL_PLANE_V1,
  FACTORY_TEMPORAL_PILOT_SCHEMA,
  PILOT_EXACT_PROTECTED_ACTION,
  PILOT_LIVE_ACTIVATION_APPROVAL_MARKER,
  evaluateLiveActivationBoundary,
  resolveLiveTemporalPilotGate,
} from '../../lib/server/factory-temporal-pilot.js';

const live = process.argv.includes('--live');
const gate = resolveLiveTemporalPilotGate(process.env);
const boundary = evaluateLiveActivationBoundary({
  comments: [{ body: PILOT_LIVE_ACTIVATION_APPROVAL_MARKER }],
  env: process.env,
  githubActions: false,
  ref: 'cursor-cloud',
});

if (live) {
  process.stderr.write(
    `${JSON.stringify(
      {
        schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
        mode: 'live',
        verdict: `NOT READY — ${boundary.exactBlocker}`,
        exactProtectedAction: PILOT_EXACT_PROTECTED_ACTION,
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
      schema: FACTORY_TEMPORAL_PILOT_SCHEMA,
      mode: 'dry-run',
      liveWorkerAllowed: false,
      gate,
      boundary,
      spine: FACTORY_CONTROL_PLANE_V1.spine,
      cursorWakePath: FACTORY_CONTROL_PLANE_V1.cursorWakePath,
      wipMaxSlots: FACTORY_CONTROL_PLANE_V1.wipMaxSlots,
    },
    null,
    2,
  )}\n`,
);
