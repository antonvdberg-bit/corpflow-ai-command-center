/**
 * Probe #1073 tenant journey continuity on the local auth server.
 * Expects slice2 auth server on SLICE2_AUTH_PORT (default 4790).
 */
import fs from 'node:fs';
import path from 'node:path';

import { CANONICAL_REQUEST_ID, REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  tenantChangeHandoffCreatesTicket,
  tenantChangeHandoffHref,
  tenantWorkspaceReturnHref,
} from '../lib/app/tenant-journey.js';

const PORT = Number(process.env.SLICE2_AUTH_PORT || 4790);
const base = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.resolve('artifacts/tenant-journey-1073');
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

async function getHtml(urlPath) {
  const res = await fetch(base + urlPath);
  const text = await res.text();
  return { status: res.status, text };
}

const evidence = {
  captured_at: new Date().toISOString(),
  issue: 1073,
  parent_issue: 772,
  related: [884, 1006],
  auth_base: base,
  verdict: 'PENDING',
};

const tenantPage = await getHtml('/app/tenant');
const changePage = await getHtml(tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID }));
const returnPage = await getHtml(tenantWorkspaceReturnHref({ tenantId: REFERENCE_TENANT_ID }));

evidence.http = {
  '/app/tenant': tenantPage.status,
  '/change?from=tenant-workspace': changePage.status,
  '/app/tenant?from=change': returnPage.status,
};

const shell = await getJson(`/api/app/shell?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`);
evidence.shell = {
  status: shell.status,
  ok: shell.body.ok === true,
  environment: shell.body.environment,
  tenant_id: shell.body.selected?.tenant_id,
  menus: (shell.body.menus || []).map((m) => m.id),
  change_handoff_href: shell.body.tenant_journey?.change_handoff_href,
  creates_ticket_on_navigation: shell.body.tenant_journey?.creates_ticket_on_navigation,
};

const list = await getJson(`/api/app/requests?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`);
evidence.requests = {
  status: list.status,
  ids: (list.body.requests || []).map((r) => r.request_id),
};

const review = await postJson('/api/app/component-review', {
  request_id: CANONICAL_REQUEST_ID,
  component_key: 'landing_copy',
  decision: 'amend',
  comment: '1073 journey probe — tighten headline.',
  tenant_id: REFERENCE_TENANT_ID,
  env: 'tenant',
});
evidence.review = {
  status: review.status,
  ok: review.body.ok === true,
  decision: review.body.request?.components?.find((c) => c.key === 'landing_copy')?.latest_review?.decision,
};

evidence.html_flags = {
  tenant_has_journey_strip: tenantPage.text.includes('data-testid="tenant-journey-strip"'),
  tenant_has_change_cta: tenantPage.text.includes('data-testid="tenant-open-change"'),
  tenant_omits_home_nav: !tenantPage.text.includes('Home / Overview'),
  change_has_continuity: changePage.text.includes('data-testid="tenant-change-continuity"'),
  change_hides_core: !/href="\/app\/core"/.test(changePage.text),
  change_has_return: changePage.text.includes('data-testid="tenant-change-return"'),
  return_keeps_tenant_shell: returnPage.text.includes('data-environment="tenant"') || returnPage.text.includes('Tenant Workspace'),
  navigation_does_not_create_ticket: tenantChangeHandoffCreatesTicket() === false,
};

const flags = {
  ...evidence.html_flags,
  shell_ok: evidence.shell.ok === true && evidence.shell.environment === 'tenant',
  review_persists: evidence.review.ok === true && evidence.review.decision === 'amend',
  http_ok:
    evidence.http['/app/tenant'] === 200 &&
    evidence.http['/change?from=tenant-workspace'] === 200 &&
    evidence.http['/app/tenant?from=change'] === 200,
};

evidence.verdict = Object.values(flags).every(Boolean)
  ? 'TENANT JOURNEY COHERENT'
  : 'NOT READY — local harness flags incomplete';
evidence.flags = flags;

const out = path.join(OUT_DIR, 'runtime-evidence.json');
fs.writeFileSync(out, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ out, verdict: evidence.verdict, flags }, null, 2));
if (evidence.verdict !== 'TENANT JOURNEY COHERENT') process.exitCode = 1;
