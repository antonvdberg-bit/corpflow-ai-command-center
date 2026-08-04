/**
 * Issue #752 — Lux Viewing by Invitation after Confidential Presentation.
 * Synthetic fixtures only — no real private client data. No schema/env/send changes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LUX_PRESENTATION_VIEWING_NEXT_STEP,
  mergePrivateClientPresentationPatch,
} from '../lib/cmp/_lib/lux-lead-confidential-presentation.js';
import { mergePrivateClientQualificationPatch } from '../lib/cmp/_lib/lux-lead-qualification.js';
import { mergePrivateClientShortlistPatch } from '../lib/cmp/_lib/lux-lead-shortlist.js';
import {
  LUX_VIEWING_BUYER_JOURNEY_LABEL,
  LUX_VIEWING_BY_INVITATION_JAN_TEST_CHECKLIST,
  LUX_VIEWING_FORMATS,
  LUX_VIEWING_JOURNEY_LABEL,
  buildLuxViewingByInvitationPacket,
  buildLuxViewingReadinessChecklist,
  mergePrivateClientViewingPatch,
  parsePrivateClientViewing,
} from '../lib/cmp/_lib/lux-lead-viewing-by-invitation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readRepo(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

/** Synthetic-only fixture — not real client data. */
function buildSyntheticPresentationReadyQj() {
  const now = '2026-08-04T12:00:00.000Z';
  let qj = {
    lux_operator_workflow: {
      stage: 'invited',
      activity: [],
      notes: [],
      stage_audit: [],
    },
  };
  const qual = mergePrivateClientQualificationPatch(
    qj,
    {
      buyer_objective: 'Discreet primary residence',
      preferred_area: 'North Mauritius',
      property_type: 'Villa',
      budget_band: 'On application',
      timing: 'Within 6 months',
      residency_investment_interest: 'residency',
      confidentiality_preference: 'Strictly private introduction',
    },
    'synthetic-operator',
    now,
  );
  qj = qual.qj;
  const short = mergePrivateClientShortlistPatch(
    qj,
    {
      shortlist_slugs: ['lm-nc-ridge', 'lm-villa-belombre'],
      invitation_operator_note: 'Private briefing completed.',
    },
    'synthetic-operator',
    now,
  );
  assert.equal(short.ok, true);
  qj = short.qj;
  const presentation = mergePrivateClientPresentationPatch(
    qj,
    {
      presentation_notes:
        'Emphasise privacy, north-coast lifestyle, and invitation-only viewing logistics.',
      viewing_next_step: LUX_PRESENTATION_VIEWING_NEXT_STEP,
    },
    'synthetic-operator',
    now,
  );
  assert.equal(presentation.ok, true);
  return presentation.qj;
}

test('#752 journey labels, formats, and Jan checklist', () => {
  assert.match(LUX_VIEWING_BUYER_JOURNEY_LABEL, /Confidential Presentation/);
  assert.match(LUX_VIEWING_BUYER_JOURNEY_LABEL, /Viewing by Invitation/);
  assert.match(LUX_VIEWING_BUYER_JOURNEY_LABEL, /Purchase/);
  assert.match(LUX_VIEWING_JOURNEY_LABEL, /Viewing by Invitation/);
  assert.equal(LUX_VIEWING_FORMATS.length, 3);
  assert.equal(LUX_VIEWING_BY_INVITATION_JAN_TEST_CHECKLIST.length, 9);
});

test('#752 readiness incomplete until viewing format + datetime + access notes', () => {
  const qj = buildSyntheticPresentationReadyQj();
  const leadLike = {
    name: 'Synthetic Visitor',
    email: 'synthetic.visitor@example.test',
    phone: '+230 5000 9999',
    qualificationJson: qj,
  };
  const before = buildLuxViewingReadinessChecklist(leadLike);
  assert.equal(before.items.find((i) => i.id === 'client_contact')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'stage_invited')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'qualification_summary')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'shortlist_residences')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'presentation_ready')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'viewing_format')?.ready, false);
  assert.equal(before.items.find((i) => i.id === 'proposed_datetime')?.ready, false);
  assert.equal(before.items.find((i) => i.id === 'access_notes')?.ready, false);
  assert.equal(before.items.find((i) => i.id === 'manual_invite_next')?.ready, false);
  assert.equal(before.all_ready, false);
  assert.equal(before.total_count, 9);
});

