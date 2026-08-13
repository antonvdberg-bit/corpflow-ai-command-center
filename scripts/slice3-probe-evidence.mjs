/**
 * Probe Slice 3 review flow on the local auth server and write runtime evidence JSON.
 * Expects slice2 auth server (same /api/app handlers) on SLICE2_AUTH_PORT (default 4790).
 */
import fs from 'node:fs';
import path from 'node:path';

import { CANONICAL_REQUEST_ID, REFERENCE_TENANT_ID } from '../lib/app/constants.js';

const PORT = Number(process.env.SLICE2_AUTH_PORT || 4790);
const base = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.resolve('artifacts/slice3-screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function getJson(urlPath) {
  const res = await fetch(base + urlPath);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function postJson(urlPath, payload) {
  const res = await fetch(base + urlPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function getStatus(urlPath) {
  const res = await fetch(base + urlPath);
  return res.status;
}

const evidence = {
  captured_at: new Date().toISOString(),
  issue: 883,
  parent_issue: 773,
  prerequisite_pr: 878,
  branch: 'cursor/dispatcher-issue-883-c5b7',
  auth_base: base,
  persistence_contract: 'cmp_tickets.console_json (existing column) or fixture_store.console_json',
  http: {
    '/app/core': await getStatus('/app/core'),
    '/app/tenant': await getStatus('/app/tenant'),
  },
};

const coreShell = await getJson('/api/app/shell?env=core');
evidence.core_shell = {
  status: coreShell.status,
  ok: coreShell.body.ok === true,
  slice: coreShell.body.slice,
  mutations_enabled: coreShell.body.mutations_enabled,
  persistence_path: coreShell.body.persistence_path,
  data_source: coreShell.body.data_source,
  auth_mode: coreShell.body.auth_mode,
};

// 1) Hide landing_copy, prove Tenant cannot review
const hide = await postJson('/api/app/component-expose', {
  request_id: CANONICAL_REQUEST_ID,
  component_key: 'landing_copy',
  exposed: false,
  env: 'core',
});
evidence.hide = {
  status: hide.status,
  ok: hide.body.ok === true,
  exposed: hide.body.exposed,
  persistence_path: hide.body.persistence_path,
};

const blocked = await postJson('/api/app/component-review', {
  request_id: CANONICAL_REQUEST_ID,
  component_key: 'landing_copy',
  decision: 'approve',
  tenant_id: REFERENCE_TENANT_ID,
  env: 'tenant',
});
evidence.blocked_when_hidden = {
  status: blocked.status,
  error: blocked.body.error,
};

// 2) Expose landing_copy
const expose = await postJson('/api/app/component-expose', {
  request_id: CANONICAL_REQUEST_ID,
  component_key: 'landing_copy',
  exposed: true,
  env: 'core',
});
evidence.expose = {
  status: expose.status,
  ok: expose.body.ok === true,
  exposed: expose.body.exposed,
  review_state: expose.body.request?.components?.find((c) => c.key === 'landing_copy')
    ?.review_state,
  persistence_path: expose.body.persistence_path,
};

// 3) Tenant detail — only landing_copy has review controls; internal view-only
const tenantDetail = await getJson(
  `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${CANONICAL_REQUEST_ID}`,
);
const tComps = tenantDetail.body.request?.components || [];
const tLanding = tComps.find((c) => c.key === 'landing_copy');
const tInternal = tComps.find((c) => c.key === 'internal_wiring');
const tenantBlob = JSON.stringify(tenantDetail.body.request || {});
evidence.tenant_detail = {
  status: tenantDetail.status,
  landing_review_enabled: tLanding?.review_enabled === true,
  landing_review_state: tLanding?.review_state,
  internal_view_only: tInternal?.view_only === true,
  forbidden_absent: ['github', 'commit_sha', 'internal_note', 'technical_lead', 'pr_number'].filter(
    (k) => !tenantBlob.includes(`"${k}"`),
  ),
};

// 4) Tenant amend (comment + changes requested)
const amend = await postJson('/api/app/component-review', {
  request_id: CANONICAL_REQUEST_ID,
  component_key: 'landing_copy',
  decision: 'amend',
  comment: 'Synthetic Slice 3 comment — please tighten the headline.',
  tenant_id: REFERENCE_TENANT_ID,
  env: 'tenant',
});
evidence.tenant_amend = {
  status: amend.status,
  ok: amend.body.ok === true,
  decision: amend.body.decision,
  external_send: amend.body.external_send,
  persistence_path: amend.body.persistence_path,
  landing_milestone: amend.body.request?.components?.find((c) => c.key === 'landing_copy')
    ?.milestone,
  landing_review_state: amend.body.request?.components?.find((c) => c.key === 'landing_copy')
    ?.review_state,
};

// 5) Non-exposed internal review rejected
const internalBlocked = await postJson('/api/app/component-review', {
  request_id: CANONICAL_REQUEST_ID,
  component_key: 'internal_wiring',
  decision: 'approve',
  tenant_id: REFERENCE_TENANT_ID,
  env: 'tenant',
});
evidence.internal_blocked = {
  status: internalBlocked.status,
  error: internalBlocked.body.error,
};

// 6) Core sees client decision
const coreDetail = await getJson(`/api/app/request?env=core&id=${CANONICAL_REQUEST_ID}`);
const cLanding = coreDetail.body.request?.components?.find((c) => c.key === 'landing_copy');
evidence.core_sees_decision = {
  status: coreDetail.status,
  review_state: cLanding?.review_state,
  latest_decision: cLanding?.latest_client_decision || null,
  has_github_on_core: Boolean(cLanding?.github),
};

evidence.acceptance = {
  core_can_expose: evidence.expose.ok === true,
  tenant_controls_only_exposed: evidence.tenant_detail.landing_review_enabled === true,
  tenant_can_comment_and_decide: evidence.tenant_amend.ok === true,
  core_sees_evidence: evidence.core_sees_decision.latest_decision?.decision === 'amend',
  internal_view_only: evidence.tenant_detail.internal_view_only === true,
  internal_review_rejected: evidence.internal_blocked.error === 'component_not_exposed',
  tenant_no_internal_fields: evidence.tenant_detail.forbidden_absent.length === 5,
  persistence_path_reported: Boolean(evidence.expose.persistence_path),
};

const outFile = path.join(OUT_DIR, 'runtime-evidence.json');
fs.writeFileSync(outFile, JSON.stringify(evidence, null, 2));
console.log('wrote', outFile);
console.log(JSON.stringify(evidence.acceptance, null, 2));

const allOk = Object.values(evidence.acceptance).every((v) => v === true);
if (!allOk) {
  console.error('Slice 3 probe acceptance incomplete');
  process.exit(1);
}
console.log('Slice 3 probe PASS');
