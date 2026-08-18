import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CIPC_DESK_PARTNER_ENQUIRY_SUBJECT,
  CIPC_DESK_PARTNER_EXPERIENCE_LINE,
  CIPC_DESK_PARTNER_FUNNEL_VERSION,
  buildCipcDeskPartnerFunnelContent,
  buildPartnerFunnelEnquiryEmail,
  resolveCipcDeskPartnerFunnelPageAccess,
} from '../lib/cipc-desk/partner-funnel.js';
import { resolveCipcDeskTenantIdFromHost } from '../lib/server/cipc-desk-runtime.js';
import { buildCipcDeskWebsiteDraft } from '../lib/server/cipc-desk-website-draft.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function commercialBlob() {
  const c = buildCipcDeskPartnerFunnelContent();
  return JSON.stringify({
    meta: c.meta,
    nav: c.nav,
    hero: c.hero,
    audience: c.audience,
    problem: c.problem,
    offer: c.offer,
    proof: {
      title: c.proof?.title,
      experience_line: c.proof?.experience_line,
      items: c.proof?.items,
    },
    services: c.services,
    how_it_works: c.how_it_works,
    trust: c.trust,
    faqs: c.faqs,
    form: c.form,
    footer: c.footer,
  });
}

test('partner funnel content covers conversion sections without specialist jargon', () => {
  const c = buildCipcDeskPartnerFunnelContent();
  assert.equal(c.content_version, CIPC_DESK_PARTNER_FUNNEL_VERSION);
  assert.match(String(c.hero?.headline || ''), /company-secretarial capacity behind your accounting practice/i);
  assert.match(String(c.hero?.primary_cta?.label || ''), /Discuss overflow \/ white-label support/);
  assert.match(String(c.hero?.secondary_cta?.label || ''), /See services we can handle/);
  assert.equal(c.hero?.primary_cta?.href, '#partner-enquiry');
  assert.equal(c.hero?.secondary_cta?.href, '#partner-services');
  assert.match(String(c.audience?.body || ''), /accounting, tax and advisory firms/i);
  assert.match(String(c.audience?.not_for || ''), /own company/i);
  assert.ok(Array.isArray(c.services?.items) && c.services.items.length >= 6);
  assert.ok(Array.isArray(c.how_it_works?.steps) && c.how_it_works.steps.length === 5);
  assert.match(JSON.stringify(c.how_it_works), /Refer the client or the work/i);
  assert.match(JSON.stringify(c.how_it_works), /White-label or client handoff/i);
  assert.match(String(c.proof?.experience_line || ''), /15 years/i);
  assert.equal(c.proof?.confirmation_status, 'pending_exact_public_wording');
  assert.equal(c.proof?.experience_line, CIPC_DESK_PARTNER_EXPERIENCE_LINE);
  assert.match(JSON.stringify(c.trust), /not CIPC/i);
  assert.match(JSON.stringify(c.trust), /not guaranteed/i);
  assert.match(JSON.stringify(c.trust), /Remote delivery across South Africa/i);
  assert.match(String(c.form?.confirmation || ''), /usually within one business day/i);
  assert.match(String(c.meta?.robots || ''), /noindex/);

  const visible = commercialBlob();
  assert.doesNotMatch(visible, /corpflow_test|#986|#984|GitHub|SARAH CONFIRM|specialist-review|ticket_id|magic_link/i);
  assert.doesNotMatch(visible, /R\s?\d{2,}|ZAR\s?\d+|USD\s?\d+/i);
  assert.match(visible, /No fee table is published here|This is not a price list/i);
  assert.doesNotMatch(visible, /official CIPC partner|accredited by CIPC|guaranteed revenue|Choose payment path/i);
  assert.doesNotMatch(visible, /looking for remote work|CIPC clerk/i);
});

test('enquiry email builder validates fields and cues existing partner intake', () => {
  const missing = buildPartnerFunnelEnquiryEmail({
    firm: 'Apio Advisory',
  });
  assert.equal(missing.ok, false);

  const ok = buildPartnerFunnelEnquiryEmail({
    firm: 'Apio Advisory',
    contact_name: 'Synthetic Partner',
    email: 'partner@example.co.za',
    phone: '011 000 0000',
    need: 'Overflow for annual returns and beneficial ownership across a 40-client book.',
    services: ['cipc_administration', 'beneficial_ownership'],
    preferred_channel: 'email',
  });
  assert.equal(ok.ok, true);
  assert.match(ok.email_text, new RegExp(CIPC_DESK_PARTNER_ENQUIRY_SUBJECT));
  assert.match(ok.email_text, /Professional partner path/);
  assert.match(ok.email_text, /Apio Advisory/);
  assert.match(ok.email_text, /Beneficial ownership/);
  assert.match(ok.email_text, /accountant|firm|white-label|overflow/i);
  assert.doesNotMatch(ok.email_text, /identity document|passport|ID number/i);
});

test('page access fails closed for non-cipc tenants', () => {
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc.corpflowai.com'), 'cipc-desk');

  const standing = resolveCipcDeskPartnerFunnelPageAccess({ host: 'cipc.corpflowai.com' });
  assert.equal(standing.allowed, true);
  assert.equal(standing.tenantId, 'cipc-desk');

  const alias = resolveCipcDeskPartnerFunnelPageAccess({ host: 'cipc-desk.corpflowai.com' });
  assert.equal(alias.allowed, true);

  const lux = resolveCipcDeskPartnerFunnelPageAccess({
    host: 'lux.corpflowai.com',
    tenantIdFromDb: 'luxe-maurice',
  });
  assert.equal(lux.allowed, false);
  assert.equal(lux.reason, 'TENANT_SCOPE_MISMATCH');

  const unknown = resolveCipcDeskPartnerFunnelPageAccess({ host: 'example.com' });
  assert.equal(unknown.allowed, false);

  const previewOk = resolveCipcDeskPartnerFunnelPageAccess({
    host: 'corpflow-ai-command-center-abc.vercel.app',
    previewTenantId: 'cipc-desk',
  });
  assert.equal(previewOk.allowed, true);
  assert.equal(previewOk.reason, 'preview_token');
});

test('pages/partners gates on cipc-desk and renders the commercial component', () => {
  const page = readFileSync(join(root, 'pages/partners.js'), 'utf8');
  assert.match(page, /CipcDeskPartnerFunnel/);
  assert.match(page, /resolveCipcDeskPartnerFunnelPageAccess/);
  assert.match(page, /notFound: true/);
  assert.match(page, /buildCipcDeskPartnerFunnelContent/);
});

test('partner component posts to existing email-intake and keeps commercial confirmation', () => {
  const src = readFileSync(join(root, 'components/CipcDeskPartnerFunnel.js'), 'utf8');
  assert.match(src, /\/api\/cipc-desk\/email-intake/);
  assert.match(src, /buildPartnerFunnelEnquiryEmail/);
  assert.match(src, /client_path: '\/partners'/);
  assert.match(src, /noindex/);
  assert.match(src, /Discuss overflow \/ white-label support/);
  assert.match(src, /formCopy\.confirmation|safeStr\(formCopy\.confirmation\)/);
  assert.doesNotMatch(src, /\/api\/tenant\/intake/);
  assert.doesNotMatch(src, /ticket_id|magic_link_url|\/change|corpflow_test/);
  assert.doesNotMatch(src, /CipcDeskAnnualReturnsReview|CipcDeskBeneficialOwnershipReview/);
});

test('homepage draft routes professional partners to /partners without changing SME primary CTA', () => {
  const draft = buildCipcDeskWebsiteDraft();
  assert.match(String(draft.hero?.cta_href || ''), /^mailto:/);
  assert.equal(draft.hero?.cta_secondary_href, '/partners');
  assert.match(String(draft.hero?.cta_secondary_label || ''), /overflow \/ white-label/i);

  const partnerRoute = (draft.sections?.routes?.items || []).find((x) =>
    /accountant|professional partner/i.test(String(x?.name || '')),
  );
  assert.ok(partnerRoute);
  assert.equal(partnerRoute.cta_href, '/partners');
});

test('email-intake infers partner overflow from the partner subject cue', () => {
  const src = readFileSync(join(root, 'lib/server/cipc-desk-email-intake.js'), 'utf8');
  assert.match(src, /white-label enquiry/);
  assert.match(src, /Fractional \/ white-label company-secretarial support/);
  assert.match(src, /monthly-cipc-administration-support/);
});

test('specialist-review pages stay off the partner funnel change', () => {
  const ar = readFileSync(join(root, 'pages/annual-returns.js'), 'utf8');
  const bo = readFileSync(join(root, 'pages/beneficial-ownership.js'), 'utf8');
  const arComp = readFileSync(join(root, 'components/CipcDeskAnnualReturnsReview.js'), 'utf8');
  const boComp = readFileSync(join(root, 'components/CipcDeskBeneficialOwnershipReview.js'), 'utf8');
  assert.doesNotMatch(ar, /CipcDeskPartnerFunnel|\/partners/);
  assert.doesNotMatch(bo, /CipcDeskPartnerFunnel|\/partners/);
  assert.doesNotMatch(arComp, /Discuss overflow \/ white-label support/);
  assert.doesNotMatch(boComp, /Discuss overflow \/ white-label support/);
});
