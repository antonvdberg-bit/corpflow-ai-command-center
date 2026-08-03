/**
 * Issue #717 — Lux confidential presentation packet after qualification + shortlist.
 * Synthetic fixtures only — no real private client data. No schema/env/send changes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LUX_CONFIDENTIAL_PRESENTATION_JAN_TEST_CHECKLIST,
  LUX_PRESENTATION_JOURNEY_LABEL,
  LUX_PRESENTATION_VIEWING_NEXT_STEP,
  buildLuxConfidentialPresentationPacket,
  buildLuxPresentationReadinessChecklist,
  mergePrivateClientPresentationPatch,
  parsePrivateClientPresentation,
} from '../lib/cmp/_lib/lux-lead-confidential-presentation.js';
import { mergePrivateClientQualificationPatch } from '../lib/cmp/_lib/lux-lead-qualification.js';
import { mergePrivateClientShortlistPatch } from '../lib/cmp/_lib/lux-lead-shortlist.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readRepo(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

/** Synthetic-only fixture — not real client data. */
function buildSyntheticQualifiedShortlistedQj() {
  const now = '2026-08-03T12:00:00.000Z';
  let qj = {
    lux_operator_workflow: {
      stage: 'qualified',
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
      invitation_operator_note: 'Private briefing available this week.',
    },
    'synthetic-operator',
    now,
  );
  assert.equal(short.ok, true);
  qj = short.qj;
  return qj;
}

test('#717 journey label and viewing next-step constant', () => {
  assert.match(LUX_PRESENTATION_JOURNEY_LABEL, /Private Conversation/);
  assert.match(LUX_PRESENTATION_JOURNEY_LABEL, /Confidential Presentation/);
  assert.match(LUX_PRESENTATION_JOURNEY_LABEL, /Viewing by Invitation/);
  assert.equal(LUX_PRESENTATION_VIEWING_NEXT_STEP, 'viewing_by_invitation');
  assert.equal(LUX_CONFIDENTIAL_PRESENTATION_JAN_TEST_CHECKLIST.length, 8);
});

test('#717 readiness checklist incomplete until notes + viewing next step', () => {
  const qj = buildSyntheticQualifiedShortlistedQj();
  const leadLike = {
    name: 'Synthetic Visitor',
    email: 'synthetic.visitor@example.test',
    phone: '+230 5000 9999',
    qualificationJson: qj,
  };
  const before = buildLuxPresentationReadinessChecklist(leadLike);
  assert.equal(before.items.find((i) => i.id === 'client_contact')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'stage_qualified')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'qualification_summary')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'shortlist_residences')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'presentation_notes')?.ready, false);
  assert.equal(before.items.find((i) => i.id === 'viewing_next_step')?.ready, false);
  assert.equal(before.all_ready, false);
});

test('#717 presentation patch + Rare & Exclusive draft (send disabled)', () => {
  const now = '2026-08-03T13:00:00.000Z';
  let qj = buildSyntheticQualifiedShortlistedQj();
  const merge = mergePrivateClientPresentationPatch(
    qj,
    {
      presentation_notes:
        'Emphasise privacy, north-coast lifestyle, and invitation-only viewing logistics.',
      viewing_next_step: LUX_PRESENTATION_VIEWING_NEXT_STEP,
    },
    'synthetic-operator',
    now,
  );
  assert.equal(merge.ok, true);
  assert.equal(merge.changed, true);
  qj = merge.qj;
  const parsed = parsePrivateClientPresentation(qj);
  assert.equal(parsed.viewing_next_step, LUX_PRESENTATION_VIEWING_NEXT_STEP);
  assert.match(parsed.notes || '', /invitation-only viewing/i);

  const packet = buildLuxConfidentialPresentationPacket({
    name: 'Synthetic Visitor',
    email: 'synthetic.visitor@example.test',
    phone: '+230 5000 9999',
    qualificationJson: qj,
  });
  assert.equal(packet.send_disabled, true);
  assert.match(packet.send_notice, /No live send/i);
  assert.equal(packet.all_ready, true);
  assert.equal(packet.next_action_label, 'Viewing by Invitation');
  assert.match(packet.draft_text, /CONFIDENTIAL PRESENTATION/);
  assert.match(packet.draft_text, /Rare & Exclusive/);
  assert.match(packet.draft_text, /NOT SENT/i);
  assert.match(packet.draft_text, /Viewing by Invitation/);
  assert.match(packet.draft_text, /North Coast Ridge|Bel Ombre/i);
  assert.match(packet.draft_text, /synthetic\.visitor@example\.test/);
  assert.doesNotMatch(packet.draft_text, /WhatsApp message was sent/i);
  // Voice should not read like a generic mass-market property blast.
  assert.doesNotMatch(packet.draft_text, /Hot deal|Act now|Limited time only/i);
});

