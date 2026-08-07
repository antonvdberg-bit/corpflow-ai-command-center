import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CIPC_DESK_ANNUAL_RETURNS_DORMANT_WORDING,
  CIPC_DESK_ANNUAL_RETURNS_FEEDBACK_SUBJECT,
  CIPC_DESK_ANNUAL_RETURNS_REVIEW_VERSION,
  buildAnnualReturnsReviewFeedbackEmail,
  buildCipcDeskAnnualReturnsReviewContent,
  resolveCipcDeskAnnualReturnsPageAccess,
} from '../lib/cipc-desk/annual-returns-review.js';
import { resolveCipcDeskTenantIdFromHost } from '../lib/server/cipc-desk-runtime.js';
import { buildCipcDeskWebsiteDraft } from '../lib/server/cipc-desk-website-draft.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('annual returns review content reflects Sarah-approved v1 boundaries (#791)', () => {
  const c = buildCipcDeskAnnualReturnsReviewContent();
  assert.equal(c.content_version, CIPC_DESK_ANNUAL_RETURNS_REVIEW_VERSION);
  assert.match(String(c.explanation?.body || ''), /not a SARS tax return/i);
  assert.ok(Array.isArray(c.covers?.items) && c.covers.items.length >= 4);
  assert.ok(Array.isArray(c.does_not_cover?.items) && c.does_not_cover.items.length >= 3);
  assert.ok(Array.isArray(c.client_checklist?.groups) && c.client_checklist.groups.length >= 4);
  assert.ok(Array.isArray(c.status_flow?.steps) && c.status_flow.steps.length >= 8);
  assert.ok(Array.isArray(c.exceptions?.items) && c.exceptions.items.length >= 6);
  assert.ok(Array.isArray(c.approved_decisions?.items) && c.approved_decisions.items.length === 8);
  assert.match(String(c.banners?.independence || ''), /not CIPC/i);
  assert.match(String(c.banners?.no_guarantee || ''), /not guaranteed/i);
  assert.match(String(c.banners?.environment || ''), /corpflow_test/i);
  assert.match(String(c.banners?.sarah_approved || ''), /2026-08-07/);

  const blob = JSON.stringify(c);
  assert.doesNotMatch(blob, /we will file within|guaranteed within|official CIPC partner|accredited by CIPC/i);
  assert.doesNotMatch(blob, /R\s?\d{2,}|ZAR\s?\d+/i);
  assert.doesNotMatch(blob, /SARAH CONFIRM/i);
  assert.match(blob, /do not prepare FAS|without preparing FAS/i);
  assert.doesNotMatch(blob, /we prepare FAS|FAS preparation included|prepare FAS for the client/i);
  assert.match(blob, /#791|#750|#758|#761/);
  assert.match(blob, /private compan|close corporation/i);
  assert.match(blob, /later-phase/i);
  assert.match(blob, /signed engagement\/mandate/i);
  assert.match(blob, /client.?s own CIPC customer code/i);
  assert.match(blob, /Annual Return filing only/i);
  assert.match(blob, /client completes and takes ownership/i);
  assert.equal(c.dormant?.body, CIPC_DESK_ANNUAL_RETURNS_DORMANT_WORDING);
  assert.match(
    CIPC_DESK_ANNUAL_RETURNS_DORMANT_WORDING,
    /Even if your company is dormant or not trading, Annual Return filing and other statutory obligations may still apply\./,
  );
  assert.match(String(c.entity_scope?.body || ''), /private companies/i);
  assert.match(String(c.entity_scope?.body || ''), /close corporations/i);
  assert.match(String(c.entity_scope?.body || ''), /NPC/i);
});

