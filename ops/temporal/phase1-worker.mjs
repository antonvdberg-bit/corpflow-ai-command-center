#!/usr/bin/env node
/**
 * CorpFlowAI Factory Temporal Phase 1 worker entry (#1032).
 *
 * Dry-run only from Cursor Cloud / CI. `--live` is fail-closed: starting the
 * worker on corpflow-exec-01 needs Anton SSH plus a least-privilege GitHub
 * token and is not performed by this packet.
 */

import {
  FACTORY_CONTROL_PLANE_V1,
  FACTORY_TEMPORAL_PHASE1_SCHEMA,
  PHASE1_LIVE_WORKER_BLOCKER,
  resolveLiveTemporalWorkerGate,
} from '../../lib/server/factory-temporal-phase1.js';

const live = process.argv.includes('--live');
const gate = resolveLiveTemporalWorkerGate(process.env);

if (live) {
  console.error(`NOT READY — ${PHASE1_LIVE_WORKER_BLOCKER}`);
  process.exit(2);
}

process.stdout.write(
  `${JSON.stringify(
    {
      schema: FACTORY_TEMPORAL_PHASE1_SCHEMA,
      mode: 'dry-run',
      liveWorkerAllowed: false,
      gate,
      spine: FACTORY_CONTROL_PLANE_V1.spine,
      cursorWakePath: FACTORY_CONTROL_PLANE_V1.cursorWakePath,
    },
    null,
    2,
  )}\n`,
);