test('#717 stage below qualified fails readiness; contacted is not enough', () => {
  const qj = {
    lux_operator_workflow: { stage: 'contacted', activity: [], notes: [], stage_audit: [] },
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
      viewing_next_step: LUX_PRESENTATION_VIEWING_NEXT_STEP,
    },
  };
  const checklist = buildLuxPresentationReadinessChecklist({
    name: 'Synthetic Visitor',
    email: 'synthetic.visitor@example.test',
    qualificationJson: qj,
  });
  assert.equal(checklist.items.find((i) => i.id === 'stage_qualified')?.ready, false);
  assert.equal(checklist.all_ready, false);
});

test('#717 /change exposes presentation panel + send disabled + Jan checklist', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /data-testid="lux-crm-presentation-panel"/);
  assert.match(change, /data-testid="lux-crm-presentation-checklist"/);
  assert.match(change, /data-testid="lux-crm-presentation-draft"/);
  assert.match(change, /data-testid="lux-crm-presentation-no-send"/);
  assert.match(change, /data-testid="lux-crm-presentation-jan-checklist"/);
  assert.match(change, /data-testid="lux-crm-presentation-journey"/);
  assert.match(change, /presentation_notes/);
  assert.match(change, /viewing_next_step/);
  assert.match(change, /Send disabled — manual only/);
  assert.match(change, /CONFIDENTIAL PRESENTATION/);
  // Existing panels remain.
  assert.match(change, /data-testid="lux-crm-qualification-panel"/);
  assert.match(change, /data-testid="lux-crm-shortlist-panel"/);
});

test('#717 router wires presentation into list + patch; no send runtime', () => {
  const router = readRepo('lib/cmp/router.js');
  assert.match(router, /buildLuxConfidentialPresentationPacket/);
  assert.match(router, /mergePrivateClientPresentationPatch/);
  assert.match(router, /private_client_presentation/);
  assert.match(router, /presentation_notes/);
  assert.match(router, /viewing_next_step/);
  assert.match(router, /presentation_updated/);
  assert.doesNotMatch(router, /sendPresentationEmail|whatsapp\.send|twilio\.messages\.create/i);
});

test('#717 public Lux marketing surfaces unchanged by this slice', () => {
  const publicFiles = [
    'components/RareExclusiveTenantPresentation.js',
    'components/RareExclusiveIvoryShell.js',
    'components/LuxeMauriceTenantPresentation.js',
    'pages/concierge.js',
  ];
  for (const rel of publicFiles) {
    const src = readRepo(rel);
    assert.equal(
      src.includes('lux-lead-confidential-presentation'),
      false,
      `${rel} must not import confidential presentation module`,
    );
    assert.equal(
      src.includes('lux-crm-presentation-panel'),
      false,
      `${rel} must not reference presentation panel testid`,
    );
  }
  // No Prisma / schema edits in this slice.
  const schema = readRepo('prisma/schema.prisma');
  assert.doesNotMatch(schema, /private_client_presentation/);
});
