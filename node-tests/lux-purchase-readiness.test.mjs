/**
 * Lux Purchase Readiness after Viewing by Invitation.
 * Synthetic fixtures only — no real private client data. No schema/env/send/payment changes.
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
import { mergePrivateClientViewingPatch } from '../lib/cmp/_lib/lux-lead-viewing-by-invitation.js';
import {
  LUX_PURCHASE_BUYER_JOURNEY_LABEL,
  LUX_PURCHASE_DOCUMENTS_CHECKLIST,
  LUX_PURCHASE_JOURNEY_LABEL,
  LUX_PURCHASE_NEXT_ACTIONS,
  LUX_PURCHASE_READINESS_JAN_TEST_CHECKLIST,
  LUX_PURCHASE_READINESS_LEVELS,
  buildLuxPurchaseReadinessChecklist,
  buildLuxPurchaseReadinessPacket,
  mergePrivateClientPurchaseReadinessPatch,
  parsePrivateClientPurchaseReadiness,
} from '../lib/cmp/_lib/lux-lead-purchase-readiness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readRepo(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

/** Synthetic-only fixture — not real client data. */
function buildSyntheticViewingReadyQj() {
  const now = '2026-08-05T10:00:00.000Z';
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
  qj = presentation.qj;
  const viewing = mergePrivateClientViewingPatch(
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
  assert.equal(viewing.ok, true);
  return viewing.qj;
}

test('purchase readiness journey labels, levels, actions, Jan checklist', () => {
  assert.match(LUX_PURCHASE_BUYER_JOURNEY_LABEL, /Viewing by Invitation/);
  assert.match(LUX_PURCHASE_BUYER_JOURNEY_LABEL, /Purchase/);
  assert.equal(LUX_PURCHASE_JOURNEY_LABEL, 'Viewing by Invitation → Purchase');
  assert.equal(LUX_PURCHASE_READINESS_LEVELS.length, 5);
  assert.equal(LUX_PURCHASE_NEXT_ACTIONS.length, 5);
  assert.equal(LUX_PURCHASE_DOCUMENTS_CHECKLIST.length, 5);
  assert.equal(LUX_PURCHASE_READINESS_JAN_TEST_CHECKLIST.length, 9);
});

test('purchase readiness incomplete until outcome + intent + preferred + level + next action', () => {
  const qj = buildSyntheticViewingReadyQj();
  const leadLike = {
    name: 'Synthetic Visitor',
    email: 'synthetic.visitor@example.test',
    phone: '+230 5000 9999',
    qualificationJson: qj,
  };
  const before = buildLuxPurchaseReadinessChecklist(leadLike);
  assert.equal(before.items.find((i) => i.id === 'client_contact')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'stage_invited')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'shortlist_residences')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'presentation_ready')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'viewing_details')?.ready, true);
  assert.equal(before.items.find((i) => i.id === 'viewing_outcome')?.ready, false);
  assert.equal(before.items.find((i) => i.id === 'buyer_intent')?.ready, false);
  assert.equal(before.items.find((i) => i.id === 'preferred_residence')?.ready, false);
  assert.equal(before.items.find((i) => i.id === 'purchase_readiness')?.ready, false);
  assert.equal(before.items.find((i) => i.id === 'documents_checklist')?.ready, false);
  assert.equal(before.items.find((i) => i.id === 'manual_purchase_next')?.ready, false);
  assert.equal(before.all_ready, false);
  assert.equal(before.total_count, 11);
});

test('purchase patch + Rare & Exclusive Private Purchase Discussion draft (send disabled)', () => {
  const now = '2026-08-05T11:00:00.000Z';
  let qj = buildSyntheticViewingReadyQj();
  const merge = mergePrivateClientPurchaseReadinessPatch(
    qj,
    {
      purchase_viewing_outcome:
        'Private on-site viewing completed calmly; client appreciated discretion and north-coast setting.',
      purchase_buyer_intent:
        'Client expressed serious interest in the ridge residence and asked about a private follow-up conversation.',
      purchase_preferred_residence: 'lm-nc-ridge',
      purchase_readiness: 'ready_for_private_purchase_discussion',
      purchase_next_action: 'prepare_purchase_discussion',
      purchase_documents_selected: ['confirm_preferred_residence', 'prep_talking_points'],
      purchase_documents_notes: 'Confirm timing window before discussion.',
      purchase_transaction_notes: 'No offer or payment discussed — conversation prep only.',
      purchase_operator_notes: 'Synthetic operator note — keep voice Rare & Exclusive.',
    },
    'synthetic-operator',
    now,
  );
  assert.equal(merge.ok, true);
  assert.equal(merge.changed, true);
  qj = merge.qj;
  const parsed = parsePrivateClientPurchaseReadiness(qj);
  assert.equal(parsed.purchase_readiness, 'ready_for_private_purchase_discussion');
  assert.equal(parsed.next_private_action, 'prepare_purchase_discussion');
  assert.equal(parsed.preferred_residence, 'lm-nc-ridge');
  assert.deepEqual(parsed.documents_selected, [
    'confirm_preferred_residence',
    'prep_talking_points',
  ]);

  const packet = buildLuxPurchaseReadinessPacket({
    name: 'Synthetic Visitor',
    email: 'synthetic.visitor@example.test',
    phone: '+230 5000 9999',
    qualificationJson: qj,
  });
  assert.equal(packet.send_disabled, true);
  assert.match(packet.send_notice, /No live send/i);
  assert.equal(packet.all_ready, true);
  assert.match(packet.draft_text, /PURCHASE READINESS|PRIVATE PURCHASE DISCUSSION/);
  assert.match(packet.draft_text, /Rare & Exclusive/);
  assert.match(packet.draft_text, /NOT SENT/i);
  assert.match(packet.draft_text, /not a contract|does not constitute an offer/i);
  assert.match(packet.draft_text, /North Coast Ridge/i);
  assert.match(packet.draft_text, /Ready for private purchase discussion/i);
  assert.match(packet.draft_text, /Prepare purchase discussion/i);
  assert.match(packet.draft_text, /synthetic\.visitor@example\.test/);
  assert.doesNotMatch(packet.draft_text, /WhatsApp message was sent/i);
  assert.doesNotMatch(packet.draft_text, /Hot deal|Act now|Limited time only|guaranteed approval/i);
  assert.doesNotMatch(packet.draft_text, /wire transfer|sign the contract now|pay deposit now/i);
});

