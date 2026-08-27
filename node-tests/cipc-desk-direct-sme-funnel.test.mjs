import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CIPC_DESK_DIRECT_SME_ENQUIRY_SUBJECT,
  CIPC_DESK_DIRECT_SME_FUNNEL_VERSION,
  CIPC_DESK_DIRECT_SME_PROOF_FIXTURE,
  CIPC_DESK_DIRECT_SME_PROOF_REFERENCE,
  buildCipcDeskDirectSmeFunnelContent,
  buildDirectSmeEnquiryEmail,
  buildDirectSmeProofConfirmation,
  isCipcDeskDirectSmeProofQuery,
  resolveCipcDeskDirectSmePageAccess,
} from '../lib/cipc-desk/direct-sme-funnel.js';
import {
  applyCipcResponseIntake,
  classifyCipcResponseLead,
  parseCipcEnquiryFromIntake,
} from '../lib/cipc-desk/response-automation.js';
import { resolveCipcDeskTenantIdFromHost } from '../lib/server/cipc-desk-runtime.js';
import { buildCipcDeskWebsiteDraft } from '../lib/server/cipc-desk-website-draft.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function commercialBlob() {
  const c = buildCipcDeskDirectSmeFunnelContent();
  return JSON.stringify({
    meta: c.meta,
    nav: c.nav,
    hero: c.hero,
    audience: c.audience,
    problem: c.problem,
    offer: c.offer,
    proof: c.proof,
    services: c.services,
    limitations: c.limitations,
    how_it_works: c.how_it_works,
    trust: c.trust,
    faqs: c.faqs,
    form: c.form,
    footer: c.footer,
  });
}