test('process pack documents the eight Sarah-approved v1 decisions', () => {
  const pack = readFileSync(
    join(root, 'docs/operations/CIPC_DESK_ANNUAL_RETURNS_PROCESS_PACK_V1.md'),
    'utf8',
  );
  assert.match(pack, /#791/);
  assert.match(pack, /SARAH-APPROVED \(v1\)/);
  assert.match(pack, /client’s own CIPC customer code|client's own CIPC customer code/);
  assert.match(pack, /Annual Return filing only/);
  assert.match(pack, /signed engagement\/mandate/);
  assert.match(pack, /Do not prepare FAS/);
  assert.match(pack, /private companies.*close corporations|Private companies.*close corporations/i);
  assert.match(pack, CIPC_DESK_ANNUAL_RETURNS_DORMANT_WORDING);
  assert.match(pack, /Keep \*\*all\*\* service-fee|Keep all service-fee|no Desk service-fee/i);
  assert.match(pack, /client completes and takes ownership/i);
  assert.doesNotMatch(pack, /SARAH CONFIRM/);
  assert.match(pack, /Do not prepare FAS/);
  assert.doesNotMatch(pack, /R\s?\d{2,}|ZAR\s?\d+/);
});

test('feedback email builder requires readiness + at least one comment', () => {
  const missing = buildAnnualReturnsReviewFeedbackEmail({
    correctness: 'Looks fine',
  });
  assert.equal(missing.ok, false);

  const empty = buildAnnualReturnsReviewFeedbackEmail({
    readiness: 'approve',
  });
  assert.equal(empty.ok, false);

  const ok = buildAnnualReturnsReviewFeedbackEmail({
    readiness: 'approve_with_changes',
    correctness: 'Synthetic test — BO identify-and-refer wording is clear.',
    missing_documents: 'None for this synthetic probe.',
    confusing_wording: 'None.',
    specialist_boundaries: 'NPC correctly treated as later-phase.',
    inclusions_exclusions: 'FAS preparation correctly excluded.',
    unsafe_to_publish: 'No fee numbers present — good.',
    reviewer_name: 'Synthetic reviewer (#791)',
  });
  assert.equal(ok.ok, true);
  assert.match(ok.email_text, new RegExp(CIPC_DESK_ANNUAL_RETURNS_FEEDBACK_SUBJECT));
  assert.match(ok.email_text, /annual returns/i);
  assert.match(ok.email_text, /Approve with changes/);
  assert.match(ok.email_text, /No real client data/);
  assert.match(ok.email_text, /Synthetic test/);
  assert.match(ok.email_text, /#791/);
});

test('page access fails closed for non-cipc tenants', () => {
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc.corpflowai.com'), 'cipc-desk');

  const standing = resolveCipcDeskAnnualReturnsPageAccess({ host: 'cipc.corpflowai.com' });
  assert.equal(standing.allowed, true);
  assert.equal(standing.tenantId, 'cipc-desk');

  const alias = resolveCipcDeskAnnualReturnsPageAccess({ host: 'cipc-desk.corpflowai.com' });
  assert.equal(alias.allowed, true);

  const lux = resolveCipcDeskAnnualReturnsPageAccess({
    host: 'lux.corpflowai.com',
    tenantIdFromDb: 'luxe-maurice',
  });
  assert.equal(lux.allowed, false);
  assert.equal(lux.reason, 'TENANT_SCOPE_MISMATCH');

  const unknown = resolveCipcDeskAnnualReturnsPageAccess({ host: 'example.com' });
  assert.equal(unknown.allowed, false);

  const previewOk = resolveCipcDeskAnnualReturnsPageAccess({
    host: 'corpflow-ai-command-center-abc.vercel.app',
    previewTenantId: 'cipc-desk',
  });
  assert.equal(previewOk.allowed, true);
  assert.equal(previewOk.reason, 'preview_token');
});

test('pages/annual-returns gates on cipc-desk and renders review component', () => {
  const page = readFileSync(join(root, 'pages/annual-returns.js'), 'utf8');
  assert.match(page, /CipcDeskAnnualReturnsReview/);
  assert.match(page, /resolveCipcDeskAnnualReturnsPageAccess/);
  assert.match(page, /notFound: true/);
  assert.match(page, /buildCipcDeskAnnualReturnsReviewContent/);
});

test('review component posts to existing email-intake and surfaces approved decisions', () => {
  const src = readFileSync(join(root, 'components/CipcDeskAnnualReturnsReview.js'), 'utf8');
  assert.match(src, /\/api\/cipc-desk\/email-intake/);
  assert.match(src, /buildAnnualReturnsReviewFeedbackEmail/);
  assert.match(src, /noindex/);
  assert.match(src, /not guaranteed|Independence/i);
  assert.match(src, /approvedDecisions|approved_decisions/);
  assert.match(src, /entityScope|entity_scope/);
  assert.match(src, /dormant/);
  assert.doesNotMatch(src, /\/api\/tenant\/intake/);
  assert.doesNotMatch(src, /openQuestions|open_questions/);
  assert.match(src, /readiness/);
  assert.match(src, /approve_with_changes/);
});

test('homepage draft links Annual returns service to /annual-returns', () => {
  const draft = buildCipcDeskWebsiteDraft();
  const ar = (draft.sections?.services?.items || []).find(
    (x) => /annual returns/i.test(String(x?.name || '')),
  );
  assert.ok(ar);
  assert.equal(ar.href, '/annual-returns');
  assert.match(String(draft.content_version || ''), /annual-returns-link/);
});
