import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CIPC_DESK_BENEFICIAL_OWNERSHIP_FEEDBACK_SUBJECT,
  CIPC_DESK_BENEFICIAL_OWNERSHIP_REVIEW_VERSION,
  buildBeneficialOwnershipReviewFeedbackEmail,
  buildCipcDeskBeneficialOwnershipReviewContent,
  resolveCipcDeskBeneficialOwnershipPageAccess,
} from '../lib/cipc-desk/beneficial-ownership-review.js';
import { resolveCipcDeskTenantIdFromHost } from '../lib/server/cipc-desk-runtime.js';
import { buildCipcDeskWebsiteDraft } from '../lib/server/cipc-desk-website-draft.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('beneficial ownership review content covers required six-layer sections', () => {
  const c = buildCipcDeskBeneficialOwnershipReviewContent();
  assert.equal(c.content_version, CIPC_DESK_BENEFICIAL_OWNERSHIP_REVIEW_VERSION);
  assert.match(String(c.explanation?.body || ''), /not an Annual Return/i);
  assert.match(String(c.explanation?.body || ''), /not a SARS tax return/i);
  assert.ok(Array.isArray(c.covers?.items) && c.covers.items.length >= 4);
  assert.ok(Array.isArray(c.does_not_cover?.items) && c.does_not_cover.items.length >= 3);
  assert.ok(Array.isArray(c.client_checklist?.groups) && c.client_checklist.groups.length >= 6);
  assert.ok(Array.isArray(c.status_flow?.steps) && c.status_flow.steps.length >= 8);
  assert.ok(Array.isArray(c.exceptions?.items) && c.exceptions.items.length >= 8);
  assert.ok(Array.isArray(c.routing?.items) && c.routing.items.length >= 3);
  assert.ok(Array.isArray(c.open_questions?.items) && c.open_questions.items.length >= 8);
  assert.match(String(c.banners?.independence || ''), /not CIPC/i);
  assert.match(String(c.banners?.no_guarantee || ''), /not guaranteed/i);
  assert.match(String(c.banners?.environment || ''), /corpflow_test/i);
  assert.match(String(c.sarah_review?.standing_url || ''), /cipc\.corpflowai\.com\/beneficial-ownership/);

  const blob = JSON.stringify(c);
  assert.doesNotMatch(blob, /we will file within|guaranteed within|official CIPC partner|accredited by CIPC/i);
  assert.doesNotMatch(blob, /R\s?\d{2,}|ZAR\s?\d+|USD\s?\d+/i);
  assert.doesNotMatch(blob, /we have determined that|Desk determines who/i);
  assert.match(blob, /#981|#740|#640/);
});

