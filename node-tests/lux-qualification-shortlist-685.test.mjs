/**
 * Issue #685 — Lux qualification + curated shortlist / invitation packet.
 * Synthetic fixtures only. No DB/schema/env. No live send.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LUX_QUALIFICATION_FIELDS,
  buildLuxInvitationPacketDraft,
  luxQualificationMissingFields,
  luxQualificationRecommendedNextAction,
  luxQualificationShortlistForApi,
  mergeLuxCuratedShortlistPatch,
  mergeLuxPrivateClientQualificationPatch,
  parseLuxCuratedShortlist,
  parseLuxPrivateClientQualification,
} from '../lib/cmp/_lib/lux-lead-qualification-shortlist.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readRepo(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

test('#685 qualification fields cover private-client checklist', () => {
  assert.deepEqual([...LUX_QUALIFICATION_FIELDS], [
    'buyer_objective',
    'preferred_area',
    'property_type',
    'budget_band',
    'timing',
    'residency_investment_interest',
    'confidentiality_preference',
  ]);
});

test('#685 missing fields + recommended next action (synthetic)', () => {
  const empty = parseLuxPrivateClientQualification({});
  const missing = luxQualificationMissingFields(empty);
  assert.equal(missing.length, 7);
  assert.match(luxQualificationRecommendedNextAction(empty), /Capture missing qualification/);

  const filled = parseLuxPrivateClientQualification({
    private_client_qualification: {
      buyer_objective: 'Primary residence',
      preferred_area: 'North Mauritius',
      property_type: 'Villa',
      budget_band: 'USD 2M – 4M',
      timing: 'Within 6 months',
      residency_investment_interest: 'Residency pathway interest',
      confidentiality_preference: 'Strictly private introductions',
    },
  });
  assert.equal(luxQualificationMissingFields(filled).length, 0);
  assert.match(
    luxQualificationRecommendedNextAction(filled, { stage: 'qualified' }),
    /shortlist|invitation/i,
  );
});

test('#685 seeds hints from access_request without inventing confidentiality', () => {
  const q = parseLuxPrivateClientQualification({
    access_request: {
      access_intent: 'Family residence',
      desired_location: 'West coast',
      property_type: 'Penthouse',
      budget_min: 1500000,
      budget_max: 2500000,
      currency_code: 'USD',
    },
  });
  assert.equal(q.buyer_objective, 'Family residence');
  assert.equal(q.preferred_area, 'West coast');
  assert.equal(q.property_type, 'Penthouse');
  assert.match(q.budget_band, /1,500,000/);
  assert.equal(q.confidentiality_preference, '');
  assert.ok(luxQualificationMissingFields(q).includes('confidentiality_preference'));
});

test('#685 shortlist associates staged residences only (no demo)', () => {
  const now = '2026-07-30T12:00:00.000Z';
  let qj = mergeLuxCuratedShortlistPatch(
    {},
    { slugs: ['lm-nc-ridge', 'lm-villa-belombre', 'lm-phase2d-manual-demo', 'not-a-slug'] },
    'synthetic-operator',
    now,
  );
  const list = parseLuxCuratedShortlist(qj);
  assert.deepEqual(
    list.items.map((i) => i.slug),
    ['lm-nc-ridge', 'lm-villa-belombre'],
  );
  assert.equal(list.updated_by, 'synthetic-operator');
});

test('#685 invitation draft is copy-ready and states no automatic send', () => {
  const draft = buildLuxInvitationPacketDraft({
    lead_name: 'Synthetic Visitor',
    email: 'synthetic.visitor@example.test',
    phone: '+230 5000 9999',
    qualification: {
      buyer_objective: 'discreet villa',
      preferred_area: 'South coast',
      property_type: 'Villa',
      budget_band: 'On application',
      timing: 'Q4',
      residency_investment_interest: 'Investment',
      confidentiality_preference: 'Private only',
    },
    shortlist: {
      items: [
        {
          slug: 'lm-villa-belombre',
          title: 'Bel Ombre villa enclave',
          region: 'South & heritage coast',
          property_type: 'Villas',
          price_range: 'On application',
          status: 'Details on request',
          note: 'Synthetic shortlist note',
          added_at: '2026-07-30T12:00:00.000Z',
        },
      ],
    },
  });
  assert.match(draft, /Synthetic Visitor/);
  assert.match(draft, /Bel Ombre villa enclave/);
  assert.match(draft, /No automatic send/);
  assert.match(draft, /draft/i);
});

test('#685 qualification patch persists under private_client_qualification', () => {
  const now = '2026-07-30T12:00:00.000Z';
  const qj = mergeLuxPrivateClientQualificationPatch(
    {},
    {
      buyer_objective: 'Holiday home',
      preferred_area: 'North',
      property_type: 'Residence',
      budget_band: 'USD 1M+',
      timing: '2026',
      residency_investment_interest: 'Both',
      confidentiality_preference: 'NDA preferred',
    },
    'synthetic-operator',
    now,
  );
  const api = luxQualificationShortlistForApi(qj, {
    stage: 'contacted',
    lead_name: 'Synthetic',
    email: 'synthetic@example.test',
    phone: '+230 5000 0000',
  });
  assert.equal(api.private_client_qualification.missing_fields.length, 0);
  assert.ok(api.invitation_draft.includes('Holiday home'));
  assert.ok(Array.isArray(api.curated_shortlist.catalog_options));
  assert.ok(api.curated_shortlist.catalog_options.length >= 3);
});

test('#685 router enforces email+telephone and exposes qualification/shortlist', () => {
  const router = readRepo('lib/cmp/router.js');
  assert.match(router, /EMAIL_AND_TELEPHONE_REQUIRED/);
  assert.match(router, /luxQualificationShortlistForApi/);
  assert.match(router, /mergeLuxPrivateClientQualificationPatch/);
  assert.match(router, /mergeLuxCuratedShortlistPatch/);
  assert.match(router, /shortlist_slugs/);
  assert.match(router, /private_client_qualification/);
  assert.match(router, /source: row\.intent/);
});

test('#685 /change surfaces qualification + shortlist + source label', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /data-testid="lux-crm-qualification-panel"/);
  assert.match(change, /data-testid="lux-crm-shortlist-panel"/);
  assert.match(change, /data-testid="lux-crm-invitation-draft"/);
  assert.match(change, /Source/);
  assert.match(change, /LUX_QUALIFICATION_FIELDS/);
  assert.match(change, /shortlist_slugs/);
  assert.match(change, /private_client_qualification/);
});
