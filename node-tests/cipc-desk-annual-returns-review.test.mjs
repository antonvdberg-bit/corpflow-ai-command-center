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

test('annual returns review content covers required Sarah review sections', () => {
  const c = buildCipcDeskAnnualReturnsReviewContent();
  assert.equal(c.content_version, CIPC_DESK_ANNUAL_RETURNS_REVIEW_VERSION);
  assert.match(String(c.explanation?.body || ''), /not a SARS tax return/i);
  assert.ok(Array.isArray(c.covers?.items) && c.covers.items.length >= 4);
  assert.ok(Array.isArray(c.does_not_cover?.items) && c.does_not_cover.items.length >= 3);
  assert.ok(Array.isArray(c.client_checklist?.groups) && c.client_checklist.groups.length >= 4);
  assert.ok(Array.isArray(c.status_flow?.steps) && c.status_flow.steps.length >= 8);
  assert.ok(Array.isArray(c.exceptions?.items) && c.exceptions.items.length >= 6);
  assert.match(String(c.banners?.independence || ''), /not CIPC/i);
  assert.match(String(c.banners?.no_guarantee || ''), /not guaranteed/i);
  assert.match(String(c.banners?.environment || ''), /corpflow_test/i);

  const blob = JSON.stringify(c);
  assert.doesNotMatch(blob, /we will file within|guaranteed within|official CIPC partner|accredited by CIPC/i);
  assert.doesNotMatch(blob, /R\s?\d{2,}|ZAR\s?\d+/i);
  assert.match(blob, /#750|#758|#740|#761|#791/);
});

test('annual returns v1 reflects Sarah 2026-08-07 decisions', () => {
  const c = buildCipcDeskAnnualReturnsReviewContent();
  const blob = JSON.stringify(c);

  // 1. Customer-code model — both; default client code
  assert.match(blob, /client.?s own CIPC customer code/i);
  assert.match(blob, /authorised practitioner code/i);

  // 2. Standard service = AR filing only; BO/AFS/FAS identified & referred/quoted separately
  assert.match(blob, /Annual Return filing only/i);
  assert.match(blob, /quoted separately/i);
  assert.match(String(c.covers?.tag || ''), /Annual Return filing only/i);

  // 3. Signed engagement/mandate before filing
  assert.match(blob, /signed engagement\s*\/\s*mandate/i);
  assert.match(blob, /before filing/i);

  // 4. Check-only FAS/AFS; do not prepare FAS; refer accountant
  assert.match(blob, /Do not prepare FAS/i);
  assert.match(blob, /Refer accounting matters to an accountant/i);
  assert.doesNotMatch(blob, /prepare FAS for the client|FAS preparation offering/i);

  // 5. Entity scope: Pty Ltd + CC only; NPC later-phase
  assert.match(String(c.entity_scope?.body || ''), /private companies/i);
  assert.match(String(c.entity_scope?.body || ''), /close corporations/i);
  assert.match(String(c.entity_scope?.body || ''), /later-phase/i);
  assert.match(blob, /NPCs and other entit/i);

  // 6. Exact dormant wording
  assert.equal(
    CIPC_DESK_ANNUAL_RETURNS_DORMANT_WORDING,
    'Even if your company is dormant or not trading, Annual Return filing and other statutory obligations may still apply.',
  );
  assert.match(blob, new RegExp(CIPC_DESK_ANNUAL_RETURNS_DORMANT_WORDING.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  // 7. No invented Desk pricing / service-fee figures
  assert.match(blob, /service-fee\/pricing wording out|no Desk service-fee/i);
  assert.doesNotMatch(blob, /R\s?\d{2,}|ZAR\s?\d+|USD\s?\d+/i);

  // 8. Client owns Annual Compliance Checklists
  assert.match(blob, /client completes and takes ownership of Annual Compliance Checklists/i);

  // Approved decisions list present; open-questions style SARAH CONFIRM prompts removed from content
  assert.ok(Array.isArray(c.approved_decisions?.items) && c.approved_decisions.items.length === 8);
  assert.equal(c.open_questions, undefined);
  assert.doesNotMatch(blob, /SARAH CONFIRM/);
  assert.match(String(c.source?.controlling_issue || ''), /#791/);
});

test('process pack records Sarah v1 decisions and approved dormant wording', () => {
  const pack = readFileSync(
    join(root, 'docs/operations/CIPC_DESK_ANNUAL_RETURNS_PROCESS_PACK_V1.md'),
    'utf8',
  );
  assert.match(pack, /#791/);
  assert.match(pack, /Sarah-approved v1 decisions \(2026-08-07\)/);
  assert.match(pack, /default to the client’s own CIPC customer code/i);
  assert.match(pack, /Annual Return filing only/i);
  assert.match(pack, /signed engagement\/mandate/i);
  assert.match(pack, /Do not prepare FAS/i);
  assert.match(pack, /private companies.*close corporations|private companies\*\* and \*\*close corporations/i);
  assert.match(pack, /Even if your company is dormant or not trading, Annual Return filing and other statutory obligations may still apply\./);
  assert.match(pack, /service-fee \/ pricing wording out|Keep \*\*all service-fee/i);
  assert.match(pack, /client completes and takes ownership/i);
  assert.match(pack, /later-phase/i);
  assert.doesNotMatch(pack, /official CIPC partner|accredited by CIPC/i);
  // Closed decisions must not remain tagged SARAH CONFIRM in the decision block
  assert.doesNotMatch(
    pack,
    /Treat checklist support as a separate routing decision \(\*\*SARAH CONFIRM\*\*/,
  );
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
    correctness: 'Synthetic test — BO hard-stop wording is clear.',
    missing_documents: 'None for this synthetic probe.',
    confusing_wording: 'None.',
    specialist_boundaries: 'Trust ownership correctly escalates.',
    inclusions_exclusions: 'AFS preparation correctly excluded.',
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

test('review component posts to existing email-intake and shows approved decisions', () => {
  const src = readFileSync(join(root, 'components/CipcDeskAnnualReturnsReview.js'), 'utf8');
  assert.match(src, /\/api\/cipc-desk\/email-intake/);
  assert.match(src, /buildAnnualReturnsReviewFeedbackEmail/);
  assert.match(src, /noindex/);
  assert.match(src, /not guaranteed|Independence/i);
  assert.doesNotMatch(src, /\/api\/tenant\/intake/);
  assert.match(src, /readiness/);
  assert.match(src, /approve_with_changes/);
  assert.match(src, /approved_decisions/);
  assert.match(src, /entity_scope/);
  assert.doesNotMatch(src, /open_questions/);
});

test('homepage draft links Annual returns service to /annual-returns', () => {
  const draft = buildCipcDeskWebsiteDraft();
  const ar = (draft.sections?.services?.items || []).find(
    (x) => /annual returns/i.test(String(x?.name || '')),
  );
  assert.ok(ar);
  assert.equal(ar.href, '/annual-returns');
  assert.match(String(draft.content_version || ''), /annual-returns-link|director-changes-link/);
});