test('beneficial ownership v1 escalates complex structures and keeps Sarah questions open', () => {
  const c = buildCipcDeskBeneficialOwnershipReviewContent();
  const blob = JSON.stringify(c);

  assert.match(blob, /affected/i);
  assert.match(blob, /non-affected/i);
  assert.match(blob, /trust/i);
  assert.match(blob, /juristic/i);
  assert.match(blob, /layered|chain/i);
  assert.match(blob, /Foreigner Assurance/i);
  assert.match(blob, /co-operatives are excepted/i);
  assert.match(blob, /does not determine/i);
  assert.match(blob, /specialist review/i);
  assert.match(blob, /SARAH CONFIRM/i);
  assert.ok(Array.isArray(c.open_questions?.items) && c.open_questions.items.length === 10);
  assert.equal(c.approved_decisions, undefined);
  assert.match(String(c.source?.controlling_issue || ''), /#981/);
});

test('process pack records six layers, official sources, and open Sarah questions', () => {
  const pack = readFileSync(
    join(root, 'docs/operations/CIPC_DESK_BENEFICIAL_OWNERSHIP_PROCESS_PACK_V1.md'),
    'utf8',
  );
  assert.match(pack, /#981/);
  assert.match(pack, /#740/);
  assert.match(pack, /# Layer 1 — Customer explanation/);
  assert.match(pack, /# Layer 2 — Client intake checklist/);
  assert.match(pack, /# Layer 3 — Operator checklist/);
  assert.match(pack, /# Layer 4 — Specialist validation note/);
  assert.match(pack, /# Layer 5 — Customer status workflow/);
  assert.match(pack, /# Layer 6 — Exceptions and Escalations/);
  assert.match(pack, /https:\/\/www\.cipc\.co\.za\/\?page_id=16055/);
  assert.match(pack, /https:\/\/www\.cipc\.co\.za\/\?page_id=4447/);
  assert.match(pack, /affected/i);
  assert.match(pack, /non-affected/i);
  assert.match(pack, /SARAH CONFIRM/);
  assert.match(pack, /https:\/\/cipc\.corpflowai\.com\/beneficial-ownership/);
  assert.match(pack, /POST \/api\/cipc-desk\/email-intake/);
  assert.doesNotMatch(pack, /official CIPC partner|accredited by CIPC/i);
  assert.match(pack, /Wording that must not appear/);
});

test('feedback email builder requires readiness + at least one comment and routes as BO', () => {
  const missing = buildBeneficialOwnershipReviewFeedbackEmail({
    correctness: 'Looks fine',
  });
  assert.equal(missing.ok, false);

  const empty = buildBeneficialOwnershipReviewFeedbackEmail({
    readiness: 'approve',
  });
  assert.equal(empty.ok, false);

  const ok = buildBeneficialOwnershipReviewFeedbackEmail({
    readiness: 'approve_with_changes',
    correctness: 'Synthetic test — affected vs non-affected routing is clear.',
    missing_documents: 'None for this synthetic probe.',
    confusing_wording: 'None.',
    specialist_boundaries: 'Trust ownership correctly escalates.',
    inclusions_exclusions: 'Beneficial-owner determination correctly excluded.',
    unsafe_to_publish: 'No fee numbers present — good.',
    reviewer_name: 'Synthetic reviewer (#981)',
  });
  assert.equal(ok.ok, true);
  assert.match(ok.email_text, new RegExp(CIPC_DESK_BENEFICIAL_OWNERSHIP_FEEDBACK_SUBJECT));
  assert.match(ok.email_text, /beneficial ownership/i);
  assert.match(ok.email_text, /Approve with changes/);
  assert.match(ok.email_text, /No real client data/);
  assert.match(ok.email_text, /Synthetic test/);
  assert.match(ok.email_text, /#981/);
});

test('page access fails closed for non-cipc tenants', () => {
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc.corpflowai.com'), 'cipc-desk');

  const standing = resolveCipcDeskBeneficialOwnershipPageAccess({ host: 'cipc.corpflowai.com' });
  assert.equal(standing.allowed, true);
  assert.equal(standing.tenantId, 'cipc-desk');

  const alias = resolveCipcDeskBeneficialOwnershipPageAccess({ host: 'cipc-desk.corpflowai.com' });
  assert.equal(alias.allowed, true);

  const lux = resolveCipcDeskBeneficialOwnershipPageAccess({
    host: 'lux.corpflowai.com',
    tenantIdFromDb: 'luxe-maurice',
  });
  assert.equal(lux.allowed, false);
  assert.equal(lux.reason, 'TENANT_SCOPE_MISMATCH');

  const unknown = resolveCipcDeskBeneficialOwnershipPageAccess({ host: 'example.com' });
  assert.equal(unknown.allowed, false);

  const apex = resolveCipcDeskBeneficialOwnershipPageAccess({
    host: 'corpflowai.com',
    tenantIdFromDb: '',
  });
  assert.equal(apex.allowed, false);

  const previewOk = resolveCipcDeskBeneficialOwnershipPageAccess({
    host: 'corpflow-ai-command-center-abc.vercel.app',
    previewTenantId: 'cipc-desk',
  });
  assert.equal(previewOk.allowed, true);
  assert.equal(previewOk.reason, 'preview_token');
});

test('pages/beneficial-ownership gates on cipc-desk and renders review component', () => {
  const page = readFileSync(join(root, 'pages/beneficial-ownership.js'), 'utf8');
  assert.match(page, /CipcDeskBeneficialOwnershipReview/);
  assert.match(page, /resolveCipcDeskBeneficialOwnershipPageAccess/);
  assert.match(page, /notFound: true/);
  assert.match(page, /buildCipcDeskBeneficialOwnershipReviewContent/);
});

test('review component posts to existing email-intake and keeps open questions', () => {
  const src = readFileSync(join(root, 'components/CipcDeskBeneficialOwnershipReview.js'), 'utf8');
  assert.match(src, /\/api\/cipc-desk\/email-intake/);
  assert.match(src, /buildBeneficialOwnershipReviewFeedbackEmail/);
  assert.match(src, /client_path: '\/beneficial-ownership'/);
  assert.match(src, /noindex/);
  assert.match(src, /not guaranteed|Independence/i);
  assert.doesNotMatch(src, /\/api\/tenant\/intake/);
  assert.match(src, /readiness/);
  assert.match(src, /approve_with_changes/);
  assert.match(src, /open_questions/);
  assert.doesNotMatch(src, /approved_decisions/);
});

test('homepage draft sends Beneficial ownership buyers to /company, not the specialist-review page', () => {
  const draft = buildCipcDeskWebsiteDraft();
  const bo = (draft.sections?.services?.items || []).find((x) =>
    /beneficial ownership/i.test(String(x?.name || '')),
  );
  assert.ok(bo);
  assert.equal(bo.href, '/company');
  assert.match(String(draft.content_version || ''), /direct-sme-company-funnel/);

  const ar = (draft.sections?.services?.items || []).find((x) =>
    /annual returns/i.test(String(x?.name || '')),
  );
  assert.ok(ar);
  assert.equal(ar.href, '/company');
});