test('direct-SME funnel content covers conversion sections without specialist jargon or fees', () => {
  const c = buildCipcDeskDirectSmeFunnelContent();
  assert.equal(c.content_version, CIPC_DESK_DIRECT_SME_FUNNEL_VERSION);
  assert.match(String(c.hero?.headline || ''), /Company-secretarial help for your CIPC filings/i);
  assert.equal(c.hero?.primary_cta?.label, 'Request company-secretarial help');
  assert.equal(c.hero?.primary_cta?.href, '#sme-enquiry');
  assert.equal(c.hero?.secondary_cta?.href, '#sme-services');
  assert.match(String(c.audience?.body || ''), /owners and directors/i);
  assert.match(String(c.audience?.not_for || ''), /accounting, tax or advisory firm/i);
  assert.equal(c.audience?.not_for_href, '/partners');
  assert.ok(Array.isArray(c.services?.items) && c.services.items.length >= 6);
  assert.ok(c.services.items.some((x) => x.key === 'annual_returns'));
  assert.ok(c.services.items.some((x) => x.key === 'beneficial_ownership'));
  assert.ok(c.services.items.some((x) => x.key === 'director_changes'));
  assert.ok(Array.isArray(c.limitations?.items) && c.limitations.items.length >= 4);
  assert.ok(Array.isArray(c.how_it_works?.steps) && c.how_it_works.steps.length === 4);
  assert.match(JSON.stringify(c.trust), /not CIPC/i);
  assert.match(JSON.stringify(c.trust), /not guaranteed/i);
  assert.match(JSON.stringify(c.trust), /specialist-review workspace/i);
  assert.match(String(c.form?.confirmation || ''), /not a CIPC filing/i);
  assert.match(String(c.form?.proof_confirmation || ''), /Proof confirmation only/i);
  assert.match(String(c.meta?.robots || ''), /noindex/);

  const visible = commercialBlob();
  assert.doesNotMatch(visible, /corpflow_test|#1152|#1183|#989|GitHub|SARAH CONFIRM|ticket_id|magic_link/i);
  assert.doesNotMatch(visible, /Open review page|\/annual-returns|\/director-changes|\/beneficial-ownership/i);
  assert.doesNotMatch(visible, /R\s?\d{2,}|ZAR\s?\d+|USD\s?\d+|fee table|price list is/i);
  assert.doesNotMatch(visible, /official CIPC partner|accredited by CIPC|guaranteed revenue|Choose payment path/i);
  assert.doesNotMatch(visible, /we will file within|looking for remote work|CIPC clerk/i);
  assert.match(visible, /not a guaranteed outcome/i);
});

test('enquiry email builder validates fields and stays on the direct-SME path', () => {
  const missing = buildDirectSmeEnquiryEmail({
    company: 'Example Trading Pty Ltd',
  });
  assert.equal(missing.ok, false);

  const badEmail = buildDirectSmeEnquiryEmail({
    ...CIPC_DESK_DIRECT_SME_PROOF_FIXTURE,
    email: 'not-an-email',
  });
  assert.equal(badEmail.ok, false);

  const ok = buildDirectSmeEnquiryEmail(CIPC_DESK_DIRECT_SME_PROOF_FIXTURE);
  assert.equal(ok.ok, true);
  assert.match(ok.email_text, new RegExp(CIPC_DESK_DIRECT_SME_ENQUIRY_SUBJECT));
  assert.match(ok.email_text, /Direct company path/);
  assert.match(ok.email_text, /Example Trading Pty Ltd/);
  assert.match(ok.email_text, /Annual returns/);
  assert.doesNotMatch(ok.email_text, /identity document|passport|ID number/i);
  assert.doesNotMatch(ok.email_text, /\boverflow\b|\bwhite-label\b|\bfirm\b/i);
});

test('proof confirmation never records, sends, files, or charges', () => {
  assert.equal(isCipcDeskDirectSmeProofQuery('1'), true);
  assert.equal(isCipcDeskDirectSmeProofQuery('true'), true);
  assert.equal(isCipcDeskDirectSmeProofQuery(''), false);

  const built = buildDirectSmeEnquiryEmail(CIPC_DESK_DIRECT_SME_PROOF_FIXTURE);
  const proof = buildDirectSmeProofConfirmation(built);
  assert.equal(proof.ok, true);
  assert.equal(proof.recorded, false);
  assert.equal(proof.sent, false);
  assert.equal(proof.filed, false);
  assert.equal(proof.payment, false);
  assert.equal(proof.reference, CIPC_DESK_DIRECT_SME_PROOF_REFERENCE);
  assert.equal(proof.client_path, '/company');
  assert.equal(proof.source, 'direct_sme_web');
});

test('page access fails closed for non-cipc tenants', () => {
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc.corpflowai.com'), 'cipc-desk');

  const standing = resolveCipcDeskDirectSmePageAccess({ host: 'cipc.corpflowai.com' });
  assert.equal(standing.allowed, true);
  assert.equal(standing.tenantId, 'cipc-desk');

  const alias = resolveCipcDeskDirectSmePageAccess({ host: 'cipc-desk.corpflowai.com' });
  assert.equal(alias.allowed, true);

  const lux = resolveCipcDeskDirectSmePageAccess({
    host: 'lux.corpflowai.com',
    tenantIdFromDb: 'luxe-maurice',
  });
  assert.equal(lux.allowed, false);
  assert.equal(lux.reason, 'TENANT_SCOPE_MISMATCH');

  const unknown = resolveCipcDeskDirectSmePageAccess({ host: 'example.com' });
  assert.equal(unknown.allowed, false);
});

test('pages/company gates on cipc-desk and renders the commercial component', () => {
  const page = readFileSync(join(root, 'pages/company.js'), 'utf8');
  assert.match(page, /CipcDeskDirectSmeFunnel/);
  assert.match(page, /resolveCipcDeskDirectSmePageAccess/);
  assert.match(page, /notFound: true/);
  assert.match(page, /buildCipcDeskDirectSmeFunnelContent/);
  assert.match(page, /isCipcDeskDirectSmeProofQuery/);
});

test('direct-SME component uses proof fixtures and keeps commercial confirmation', () => {
  const src = readFileSync(join(root, 'components/CipcDeskDirectSmeFunnel.js'), 'utf8');
  assert.match(src, /\/api\/cipc-desk\/email-intake/);
  assert.match(src, /buildDirectSmeEnquiryEmail/);
  assert.match(src, /buildDirectSmeProofConfirmation/);
  assert.match(src, /client_path: '\/company'/);
  assert.match(src, /source: 'direct_sme_web'/);
  assert.match(src, /proofMode/);
  assert.match(src, /CIPC_DESK_DIRECT_SME_PROOF_FIXTURE/);
  assert.match(src, /noindex/);
  assert.match(src, /Request company-secretarial help/);
  assert.doesNotMatch(src, /\/api\/tenant\/intake/);
  assert.doesNotMatch(src, /ticket_id|magic_link_url|\/change|corpflow_test/);
  assert.doesNotMatch(src, /CipcDeskAnnualReturnsReview|CipcDeskBeneficialOwnershipReview|Open review page/);
  assert.doesNotMatch(src, /nodemailer|twilio|whatsapp/i);
});

test('homepage draft sends SMEs to /company and does not advertise specialist-review pages', () => {
  const draft = buildCipcDeskWebsiteDraft();
  assert.equal(draft.hero?.cta_href, '/company');
  assert.match(String(draft.hero?.cta_label || ''), /Request company-secretarial help/i);
  assert.equal(draft.hero?.cta_secondary_href, '/partners');

  const smeRoute = (draft.sections?.routes?.items || []).find((x) => /direct sme/i.test(String(x?.name || '')));
  assert.ok(smeRoute);
  assert.equal(smeRoute.cta_href, '/company');

  const blob = JSON.stringify(draft);
  assert.doesNotMatch(blob, /\/annual-returns|\/director-changes|\/beneficial-ownership/);
  assert.doesNotMatch(blob, /Open review page/);
  assert.doesNotMatch(blob, /R\s?\d{2,}|ZAR\s?\d+/i);
});

test('landing no longer uses mailto or specialist-review buyer CTAs', () => {
  const landing = readFileSync(join(root, 'components/CipcDeskLanding.js'), 'utf8');
  assert.match(landing, /Request company-secretarial help/);
  assert.match(landing, /\/company/);
  assert.match(landing, /Request this help/);
  assert.doesNotMatch(landing, /mailto:/);
  assert.doesNotMatch(landing, /Open review page/);
});

test('specialist-review pages stay off the direct-SME funnel change', () => {
  const ar = readFileSync(join(root, 'pages/annual-returns.js'), 'utf8');
  const bo = readFileSync(join(root, 'pages/beneficial-ownership.js'), 'utf8');
  const dc = readFileSync(join(root, 'pages/director-changes.js'), 'utf8');
  assert.doesNotMatch(ar, /CipcDeskDirectSmeFunnel|\/company\?proof/);
  assert.doesNotMatch(bo, /CipcDeskDirectSmeFunnel/);
  assert.doesNotMatch(dc, /CipcDeskDirectSmeFunnel/);
});

test('email-intake source and #987 classify the proof fixture as a direct SME annual-return enquiry', () => {
  const built = buildDirectSmeEnquiryEmail(CIPC_DESK_DIRECT_SME_PROOF_FIXTURE);
  assert.equal(built.ok, true);

  const intakeSrc = readFileSync(join(root, 'lib/server/cipc-desk-email-intake.js'), 'utf8');
  assert.match(intakeSrc, /annual\s*returns/);
  assert.match(intakeSrc, /direct_sme/);

  const enquiry = parseCipcEnquiryFromIntake(built.email_text, {
    client_path: '/company',
    source: 'direct_sme_web',
    sender_email: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.email,
    company: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.company,
    contact_name: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.contact_name,
    need: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.need,
  });
  assert.equal(enquiry.source, 'direct_sme_web');
  assert.equal(enquiry.company, CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.company);
  const classified = classifyCipcResponseLead(enquiry, { clientRoute: 'direct_sme' });
  assert.equal(classified.classification, 'direct_sme');
  assert.equal(classified.service_id, 'annual_returns');

  const result = applyCipcResponseIntake({
    emailText: built.email_text,
    body: {
      source: 'direct_sme_web',
      client_path: '/company',
      sender_email: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.email,
      company: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.company,
      contact_name: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.contact_name,
      need: CIPC_DESK_DIRECT_SME_PROOF_FIXTURE.need,
    },
    interpreted: { clientRoute: 'direct_sme' },
    ticket_id: 'ticket_sme_company_1',
  });
  assert.equal(result.overlay.classification, 'direct_sme');
  assert.equal(result.overlay.source, 'direct_sme_web');
  assert.equal(result.overlay.draft.send, false);
  assert.equal(result.overlay.send, false);
});
