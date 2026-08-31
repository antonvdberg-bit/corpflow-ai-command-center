/**
 * Write machine-readable #1194 triage evidence from existing proof fixtures.
 * No live enquiry, send, or production write.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { actorFromSessionPayload, buildProofTenantActor } from '../lib/app/access.js';
import { REFERENCE_TENANT_ID, TENANT_NAV_ITEMS } from '../lib/app/constants.js';
import {
  handleAppActionQueue,
  handleAppProspectDetail,
  handleAppShell,
} from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'artifacts/issue-1194');
const LR_ID = 'syn-1171-lr-enquiry';
const WR_ID = 'syn-1171-wr-enquiry';
const NOW = new Date('2026-08-27T12:00:00.000Z');

function mockRes() {
  /** @type {{ statusCode: number, body: any }} */
  const state = { statusCode: 0, body: null };
  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.body = payload;
      return this;
    },
  };
}

function pickLaunch(row) {
  return {
    id: row.id,
    product: row.product,
    source: row.source,
    consent_contact: row.consent_contact,
    owner: row.owner,
    urgency: row.urgency,
    next_action: row.next_action,
    next_action_due: row.next_action_due || null,
    last_meaningful_activity_at: row.last_meaningful_activity_at,
    canonical_stage: row.canonical_stage,
    exception_signals: row.exception_signals,
    shared_detail_path: row.shared_detail_path,
  };
}

function currentMainSha() {
  try {
    return execSync('git rev-parse origin/main', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  }
}

const prevNode = process.env.NODE_ENV;
const prevVercel = process.env.VERCEL_ENV;
process.env.NODE_ENV = 'development';
delete process.env.VERCEL_ENV;
resetProspectFixtureStore();

try {
  const queueRes = mockRes();
  await handleAppActionQueue(
    { method: 'GET', url: '/api/app/queue?proof=1&env=core&filter=needs_action', headers: {} },
    queueRes,
  );
  const prospects = Array.isArray(queueRes.state.body?.prospects) ? queueRes.state.body.prospects : [];
  const lrQ = prospects.find((row) => row.id === LR_ID);
  const wrQ = prospects.find((row) => row.id === WR_ID);

  const details = {};
  for (const [key, id] of [
    ['lead_rescue', LR_ID],
    ['website_rescue', WR_ID],
  ]) {
    const detailRes = mockRes();
    await handleAppProspectDetail(
      { method: 'GET', url: `/api/app/prospect?proof=1&env=core&id=${id}`, headers: {} },
      detailRes,
    );
    const p = detailRes.state.body?.prospect || {};
    details[key] = {
      status: detailRes.state.statusCode,
      ...pickLaunch(p),
      current_blocker: p.current_blocker,
      external_send: detailRes.state.body?.external_send === true,
    };
  }

  process.env.NODE_ENV = 'test';
  const tenantQueue = mockRes();
  await handleAppActionQueue(
    {
      method: 'GET',
      url: '/api/app/queue?env=core',
      headers: {},
      __testAppActor: buildProofTenantActor(),
    },
    tenantQueue,
  );
  const tenantSession = actorFromSessionPayload({
    typ: 'tenant',
    tenant_id: REFERENCE_TENANT_ID,
    username: 'tenant-user',
  });
  const tenantProofQueue = mockRes();
  await handleAppActionQueue(
    {
      method: 'GET',
      url: '/api/app/queue?proof=1&env=tenant',
      headers: {},
      __testAppActor: tenantSession,
    },
    tenantProofQueue,
  );
  process.env.NODE_ENV = 'development';
  const tenantShell = mockRes();
  await handleAppShell(
    { method: 'GET', url: '/api/app/shell?proof=1&env=tenant', headers: {} },
    tenantShell,
  );

  const evidence = {
    issue: 1194,
    current_main: currentMainSha(),
    now: NOW.toISOString(),
    route_sequence: [
      'buyer-enquiry fixture syn-1171-lr-enquiry / syn-1171-wr-enquiry',
      '/app/queue?proof=1&filter=needs_action',
      `/app/prospects/${LR_ID}?proof=1`,
      `/app/prospects/${WR_ID}?proof=1`,
    ],
    queue: {
      status: queueRes.state.statusCode,
      path: queueRes.state.body?.path || null,
      filter: 'needs_action',
      data_source: queueRes.state.body?.data_source || 'fixture',
      external_send: queueRes.state.body?.external_send === true,
      launch: {
        lead_rescue: lrQ ? pickLaunch(lrQ) : null,
        website_rescue: wrQ ? pickLaunch(wrQ) : null,
      },
    },
    detail: details,
    tenant_boundary: {
      tenant_session_queue: {
        status: tenantQueue.state.statusCode,
        error: tenantQueue.state.body?.error || null,
      },
      tenant_proof_queue: {
        status: tenantProofQueue.state.statusCode,
        error: tenantProofQueue.state.body?.error || null,
      },
      tenant_shell_menu_ids: Array.isArray(tenantShell.state.body?.menus)
        ? tenantShell.state.body.menus.map((item) => item.id)
        : TENANT_NAV_ITEMS.map((item) => item.id),
    },
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outFile = join(OUT_DIR, 'triage-evidence.json');
  writeFileSync(outFile, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log('wrote', outFile);
} finally {
  process.env.NODE_ENV = prevNode;
  if (prevVercel == null) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = prevVercel;
  resetProspectFixtureStore();
}
