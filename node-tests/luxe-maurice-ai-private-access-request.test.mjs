import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LUXE_MAURICE_AI_ACCESS_REQUEST_INTENT,
  LUXE_MAURICE_AI_ACCESS_REQUEST_SOURCE,
  LUXE_MAURICE_AI_TENANT_SLUG,
  buildLivePrivateAccessConfirmation,
  buildPrivateAccessLeadCreateInput,
  buildPrivateAccessLeadListWhere,
  buildPrivateAccessQualificationJson,
  formatPrivateAccessReferenceId,
  isPrivateAccessLeadRow,
  mapLeadRowToAdvisorPipelineItem,
  resolveLuxeMauriceAccessRequestTenant,
  validatePrivateAccessRequestBody,
} from '../lib/luxe-maurice-ai/private-access-request.js';
import {
  resolveLuxeMauriceAdvisorPipelineSession,
} from '../lib/server/luxe-maurice-ai-private-access-request.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

test('private access request: validates required fields', () => {
  const missing = validatePrivateAccessRequestBody({});
  assert.equal(missing.ok, false);
  assert.equal(missing.field, 'full_name');

  const badEmail = validatePrivateAccessRequestBody({ full_name: 'Jan Test', email: 'not-an-email' });
  assert.equal(badEmail.ok, false);
  assert.equal(badEmail.field, 'email');

  const ok = validatePrivateAccessRequestBody({
    full_name: 'Jan Test',
    email: 'jan@luxemaurice.com',
    access_category: 'yacht_marine',
    budget_min: '18000',
    access_intent: 'Seasonal window',
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.data.email, 'jan@luxemaurice.com');
  assert.equal(ok.data.access_category, 'yacht_marine');
});

test('private access request: rejects invalid access category', () => {
  const result = validatePrivateAccessRequestBody({
    full_name: 'Jan Test',
    email: 'jan@luxemaurice.com',
    access_category: 'invalid_category',
  });
  assert.equal(result.ok, false);
  assert.equal(result.field, 'access_category');
});

test('private access request: tenant context cannot be overridden by client payload', () => {
  const luxHost = resolveLuxeMauriceAccessRequestTenant({
    corpflowContext: { surface: 'tenant', tenant_id: 'luxe-maurice' },
  });
  assert.equal(luxHost.ok, true);
  assert.equal(luxHost.tenantId, LUXE_MAURICE_AI_TENANT_SLUG);

  const wrongTenant = resolveLuxeMauriceAccessRequestTenant({
    corpflowContext: { surface: 'tenant', tenant_id: 'france' },
    body: { tenant_id: 'luxe-maurice' },
  });
  assert.equal(wrongTenant.ok, false);
  assert.equal(wrongTenant.status, 403);

  const coreHost = resolveLuxeMauriceAccessRequestTenant({
    corpflowContext: { surface: 'core', tenant_id: null },
    body: { tenant_id: 'luxe-maurice' },
  });
  assert.equal(coreHost.ok, false);
  assert.equal(coreHost.status, 400);
});

test('private access request: builds lead row for existing leads table', () => {
  const nowIso = '2026-07-13T10:00:00.000Z';
  const data = {
    full_name: 'Jan Test',
    email: 'jan@luxemaurice.com',
    phone: '+23055081350',
    access_category: 'aviation_vip',
    access_intent: 'Ready within 3 months',
    notes: 'VIP arrival coordination',
    property_slug: 'vip-arrival-aviation-service',
  };
  const workflow = { stage: 'new', activity: [] };
  const row = buildPrivateAccessLeadCreateInput(data, LUXE_MAURICE_AI_TENANT_SLUG, nowIso, workflow);

  assert.equal(row.tenantId, 'luxe-maurice');
  assert.equal(row.intent, LUXE_MAURICE_AI_ACCESS_REQUEST_INTENT);
  assert.equal(row.listing, 'vip-arrival-aviation-service');
  assert.equal(row.qualificationJson.access_request.source, LUXE_MAURICE_AI_ACCESS_REQUEST_SOURCE);
  assert.equal(row.qualificationJson.access_request.status, 'review_required');
  assert.equal(row.qualificationJson.access_request.access_category, 'aviation_vip');
});

test('private access request: live confirmation returns safe reference id', () => {
  const confirmation = buildLivePrivateAccessConfirmation(
    { id: 'clx1234567890abcdef', createdAt: new Date('2026-07-13T10:00:00.000Z'), status: 'new' },
    { full_name: 'Jan Test', email: 'jan@luxemaurice.com', access_category: 'residence' },
  );

  assert.equal(confirmation.ok, true);
  assert.equal(confirmation.live_persistence, true);
  assert.match(confirmation.reference_id, /^LM-REQ-/);
  assert.match(confirmation.message, /received for advisor review/i);
  assert.equal(formatPrivateAccessReferenceId('clx1234567890abcdef').startsWith('LM-REQ-'), true);
});

test('private access request: buyer form uses server endpoint', () => {
  const src = readRepo('pages/client/luxe-maurice-ai/buyer.js');
  assert.match(src, /\/api\/lux\/luxe-maurice-ai\/private-access-request/);
  assert.match(src, /fetch\(/);
  assert.match(src, /reference_id/);
  assert.match(src, /received for advisor review/i);
  assert.doesNotMatch(src, /createEnquiry/);
  assert.doesNotMatch(src, /localStorage/i);
});

test('private access request: factory router registers lux routes', () => {
  const src = readRepo('api/factory_router.js');
  assert.match(src, /lux\/luxe-maurice-ai\/private-access-request/);
  assert.match(src, /lux\/luxe-maurice-ai\/private-access-requests/);
  assert.match(src, /handleLuxeMauriceAiPrivateAccessRequest/);
  assert.match(src, /handleLuxeMauriceAiPrivateAccessRequestsList/);
});

test('private access request: list filters by tenant and intent', () => {
  const where = buildPrivateAccessLeadListWhere(LUXE_MAURICE_AI_TENANT_SLUG);
  assert.equal(where.tenantId, 'luxe-maurice');
  assert.equal(where.intent, LUXE_MAURICE_AI_ACCESS_REQUEST_INTENT);

  const luxRow = {
    id: 'clx123',
    intent: LUXE_MAURICE_AI_ACCESS_REQUEST_INTENT,
    qualificationJson: {
      access_request: { source: LUXE_MAURICE_AI_ACCESS_REQUEST_SOURCE, access_category: 'residence' },
    },
    name: 'Jan Test',
    email: 'jan@luxemaurice.com',
    createdAt: '2026-07-13T10:00:00.000Z',
  };
  assert.equal(isPrivateAccessLeadRow(luxRow), true);

  const wrongIntent = { ...luxRow, intent: 'concierge' };
  assert.equal(isPrivateAccessLeadRow(wrongIntent), false);

  const wrongSource = {
    ...luxRow,
    qualificationJson: { access_request: { source: 'other-source' } },
  };
  assert.equal(isPrivateAccessLeadRow(wrongSource), false);

  const mapped = mapLeadRowToAdvisorPipelineItem(luxRow);
  assert.ok(mapped);
  assert.match(mapped.reference_id, /^LM-REQ-/);
  assert.equal(mapped.access_category, 'residence');
  assert.equal(mapped.persisted, true);
  assert.equal(mapLeadRowToAdvisorPipelineItem(wrongIntent), null);
});

test('private access request: advisor list requires luxe-maurice tenant session', () => {
  const luxTenant = resolveLuxeMauriceAdvisorPipelineSession({
    corpflowContext: { surface: 'tenant', tenant_id: 'luxe-maurice' },
    headers: {},
  });
  assert.equal(luxTenant.ok, false);
  assert.equal(luxTenant.status, 403);

  const wrongHost = resolveLuxeMauriceAdvisorPipelineSession({
    corpflowContext: { surface: 'tenant', tenant_id: 'france' },
    headers: {},
  });
  assert.equal(wrongHost.ok, false);
  assert.equal(wrongHost.status, 403);
});

test('private access request: client tenant_id cannot override list tenant context', () => {
  const wrongTenant = resolveLuxeMauriceAccessRequestTenant({
    corpflowContext: { surface: 'tenant', tenant_id: 'france' },
    query: { tenant_id: 'luxe-maurice' },
  });
  assert.equal(wrongTenant.ok, false);
  assert.equal(wrongTenant.status, 403);
});

test('private access request: client-facing copy avoids forbidden internal terms', () => {
  const buyer = readRepo('pages/client/luxe-maurice-ai/buyer.js');
  const forbidden = [/\bmock\b/i, /\bfake\b/i, /\bCursor\b/, /\bGitHub\b/, /\bSupabase\b/, /localStorage/i, /service_role/i];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(buyer), false, `forbidden pattern ${pattern} in buyer.js`);
  }
});
