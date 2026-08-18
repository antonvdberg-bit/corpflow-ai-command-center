import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CIPC_DESK_DIRECTOR_CHANGES_FEEDBACK_SUBJECT,
  CIPC_DESK_DIRECTOR_CHANGES_REVIEW_VERSION,
  buildDirectorChangesReviewFeedbackEmail,
  buildCipcDeskDirectorChangesReviewContent,
  resolveCipcDeskDirectorChangesPageAccess,
} from '../lib/cipc-desk/director-changes-review.js';
import { resolveCipcDeskTenantIdFromHost } from '../lib/server/cipc-desk-runtime.js';
import { buildCipcDeskWebsiteDraft } from '../lib/server/cipc-desk-website-draft.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('director changes review content covers required six-layer sections', () => {
  const c = buildCipcDeskDirectorChangesReviewContent();
  assert.equal(c.content_version, CIPC_DESK_DIRECTOR_CHANGES_REVIEW_VERSION);
  assert.match(String(c.explanation?.body || ''), /not an Annual Return/i);
  assert.match(String(c.explanation?.body || ''), /CoR39/i);
  assert.ok(Array.isArray(c.scenarios?.items) && c.scenarios.items.length >= 5);
  assert.ok(Array.isArray(c.covers?.items) && c.covers.items.length >= 4);
  assert.ok(Array.isArray(c.does_not_cover?.items) && c.does_not_cover.items.length >= 3);
  assert.ok(Array.isArray(c.client_checklist?.groups) && c.client_checklist.groups.length >= 5);
  assert.ok(Array.isArray(c.operator_notes?.items) && c.operator_notes.items.length >= 4);
  assert.ok(Array.isArray(c.status_flow?.steps) && c.status_flow.steps.length >= 8);
  assert.ok(Array.isArray(c.exceptions?.items) && c.exceptions.items.length >= 8);
  assert.ok(Array.isArray(c.open_questions?.items) && c.open_questions.items.length === 10);
  assert.match(String(c.banners?.independence || ''), /not CIPC/i);
  assert.match(String(c.banners?.no_guarantee || ''), /not guaranteed/i);
  assert.match(String(c.banners?.environment || ''), /corpflow_test/i);
  assert.match(String(c.banners?.provisional || ''), /SARAH CONFIRM/i);

  const blob = JSON.stringify(c);
  assert.doesNotMatch(blob, /we will file within|guaranteed within|official CIPC partner|accredited by CIPC/i);
  // CoR39 is the official CIPC form name, not a rand amount.
  assert.doesNotMatch(blob.replace(/CoR39/gi, ''), /R\s?\d{2,}|ZAR\s?\d+|USD\s?\d+/i);
  assert.match(blob, /#980|#740|#640/);
  assert.match(blob, /SARAH CONFIRM/);
  assert.equal(c.approved_decisions, undefined);
});

test('standard scenarios stay distinct from death and removal exceptions', () => {
  const c = buildCipcDeskDirectorChangesReviewContent();
  const names = (c.scenarios?.items || []).map((x) => String(x?.name || ''));
  assert.ok(names.some((n) => /appointment/i.test(n)));
  assert.ok(names.some((n) => /resignation/i.test(n)));
  assert.ok(names.some((n) => /particulars/i.test(n)));
  assert.ok(names.some((n) => /term expiry|retirement/i.test(n)));
  assert.ok(names.some((n) => /death|removal/i.test(n)));

  const death = (c.scenarios?.items || []).find((x) => /death|removal/i.test(String(x?.name || '')));
  assert.match(String(death?.posture || ''), /specialist|exception/i);
  assert.doesNotMatch(String(death?.posture || ''), /standard review path/i);

  const blob = JSON.stringify(c);
  assert.match(blob, /Do not file these as a normal resignation|not a standard resignation/i);
  assert.match(blob, /less than one director/i);
  assert.match(blob, /practice note 2 of 2021/i);
});

