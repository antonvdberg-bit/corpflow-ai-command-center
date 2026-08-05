import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  ANNUAL_RETURNS_DISCLAIMERS,
  ANNUAL_RETURNS_FEEDBACK_PROMPTS,
  ANNUAL_RETURNS_STATUS_FLOW,
  annualReturnsReviewContentBlob,
  buildAnnualReturnsFeedbackMessage,
} from '../lib/public/cipc-desk-annual-returns-review-content.js';
import {
  CIPCDESK_TENANT_ID,
  isCipcDeskStandingTestHost,
  resolveCipcDeskTenantIdFromHost,
} from '../lib/server/cipc-desk-runtime.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('content pack covers required review UX topics from #761', () => {
  const blob = annualReturnsReviewContentBlob();
  assert.match(blob, /Annual Return is a yearly filing/i);
  assert.match(blob, /not.*SARS tax return/i);
  assert.match(blob, /does not automatically include/i);
  assert.match(blob, /Beneficial Ownership/i);
  assert.match(blob, /information incomplete/i);
  assert.match(blob, /specialist review/i);
  assert.match(blob, /not CIPC/i);
  assert.match(blob, /not guaranteed|cannot guarantee/i);
  assert.match(blob, /approve_with_changes/);
  assert.match(blob, /PROVISIONAL/);
  assert.equal(ANNUAL_RETURNS_STATUS_FLOW.steps.length, 8);
  assert.equal(ANNUAL_RETURNS_FEEDBACK_PROMPTS.topics.length, 6);
  assert.equal(ANNUAL_RETURNS_FEEDBACK_PROMPTS.readiness_options.length, 3);
});

test('disclaimers: independence + no guarantee + test ribbon', () => {
  assert.match(ANNUAL_RETURNS_DISCLAIMERS.independence, /not CIPC/i);
  assert.match(ANNUAL_RETURNS_DISCLAIMERS.independence, /not endorsed by CIPC/i);
  assert.match(ANNUAL_RETURNS_DISCLAIMERS.no_guarantee, /not guaranteed/i);
  assert.match(ANNUAL_RETURNS_DISCLAIMERS.test_ribbon, /TEST ENVIRONMENT/);
  assert.match(ANNUAL_RETURNS_DISCLAIMERS.test_ribbon, /not a public launch/i);
  assert.doesNotMatch(ANNUAL_RETURNS_DISCLAIMERS.test_ribbon, /client_production/i);
});

test('feedback message builder includes readiness and topic sections', () => {
  const msg = buildAnnualReturnsFeedbackMessage({
    readiness: 'approve_with_changes',
    topicNotes: {
      correctness: 'Turnover wording is clear.',
      missing_documents: 'Add mandate example.',
      confusing_wording: '',
      specialist_boundaries: 'External companies earlier.',
      inclusions_exclusions: 'BO separate fee.',
      unsafe_to_publish: 'No fee numbers.',
    },
    overallNotes: 'Ready after mandate template.',
  });
  assert.match(msg, /Annual Returns review feedback/);
  assert.match(msg, /Overall readiness: approve_with_changes/);
  assert.match(msg, /\[Correctness\]/);
  assert.match(msg, /Turnover wording is clear/);
  assert.match(msg, /\[Missing document requirements\]/);
  assert.match(msg, /\[Overall notes\]/);
  assert.match(msg, /Ready after mandate template/);
});

test('page is host-gated to CIPC Desk; reuses tenant intake; no schema/auth', () => {
  const page = readFileSync(join(root, 'pages/annual-returns.js'), 'utf8');
  assert.match(page, /isCipcDeskStandingTestHost/);
  assert.match(page, /CIPCDESK_TENANT_ID/);
  assert.match(page, /notFound:\s*true/);
  assert.match(page, /CipcDeskAnnualReturnsReview/);
  assert.doesNotMatch(page, /prisma\.\$executeRaw|CREATE TABLE|migrate/);

  const component = readFileSync(join(root, 'components/CipcDeskAnnualReturnsReview.js'), 'utf8');
  assert.match(component, /\/api\/tenant\/intake/);
  assert.match(component, /noindex/);
  assert.match(component, /TestEnvironmentRibbon/);
  assert.match(component, /ANNUAL_RETURNS_DISCLAIMERS\.independence/);
  assert.match(component, /ANNUAL_RETURNS_DISCLAIMERS\.no_guarantee/);
  assert.match(component, /meta_feedback_type/);
  assert.doesNotMatch(component, /mailto:.*Annual Returns review feedback/);
  assert.doesNotMatch(component, /new PrismaClient|CREATE TABLE/);
});

test('tenant isolation: standing hosts only; lux/core/apex do not map', () => {
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc.corpflowai.com'), CIPCDESK_TENANT_ID);
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc-desk.corpflowai.com'), CIPCDESK_TENANT_ID);
  assert.equal(isCipcDeskStandingTestHost('cipc.corpflowai.com'), true);
  assert.equal(resolveCipcDeskTenantIdFromHost('lux.corpflowai.com'), null);
  assert.equal(resolveCipcDeskTenantIdFromHost('core.corpflowai.com'), null);
  assert.equal(resolveCipcDeskTenantIdFromHost('corpflowai.com'), null);
  assert.equal(isCipcDeskStandingTestHost('lux.corpflowai.com'), false);
});

test('content does not invent fees, guarantees, or CIPC affiliation', () => {
  const blob = annualReturnsReviewContentBlob();
  assert.doesNotMatch(blob, /R\s?\d{2,}|ZAR\s?\d+/i);
  assert.doesNotMatch(blob, /we guarantee|guaranteed within|official CIPC partner|accredited by CIPC/i);
  assert.doesNotMatch(blob, /client_production/);
});