test('invalid purchase readiness / next action ignored on merge', () => {
  const now = '2026-08-05T12:00:00.000Z';
  const fromEmpty = mergePrivateClientPurchaseReadinessPatch(
    {},
    { purchase_readiness: 'wired_for_payment', purchase_next_action: 'auto_send_contract' },
    'synthetic-operator',
    now,
  );
  assert.equal(fromEmpty.ok, true);
  assert.equal(fromEmpty.changed, false);
  assert.equal(parsePrivateClientPurchaseReadiness(fromEmpty.qj).purchase_readiness, null);
  assert.equal(parsePrivateClientPurchaseReadiness(fromEmpty.qj).next_private_action, null);
});

test('/change exposes purchase panel + send disabled + Jan checklist after viewing', () => {
  const change = readRepo('pages/change.js');
  const viewingIdx = change.indexOf('data-testid="lux-crm-viewing-panel"');
  const purchaseIdx = change.indexOf('data-testid="lux-crm-purchase-panel"');
  assert.ok(viewingIdx > 0);
  assert.ok(purchaseIdx > viewingIdx, 'Purchase panel must appear after Viewing by Invitation');
  assert.match(change, /data-testid="lux-crm-purchase-checklist"/);
  assert.match(change, /data-testid="lux-crm-purchase-draft"/);
  assert.match(change, /data-testid="lux-crm-purchase-no-send"/);
  assert.match(change, /data-testid="lux-crm-purchase-jan-checklist"/);
  assert.match(change, /data-testid="lux-crm-purchase-journey"/);
  assert.match(change, /data-testid="lux-crm-purchase-viewing-outcome"/);
  assert.match(change, /data-testid="lux-crm-purchase-buyer-intent"/);
  assert.match(change, /data-testid="lux-crm-purchase-preferred-residence"/);
  assert.match(change, /data-testid="lux-crm-purchase-readiness"/);
  assert.match(change, /data-testid="lux-crm-purchase-next-action"/);
  assert.match(change, /purchase_viewing_outcome/);
  assert.match(change, /purchase_buyer_intent/);
  assert.match(change, /purchase_preferred_residence/);
  assert.match(change, /purchase_readiness/);
  assert.match(change, /purchase_next_action/);
  assert.match(change, /PURCHASE READINESS/);
  assert.match(change, /Send disabled — manual only/);
  assert.match(change, /data-testid="lux-crm-qualification-panel"/);
  assert.match(change, /data-testid="lux-crm-shortlist-panel"/);
  assert.match(change, /data-testid="lux-crm-presentation-panel"/);
  assert.match(change, /data-testid="lux-crm-viewing-panel"/);
});

test('router wires purchase readiness into list + patch; no send/payment runtime', () => {
  const router = readRepo('lib/cmp/router.js');
  assert.match(router, /buildLuxPurchaseReadinessPacket/);
  assert.match(router, /mergePrivateClientPurchaseReadinessPatch/);
  assert.match(router, /private_client_purchase_readiness/);
  assert.match(router, /purchase_viewing_outcome/);
  assert.match(router, /purchase_buyer_intent/);
  assert.match(router, /purchase_preferred_residence/);
  assert.match(router, /purchase_readiness/);
  assert.match(router, /purchase_next_action/);
  assert.match(router, /purchase_readiness_updated/);
  assert.doesNotMatch(
    router,
    /sendPurchaseDiscussionEmail|stripe\.charges|whatsapp\.send|twilio\.messages\.create/i,
  );
});

test('public Lux marketing surfaces unchanged by purchase readiness slice', () => {
  const publicFiles = [
    'components/RareExclusiveTenantPresentation.js',
    'components/RareExclusiveIvoryShell.js',
    'components/LuxeMauriceTenantPresentation.js',
    'pages/concierge.js',
  ];
  for (const rel of publicFiles) {
    const src = readRepo(rel);
    assert.equal(
      src.includes('lux-lead-purchase-readiness'),
      false,
      `${rel} must not import purchase-readiness module`,
    );
    assert.equal(
      src.includes('lux-crm-purchase-panel'),
      false,
      `${rel} must not reference purchase panel testid`,
    );
  }
  const schema = readRepo('prisma/schema.prisma');
  assert.doesNotMatch(schema, /private_client_purchase_readiness/);
});
