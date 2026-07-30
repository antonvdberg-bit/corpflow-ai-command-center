import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CIPCDESK_CLIENT_ROUTES,
  CIPCDESK_CONTACT_EMAIL,
  CIPCDESK_LEGAL_DISCLAIMER,
  CIPCDESK_SERVICE_CATALOGUE,
  buildCipcDeskMailtoHref,
  findCipcDeskServiceBySlug,
} from '../lib/server/cipc-desk-catalogue.js';
import { resolveCipcDeskPublicBaseUrl } from '../lib/server/cipc-desk-runtime.js';
import {
  getCipcDeskClientStatusFromConsoleJson,
  getCipcDeskClientReplyDraftFromConsoleJson,
} from '../lib/cmp/_lib/cipc-desk-client-reply.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('catalogue: eight provisional services + contact email', () => {
  assert.equal(CIPCDESK_CONTACT_EMAIL, 'swart829@gmail.com');
  assert.equal(CIPCDESK_SERVICE_CATALOGUE.length, 8);
  assert.ok(findCipcDeskServiceBySlug('private-company-registration'));
  assert.equal(findCipcDeskServiceBySlug('missing'), null);
  assert.ok(CIPCDESK_CLIENT_ROUTES.direct_sme.label);
  assert.ok(CIPCDESK_CLIENT_ROUTES.professional_partner.label);
  assert.match(CIPCDESK_LEGAL_DISCLAIMER, /not the Companies and Intellectual Property Commission/i);
  assert.match(CIPCDESK_LEGAL_DISCLAIMER, /not a law firm/i);
});

test('mailto builder encodes SME vs partner routes', () => {
  const sme = buildCipcDeskMailtoHref('direct_sme', 'annual-returns');
  const partner = buildCipcDeskMailtoHref('professional_partner', 'annual-returns');
  assert.ok(sme.startsWith(`mailto:${CIPCDESK_CONTACT_EMAIL}?`));
  assert.ok(sme.includes(encodeURIComponent('Direct SME')));
  assert.ok(partner.includes(encodeURIComponent('Professional partner')));
  assert.ok(sme.includes(encodeURIComponent('Annual returns')));
});

test('public base URL prefers standing CIPC host over apex explicit base', () => {
  const base = resolveCipcDeskPublicBaseUrl({
    host: 'cipc.corpflowai.com',
    proto: 'https',
    explicitBase: 'https://corpflowai.com',
  });
  assert.equal(base, 'https://cipc.corpflowai.com');

  const alias = resolveCipcDeskPublicBaseUrl({
    host: 'cipc-desk.corpflowai.com',
    proto: 'https',
    explicitBase: 'https://corpflowai.com',
  });
  assert.equal(alias, 'https://cipc-desk.corpflowai.com');

  const fallback = resolveCipcDeskPublicBaseUrl({
    host: 'some-preview.vercel.app',
    proto: 'https',
    explicitBase: 'https://corpflowai.com',
  });
  assert.equal(fallback, 'https://corpflowai.com');
});

test('client status strips operator-internal fields', () => {
  const status = getCipcDeskClientStatusFromConsoleJson({
    brief: { summary: 'CIPC Desk · Annual returns (provisional)' },
    client_view: {
      cipc_desk: {
        seed_marker: 'secret-marker',
        source_email_hash: 'abc123',
        client_route: 'professional_partner',
        client_reply_draft: 'Thanks — draft only.',
        checklist: {
          items: [
            { key: 'scope_confirmed', label: 'Service scope confirmed by Serah (provisional)', status: 'pending' },
            { key: 'x', label: '', status: 'pending' },
          ],
        },
      },
    },
  });
  assert.ok(status);
  assert.equal(status.present, true);
  assert.equal(status.client_route, 'professional_partner');
  assert.equal(status.service_summary, 'CIPC Desk · Annual returns (provisional)');
  assert.equal(status.reply_draft_prepared, true);
  assert.equal(status.checklist_items.length, 1);
  assert.equal(status.checklist_items[0].label.includes('scope'), true);
  assert.equal('seed_marker' in status, false);
  assert.equal('source_email_hash' in status, false);
  assert.equal(getCipcDeskClientReplyDraftFromConsoleJson({
    client_view: { cipc_desk: { client_reply_draft: '  Hello  ' } },
  }), 'Hello');
});

test('landing + index wire CIPC Desk dedicated shell', () => {
  const landing = fs.readFileSync(path.join(ROOT, 'components/CipcDeskLanding.js'), 'utf8');
  const index = fs.readFileSync(path.join(ROOT, 'pages/index.js'), 'utf8');
  assert.ok(landing.includes('I am a business owner'));
  assert.ok(landing.includes('I am an accountant / practitioner'));
  assert.ok(landing.includes("fetch('/api/tenant/intake'"));
  assert.ok(landing.includes("product: 'cipc-desk'"));
  assert.ok(landing.includes('client_route'));
  assert.ok(landing.includes('fictional'));
  assert.ok(index.includes("import CipcDeskLanding from '../components/CipcDeskLanding.js'"));
  assert.ok(index.includes("CipcDeskLanding"));
  assert.ok(index.includes("'cipc-desk'"));
});

test('change-decisions surfaces cipc_desk_status progress strip', () => {
  const page = fs.readFileSync(path.join(ROOT, 'pages/client/change-decisions.js'), 'utf8');
  assert.ok(page.includes('cipc_desk_status'));
  assert.ok(page.includes('CIPC Desk · matter progress'));
  assert.ok(page.includes('reply_draft_prepared'));
});

test('Serah validation + research packets exist', () => {
  const validation = fs.readFileSync(
    path.join(ROOT, 'docs/operations/CIPC_DESK_SERAH_VALIDATION_PACKET.md'),
    'utf8',
  );
  const research = fs.readFileSync(path.join(ROOT, 'docs/product/CIPC_DESK_RESEARCH_PACKET_V1.md'), 'utf8');
  assert.ok(validation.includes('swart829@gmail.com'));
  assert.ok(validation.includes('https://cipc.corpflowai.com/'));
  assert.ok(research.includes('NO IMPLEMENTATION AUTHORIZED'));
  assert.ok(research.includes('Direct-SME'));
});