test('#752 viewing patch + Rare & Exclusive invitation draft (send disabled)', () => {
  const now = '2026-08-04T13:00:00.000Z';
  let qj = buildSyntheticPresentationReadyQj();
  const merge = mergePrivateClientViewingPatch(
    qj,
    {
      viewing_format: 'private_on_site',
      viewing_proposed_datetime: 'Thursday 14 Aug · 10:30 · by confirmation',
      viewing_access_notes:
        'Arrive via private concierge gate; no broker signage; confirm identity on arrival.',
    },
    'synthetic-operator',
    now,
  );
  assert.equal(merge.ok, true);
  assert.equal(merge.changed, true);
  qj = merge.qj;
  const parsed = parsePrivateClientViewing(qj);
  assert.equal(parsed.viewing_format, 'private_on_site');
  assert.match(parsed.proposed_datetime || '', /Thursday 14 Aug/);
  assert.match(parsed.access_concierge_notes || '', /concierge gate/i);

  const packet = buildLuxViewingByInvitationPacket({
    name: 'Synthetic Visitor',
    email: 'synthetic.visitor@example.test',
    phone: '+230 5000 9999',
    qualificationJson: qj,
  });
  assert.equal(packet.send_disabled, true);
  assert.match(packet.send_notice, /No live send/i);
  assert.equal(packet.all_ready, true);
  assert.equal(packet.next_action_label, 'Manual invitation / arrange viewing');
  assert.match(packet.draft_text, /VIEWING BY INVITATION/);
  assert.match(packet.draft_text, /Rare & Exclusive/);
  assert.match(packet.draft_text, /NOT SENT/i);
  assert.match(packet.draft_text, /invitation only/i);
  assert.match(packet.draft_text, /Private on-site viewing/);
  assert.match(packet.draft_text, /Thursday 14 Aug/);
  assert.match(packet.draft_text, /North Coast Ridge|Bel Ombre/i);
  assert.match(packet.draft_text, /synthetic\.visitor@example\.test/);
  assert.doesNotMatch(packet.draft_text, /WhatsApp message was sent/i);
  assert.doesNotMatch(packet.draft_text, /Hot deal|Act now|Limited time only/i);
  // Negating “open house” is intentional Rare & Exclusive voice; do not pitch one.
  assert.match(packet.draft_text, /not an open house/i);
  assert.doesNotMatch(packet.draft_text, /join our open house|book an open house/i);
});

test('#752 stage not invited and presentation next-step unset fails readiness', () => {
  const qj = {
    lux_operator_workflow: { stage: 'qualified', activity: [], notes: [], stage_audit: [] },
    private_client_qualification: {
      buyer_objective: 'x',
      preferred_area: 'x',
      property_type: 'x',
      budget_band: 'x',
      timing: 'x',
      residency_investment_interest: 'x',
      confidentiality_preference: 'x',
    },
    private_client_shortlist: {
      residences: [{ slug: 'lm-nc-ridge', title: 'North Coast Ridge Residences' }],
    },
    private_client_presentation: {
      notes: 'Ready notes',
      viewing_next_step: null,
    },
    private_client_viewing: {
      viewing_format: 'private_on_site',
      proposed_datetime: 'Next week',
      access_concierge_notes: 'Private arrival',
    },
  };
  const checklist = buildLuxViewingReadinessChecklist({
    name: 'Synthetic Visitor',
    email: 'synthetic.visitor@example.test',
    qualificationJson: qj,
  });
  assert.equal(checklist.items.find((i) => i.id === 'stage_invited')?.ready, false);
  assert.equal(checklist.all_ready, false);
});