test('process pack records six layers, official sources, and open Sarah questions', () => {
  const pack = readFileSync(
    join(root, 'docs/operations/CIPC_DESK_DIRECTOR_CHANGES_PROCESS_PACK_V1.md'),
    'utf8',
  );
  assert.match(pack, /#980/);
  assert.match(pack, /#740/);
  assert.match(pack, /Layer 1 — Customer explanation/);
  assert.match(pack, /Layer 2 — Client intake checklist/);
  assert.match(pack, /Layer 3 — Operator checklist/);
  assert.match(pack, /Layer 4 — Specialist validation notes/);
  assert.match(pack, /Layer 5 — Customer status workflow/);
  assert.match(pack, /Layer 6 — Exceptions and Escalations/);
  assert.match(pack, /https:\/\/www\.cipc\.co\.za\/\?p=9706/);
  assert.match(pack, /https:\/\/www\.cipc\.co\.za\/\?p=20411/);
  assert.match(pack, /eServicesCOR39@cipc\.co\.za/);
  assert.match(pack, /SARAH CONFIRM/);
  assert.match(pack, /https:\/\/cipc\.corpflowai\.com\/director-changes/);
  assert.match(pack, /Not Sarah-approved|not Sarah-approved/);
  assert.doesNotMatch(pack, /official CIPC partner|accredited by CIPC/i);
  assert.doesNotMatch(pack, /we will file within|guaranteed within/i);
});

test('feedback email builder requires readiness + at least one comment', () => {
  const missing = buildDirectorChangesReviewFeedbackEmail({
    correctness: 'Looks fine',
  });
  assert.equal(missing.ok, false);

  const empty = buildDirectorChangesReviewFeedbackEmail({
    readiness: 'approve',
  });
  assert.equal(empty.ok, false);

  const ok = buildDirectorChangesReviewFeedbackEmail({
    readiness: 'approve_with_changes',
    correctness: 'Synthetic test — death/removal stays an exception.',
    missing_documents: 'None for this synthetic probe.',
    confusing_wording: 'None.',
    specialist_boundaries: 'Term expiry correctly stays SARAH CONFIRM.',
    inclusions_exclusions: 'No invented fees.',
    unsafe_to_publish: 'No fee numbers present — good.',
    reviewer_name: 'Synthetic reviewer (#980)',
  });
  assert.equal(ok.ok, true);
  assert.match(ok.email_text, new RegExp(CIPC_DESK_DIRECTOR_CHANGES_FEEDBACK_SUBJECT));
  assert.match(ok.email_text, /director changes/i);
  assert.match(ok.email_text, /Approve with changes/);
  assert.match(ok.email_text, /No real client data/);
  assert.match(ok.email_text, /Synthetic test/);
  assert.match(ok.email_text, /#980/);

  const intake = readFileSync(join(root, 'lib/server/cipc-desk-email-intake.js'), 'utf8');
  assert.match(intake, /director\\s\+\(change\|amendment\|appointment\|resignation\|retirement\|particular\)/);
  assert.match(intake, /serviceSlug: 'director-appointments-resignations'/);
  assert.match(ok.email_text, /director changes/i);
});

test('page access fails closed for non-cipc tenants', () => {
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc.corpflowai.com'), 'cipc-desk');

  const standing = resolveCipcDeskDirectorChangesPageAccess({ host: 'cipc.corpflowai.com' });
  assert.equal(standing.allowed, true);
  assert.equal(standing.tenantId, 'cipc-desk');

  const alias = resolveCipcDeskDirectorChangesPageAccess({ host: 'cipc-desk.corpflowai.com' });
  assert.equal(alias.allowed, true);

  const lux = resolveCipcDeskDirectorChangesPageAccess({
    host: 'lux.corpflowai.com',
    tenantIdFromDb: 'luxe-maurice',
  });
  assert.equal(lux.allowed, false);
  assert.equal(lux.reason, 'TENANT_SCOPE_MISMATCH');

  const unknown = resolveCipcDeskDirectorChangesPageAccess({ host: 'example.com' });
  assert.equal(unknown.allowed, false);

  const previewOk = resolveCipcDeskDirectorChangesPageAccess({
    host: 'corpflow-ai-command-center-abc.vercel.app',
    previewTenantId: 'cipc-desk',
  });
  assert.equal(previewOk.allowed, true);
  assert.equal(previewOk.reason, 'preview_token');
});

test('pages/director-changes gates on cipc-desk and renders review component', () => {
  const page = readFileSync(join(root, 'pages/director-changes.js'), 'utf8');
  assert.match(page, /CipcDeskDirectorChangesReview/);
  assert.match(page, /resolveCipcDeskDirectorChangesPageAccess/);
  assert.match(page, /notFound: true/);
  assert.match(page, /buildCipcDeskDirectorChangesReviewContent/);
});

test('review component posts to existing email-intake and shows open questions', () => {
  const src = readFileSync(join(root, 'components/CipcDeskDirectorChangesReview.js'), 'utf8');
  assert.match(src, /\/api\/cipc-desk\/email-intake/);
  assert.match(src, /buildDirectorChangesReviewFeedbackEmail/);
  assert.match(src, /client_path: '\/director-changes'/);
  assert.match(src, /noindex/);
  assert.match(src, /not guaranteed|Independence/i);
  assert.doesNotMatch(src, /\/api\/tenant\/intake/);
  assert.match(src, /readiness/);
  assert.match(src, /approve_with_changes/);
  assert.match(src, /open_questions/);
  assert.match(src, /SARAH CONFIRM/);
  assert.doesNotMatch(src, /approved_decisions/);
});

test('homepage draft links Director changes service to /director-changes', () => {
  const draft = buildCipcDeskWebsiteDraft();
  const dc = (draft.sections?.services?.items || []).find((x) =>
    /director change/i.test(String(x?.name || '')),
  );
  assert.ok(dc);
  assert.equal(dc.href, '/director-changes');
  assert.match(String(draft.content_version || ''), /director-changes-link/);
});
