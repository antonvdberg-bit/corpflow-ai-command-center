/**
 * Issue #685 — Lux private-client qualification (Slice B) + shortlist/invitation (Slice C).
 * Synthetic fixtures only — no real private client data. No schema/env changes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LUX_PRIVATE_CLIENT_QUAL_FIELDS,
  buildLuxPrivateClientQualificationView,
  mergePrivateClientQualificationPatch,
  parsePrivateClientQualification,
} from '../lib/cmp/_lib/lux-lead-qualification.js';
import {
  buildLuxInvitationPacketDraft,
  listLuxShortlistCatalogue,
  mergePrivateClientShortlistPatch,
  parsePrivateClientShortlist,
  resolveShortlistResidence,
} from '../lib/cmp/_lib/lux-lead-shortlist.js';
import { LUX_LEAD_CRM_STAGES } from '../lib/cmp/_lib/lux-lead-operator-workflow.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readRepo(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

test('#685 qualification fields cover buyer objective through confidentiality', () => {
  assert.deepEqual([...LUX_PRIVATE_CLIENT_QUAL_FIELDS], [
    'buyer_objective',
    'preferred_area',
    'property_type',
    'budget_band',
    'timing',
    'residency_investment_interest',
    'confidentiality_preference',
  ]);
});

test('#685 synthetic qualification flags missing info + recommends next action', () => {
  // Synthetic-only fixture — not real client data.
  const view = buildLuxPrivateClientQualificationView({
    name: 'Synthetic Visitor',
    message: 'Seeking: private north-coast residence\nPhone: +230 5000 9999',
    property_interest: {
      slug: 'lm-nc-ridge',
      title: 'North Coast Ridge Residences',
      region: 'North Mauritius',
      property_type: 'Residences',
      price_range: 'On application',
    },
    qualificationJson: {},
  });
  assert.equal(view.fields.preferred_area, 'North Mauritius');
  assert.equal(view.fields.property_type, 'Residences');
  assert.equal(view.fields.budget_band, 'On application');
  assert.ok(view.fields.buyer_objective);
  assert.ok(view.missing_count >= 1);
  assert.ok(view.missing.some((m) => m.key === 'confidentiality_preference'));
  assert.match(view.recommended_next_action, /Ask for:|Priority gaps:|Capture missing/i);
});

test('#685 qualification patch persists in qualification_json without schema', () => {
  const now = '2026-07-30T10:00:00.000Z';
  const { qj, changed } = mergePrivateClientQualificationPatch(
    {},
    {
      buyer_objective: 'Primary residence with privacy',
      preferred_area: 'North Mauritius',
      property_type: 'Villa',
      budget_band: 'USD 2–4M',
      timing: 'Within 6 months',
      residency_investment_interest: 'residency',
      confidentiality_preference: 'Strictly private introduction',
    },
    'synthetic-operator',
    now,
  );
  assert.equal(changed, true);
  const parsed = parsePrivateClientQualification(qj);
  assert.equal(parsed.buyer_objective, 'Primary residence with privacy');
  assert.equal(parsed.confidentiality_preference, 'Strictly private introduction');
  assert.equal(parsed.updated_by, 'synthetic-operator');
  const complete = buildLuxPrivateClientQualificationView({ qualificationJson: qj });
  assert.equal(complete.complete, true);
  assert.match(complete.recommended_next_action, /Qualification complete/i);
});

test('#685 shortlist associates staged residences + builds copy-ready draft (no send)', () => {
  const catalogue = listLuxShortlistCatalogue();
  assert.ok(catalogue.length >= 2);
  assert.ok(catalogue.every((p) => p.slug && !String(p.slug).includes('demo')));

  const ridge = resolveShortlistResidence('lm-nc-ridge', null);
  assert.ok(ridge);
  assert.equal(ridge.slug, 'lm-nc-ridge');

  const now = '2026-07-30T11:00:00.000Z';
  const merge = mergePrivateClientShortlistPatch(
    {
      private_client_qualification: {
        buyer_objective: 'Discreet villa',
        preferred_area: 'South',
        property_type: 'Villas',
        budget_band: 'On application',
        timing: 'Q4',
        residency_investment_interest: 'investment',
        confidentiality_preference: 'Private only',
      },
    },
    {
      shortlist_slugs: ['lm-villa-belombre', 'lm-nc-ridge'],
      invitation_operator_note: 'Happy to arrange a confidential briefing this week.',
    },
    'synthetic-operator',
    now,
  );
  assert.equal(merge.ok, true);
  assert.equal(merge.changed, true);
  const short = parsePrivateClientShortlist(merge.qj);
  assert.equal(short.residences.length, 2);
  assert.equal(short.invitation_operator_note, 'Happy to arrange a confidential briefing this week.');

  const draft = buildLuxInvitationPacketDraft({
    name: 'Synthetic Visitor',
    email: 'synthetic.visitor@example.test',
    phone: '+230 5000 9999',
    qualificationJson: merge.qj,
  });
  assert.equal(draft.send_disabled, true);
  assert.match(draft.send_notice, /No live send/i);
  assert.match(draft.draft_text, /PRIVATE CLIENT SHORTLIST/);
  assert.match(draft.draft_text, /Bel Ombre villa enclave/);
  assert.match(draft.draft_text, /synthetic\.visitor@example\.test/);
  assert.match(draft.draft_text, /NOT SENT/i);
  assert.doesNotMatch(draft.draft_text, /WhatsApp message was sent/i);
});

test('#685 rejects unknown shortlist slugs; caps length', () => {
  const bad = mergePrivateClientShortlistPatch({}, { shortlist_slugs: ['not-a-real-slug'] }, 'ops', '2026-07-30T12:00:00.000Z');
  assert.equal(bad.ok, true);
  assert.equal(parsePrivateClientShortlist(bad.qj).residences.length, 0);

  const tooMany = mergePrivateClientShortlistPatch(
    {},
    { shortlist_slugs: Array.from({ length: 12 }, (_, i) => `lm-nc-ridge`) },
    'ops',
    '2026-07-30T12:00:00.000Z',
  );
  // Unique slugs — only one residence after dedupe
  assert.equal(tooMany.ok, true);
  assert.equal(parsePrivateClientShortlist(tooMany.qj).residences.length, 1);
});

test('#685 stages remain new → contacted → qualified → invited → closed', () => {
  assert.deepEqual([...LUX_LEAD_CRM_STAGES], ['new', 'contacted', 'qualified', 'invited', 'closed']);
});

test('#685 /change exposes qualification + shortlist + source labels', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /data-testid="lux-crm-qualification-panel"/);
  assert.match(change, /data-testid="lux-crm-shortlist-panel"/);
  assert.match(change, /data-testid="lux-crm-invitation-draft"/);
  assert.match(change, /data-testid="lux-crm-invitation-no-send"/);
  assert.match(change, /data-testid="lux-crm-lead-source"/);
  assert.match(change, /Source:/);
  assert.match(change, /private_client_qualification/);
  assert.match(change, /shortlist_slugs/);
  assert.match(change, /Send disabled/);
});

test('#685 router wires qualification/shortlist into list + patch; email+phone gate', () => {
  const router = readRepo('lib/cmp/router.js');
  assert.match(router, /EMAIL_AND_TELEPHONE_REQUIRED/);
  assert.match(router, /buildLuxPrivateClientQualificationView/);
  assert.match(router, /buildLuxInvitationPacketDraft/);
  assert.match(router, /private_client_qualification/);
  assert.match(router, /shortlist_slugs/);
  assert.match(router, /qualification_updated/);
  assert.match(router, /shortlist_updated/);
});

test('#685 public /concierge still requires email + telephone', () => {
  const concierge = readRepo('pages/concierge.js');
  assert.match(concierge, /emailLooksValid/);
  assert.match(concierge, /phoneLooksValid/);
  assert.match(concierge, /Please provide both a valid email address and a telephone number/);
});