test('#752 invalid viewing format is ignored on merge', () => {
  const now = '2026-08-04T14:00:00.000Z';
  const fromEmpty = mergePrivateClientViewingPatch(
    {},
    { viewing_format: 'open_house_public' },
    'synthetic-operator',
    now,
  );
  assert.equal(fromEmpty.ok, true);
  assert.equal(fromEmpty.changed, false);
  assert.equal(parsePrivateClientViewing(fromEmpty.qj).viewing_format, null);

  const cleared = mergePrivateClientViewingPatch(
    {
      private_client_viewing: {
        viewing_format: 'private_on_site',
        proposed_datetime: 'Next week',
        access_concierge_notes: 'Private arrival',
      },
    },
    { viewing_format: 'open_house_public' },
    'synthetic-operator',
    now,
  );
  assert.equal(cleared.ok, true);
  assert.equal(cleared.changed, true);
  assert.equal(parsePrivateClientViewing(cleared.qj).viewing_format, null);
});

test('#752 /change exposes viewing panel + send disabled + Jan checklist after presentation', () => {
  const change = readRepo('pages/change.js');
  const presentationIdx = change.indexOf('data-testid="lux-crm-presentation-panel"');
  const viewingIdx = change.indexOf('data-testid="lux-crm-viewing-panel"');
  assert.ok(presentationIdx > 0);
  assert.ok(viewingIdx > presentationIdx, 'Viewing panel must appear after Confidential Presentation');
  assert.match(change, /data-testid="lux-crm-viewing-checklist"/);
  assert.match(change, /data-testid="lux-crm-viewing-draft"/);
  assert.match(change, /data-testid="lux-crm-viewing-no-send"/);
  assert.match(change, /data-testid="lux-crm-viewing-jan-checklist"/);
  assert.match(change, /data-testid="lux-crm-viewing-journey"/);
  assert.match(change, /data-testid="lux-crm-viewing-format"/);
  assert.match(change, /data-testid="lux-crm-viewing-proposed-datetime"/);
  assert.match(change, /data-testid="lux-crm-viewing-access-notes"/);
  assert.match(change, /viewing_format/);
  assert.match(change, /viewing_proposed_datetime/);
  assert.match(change, /viewing_access_notes/);
  assert.match(change, /VIEWING BY INVITATION/);
  assert.match(change, /Send disabled — manual only/);
  // Existing panels remain.
  assert.match(change, /data-testid="lux-crm-qualification-panel"/);
  assert.match(change, /data-testid="lux-crm-shortlist-panel"/);
  assert.match(change, /data-testid="lux-crm-presentation-panel"/);
});

test('#752 router wires viewing into list + patch; no send runtime', () => {
  const router = readRepo('lib/cmp/router.js');
  assert.match(router, /buildLuxViewingByInvitationPacket/);
  assert.match(router, /mergePrivateClientViewingPatch/);
  assert.match(router, /private_client_viewing/);
  assert.match(router, /viewing_format/);
  assert.match(router, /viewing_proposed_datetime/);
  assert.match(router, /viewing_access_notes/);
  assert.match(router, /viewing_invitation_updated/);
  assert.doesNotMatch(router, /sendViewingInvitationEmail|whatsapp\.send|twilio\.messages\.create/i);
});

test('#752 public Lux marketing surfaces unchanged by this slice', () => {
  const publicFiles = [
    'components/RareExclusiveTenantPresentation.js',
    'components/RareExclusiveIvoryShell.js',
    'components/LuxeMauriceTenantPresentation.js',
    'pages/concierge.js',
  ];
  for (const rel of publicFiles) {
    const src = readRepo(rel);
    assert.equal(
      src.includes('lux-lead-viewing-by-invitation'),
      false,
      `${rel} must not import viewing-by-invitation module`,
    );
    assert.equal(
      src.includes('lux-crm-viewing-panel'),
      false,
      `${rel} must not reference viewing panel testid`,
    );
  }
  const schema = readRepo('prisma/schema.prisma');
  assert.doesNotMatch(schema, /private_client_viewing/);
});
