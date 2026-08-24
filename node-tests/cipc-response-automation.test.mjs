/**
 * CIPC response automation — unit tests (#987).
 *
 * Capture, classification, drafts, duplicate suppression, operator
 * approve/reject/do-not-contact, reply linking, follow-up due dates,
 * and the send gate. No schema. No live send.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { buildPartnerFunnelEnquiryEmail } from '../lib/cipc-desk/partner-funnel.js';
import {
  applyCipcResponseIntake,
  applyCipcResponseIntent,
  buildCipcResponsePublicConfirmation,
  calculateCipcResponseFollowUp,
  classifyCipcResponseLead,
  draftCipcResponseMessages,
  findCipcResponseDuplicate,
  linkCipcResponseReply,
  listCipcResponseBoard,
  mergeCipcResponseJson,
  mergeCipcResponseQualificationJson,
  parseCipcEnquiryFromIntake,
} from '../lib/cipc-desk/response-automation.js';
import { listCipcCampaignBoard } from '../lib/cipc-desk/campaign-mvp.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_PATH = join(root, 'lib', 'cipc-desk', 'response-automation.js');

function partnerEnquiry() {
  const built = buildPartnerFunnelEnquiryEmail({
    firm: 'Apio Advisory',
    contact_name: 'Thandi Mokoena',
    email: 'thandi@apioadvisory.test',
    phone: '011 000 0000',
    need: 'We need overflow / white-label CIPC administration behind our accounting practice for about 40 SME clients.',
    services: ['cipc_administration', 'beneficial_ownership'],
    preferred_channel: 'email',
  });
  assert.equal(built.ok, true);
  return applyCipcResponseIntake({
    emailText: built.email_text,
    body: {
      source: 'partner_web',
      client_path: '/partners',
      sender_email: 'thandi@apioadvisory.test',
      company: 'Apio Advisory',
      contact_name: 'Thandi Mokoena',
    },
    interpreted: { clientRoute: 'professional_partner' },
    ticket_id: 'ticket_partner_1',
  });
}

describe('#987 CIPC response automation — safety', () => {
  it('does not import senders, schema, or import.meta', () => {
    const src = readFileSync(MODULE_PATH, 'utf8');
    assert.equal(src.includes('nodemailer'), false);
    assert.equal(src.includes('twilio'), false);
    assert.equal(src.includes('createRequire'), false);
    assert.equal(src.includes('import.meta'), false);
    assert.equal(src.includes('prisma.'), false);
    const router = readFileSync(join(root, 'lib', 'cmp', 'router.js'), 'utf8');
    assert.match(router, /cipc-response-list/);
    assert.match(router, /cipc-response-operator-patch/);
    assert.match(router, /cipc-response-link-reply/);
    assert.match(router, /PROTECTED_SEND_BLOCKED/);
    assert.match(router, /import\(\s*['"]\.\.\/cipc-desk\/response-automation\.js['"]\s*\)/);
    const change = readFileSync(join(root, 'pages', 'change.js'), 'utf8');
    assert.match(change, /CipcResponseOperatorPanel/);
    const intake = readFileSync(join(root, 'lib', 'server', 'cipc-desk-email-intake.js'), 'utf8');
    assert.match(intake, /applyCipcResponseIntake/);
    assert.match(intake, /import\(\s*['"]\.\.\/cipc-desk\/response-automation\.js['"]\s*\)/);
  });
});

describe('#987 CIPC response automation — classification and drafts', () => {
  it('partner web enquiry -> professional partner acknowledgement + discovery draft', () => {
    const result = partnerEnquiry();
    assert.equal(result.created_new_record, true);
    assert.equal(result.overlay.source, 'partner_web');
    assert.equal(result.overlay.classification, 'professional_partner');
    assert.equal(result.overlay.draft.send, false);
    assert.match(String(result.overlay.draft.subject), /Apio Advisory/);
    assert.match(String(result.overlay.draft.body), /overflow \/ white-label/);
    assert.match(String(result.overlay.draft.body), /draft only/i);
    assert.match(String(result.overlay.acknowledgement_draft.body), /Thank you/);
    assert.equal(result.overlay.discovery_draft.send, false);
    assert.doesNotMatch(String(result.overlay.draft.body), /guaranteed|we have filed|fictional|corpflow_test/i);
    assert.match(result.confirmation.message, /reference CD-/i);
    assert.doesNotMatch(result.confirmation.message, /fictional|test data|ticket_id/i);
  });

  it('direct SME enquiry -> direct SME next-step draft', () => {
    const result = applyCipcResponseIntake({
      emailText:
        'Please help with annual returns for Sunshine Foods Pty Ltd. Enterprise number K2026/111111/07. Email: ops@sunshinefoods.test',
      body: {
        source: 'direct_sme_web',
        sender_email: 'ops@sunshinefoods.test',
        company: 'Sunshine Foods',
      },
      ticket_id: 'ticket_sme_1',
    });
    assert.equal(result.overlay.classification, 'direct_sme');
    assert.equal(result.overlay.service_id, 'annual_returns');
    assert.equal(result.overlay.draft.kind, 'direct_sme_next_step');
    assert.match(String(result.overlay.draft.body), /annual_returns|annual returns/i);
    assert.match(String(result.overlay.draft.body), /No filing, payment, or CIPC submission has been made/i);
    assert.equal(result.overlay.send, false);
  });

  it('duplicate sender/company/thread reuses the existing matter', () => {
    const first = partnerEnquiry();
    const second = applyCipcResponseIntake({
      emailText: first.enquiry.email_text,
      body: {
        source: 'partner_web',
        sender_email: 'thandi@apioadvisory.test',
        company: 'Apio Advisory',
        thread_id: 'thread-apio-1',
      },
      existingRecords: [{ ...first.overlay, thread_id: 'thread-apio-1' }],
      ticket_id: 'ticket_partner_2',
    });
    assert.equal(second.created_new_record, false);
    assert.equal(second.duplicate, true);
    assert.equal(second.overlay.ticket_id, 'ticket_partner_1');
    const found = findCipcResponseDuplicate([first.overlay], second.enquiry);
    assert.equal(found.ticket_id, 'ticket_partner_1');
  });

  it('unclear enquiry -> manual review', () => {
    const result = applyCipcResponseIntake({
      emailText: 'Please call me sometime',
      body: { sender_email: 'someone@example.test', source: 'unknown' },
      ticket_id: 'ticket_unclear_1',
    });
    assert.equal(result.overlay.classification, 'unclear_manual_review');
    assert.equal(result.overlay.draft.kind, 'incomplete_information');
    assert.equal(result.overlay.control_flow_state, 'manual_review');
  });

  it('complex/legal/service exception -> specialist escalation', () => {
    const result = applyCipcResponseIntake({
      emailText:
        'We need a legal opinion on the MOI and director removal after the death of a director. Email: counsel@firm.test Company: Counsel Inc',
      body: {
        sender_email: 'counsel@firm.test',
        company: 'Counsel Inc',
        source: 'direct_sme_web',
      },
      ticket_id: 'ticket_legal_1',
    });
    assert.equal(result.overlay.specialist_escalation, true);
    assert.ok(result.overlay.escalation_flags.includes('statutory_legal_interpretation'));
    assert.ok(result.overlay.escalation_flags.includes('director_death_or_removal'));
    assert.equal(result.overlay.draft.kind, 'specialist_holding');
    assert.match(String(result.overlay.draft.body), /specialist review/i);
    assert.doesNotMatch(String(result.overlay.draft.body), /we have determined that/i);
  });
});

describe('#987 CIPC response automation — operator gate, DNC, replies, follow-up', () => {
  it('operator approve -> ready-to-send only, no actual send', () => {
    const overlay = partnerEnquiry().overlay;
    const result = applyCipcResponseIntent(overlay, 'approve', { now: '2026-08-24T08:00:00.000Z' });
    assert.equal(result.applied, true);
    assert.equal(result.protected_gate_encountered, false);
    assert.equal(result.record.approval_state, 'operator_approved');
    assert.equal(result.record.send_state, 'ready_to_send');
    assert.equal(result.record.send, false);
    assert.equal(result.record.may_live_send, false);
    assert.match(String(result.record.next_action), /do not send/i);
    assert.ok(result.record.next_action_due);
  });

  it('reject -> cannot send', () => {
    const overlay = partnerEnquiry().overlay;
    const result = applyCipcResponseIntent(overlay, 'reject');
    assert.equal(result.applied, true);
    assert.equal(result.record.approval_state, 'rejected');
    assert.equal(result.record.send_state, 'not_sent');
    const send = applyCipcResponseIntent(result.record, 'send');
    assert.equal(send.applied, false);
    assert.equal(send.protected_gate_encountered, true);
  });

  it('do-not-contact / unsubscribe permanently blocks campaign follow-up and send', () => {
    const overlay = partnerEnquiry().overlay;
    const dnc = applyCipcResponseIntent(overlay, 'unsubscribe');
    assert.equal(dnc.applied, true);
    assert.equal(dnc.record.do_not_contact, true);
    assert.equal(dnc.record.send_state, 'blocked');
    const approve = applyCipcResponseIntent(dnc.record, 'approve');
    assert.equal(approve.applied, false);
    assert.equal(approve.reason, 'do_not_contact_blocks_approval');
    const follow = calculateCipcResponseFollowUp(dnc.record, { now: '2026-08-24T08:00:00.000Z' });
    assert.equal(follow.created_new_record, false);
    assert.equal(follow.next_action_due, '');
    assert.match(String(follow.next_action), /do not contact/i);
  });

  it('reply metadata links to the existing record idempotently and does not treat questions as approval', () => {
    const overlay = {
      ...partnerEnquiry().overlay,
      thread_id: 'thread-apio-1',
    };
    const first = linkCipcResponseReply([overlay], {
      reply_id: 'reply-1',
      thread_id: 'thread-apio-1',
      sender_email: 'thandi@apioadvisory.test',
      body: 'Can we proceed only if you can white-label this?',
    });
    assert.equal(first.linked, true);
    assert.equal(first.created, false);
    assert.equal(first.record.response_state, 'question_or_condition');
    assert.equal(first.record.replies[0].treated_as_approval, false);
    const second = linkCipcResponseReply([first.record], {
      reply_id: 'reply-1',
      thread_id: 'thread-apio-1',
      sender_email: 'thandi@apioadvisory.test',
      body: 'Can we proceed only if you can white-label this?',
    });
    assert.equal(second.idempotent, true);
    assert.equal(second.record.replies.length, 1);
    const yes = linkCipcResponseReply([first.record], {
      reply_id: 'reply-2',
      email: 'thandi@apioadvisory.test',
      company: 'Apio Advisory',
      body: 'Yes go ahead',
    });
    assert.equal(yes.linked, true);
    assert.equal(yes.created, false);
    assert.notEqual(yes.record.approval_state, 'operator_approved');
    assert.notEqual(yes.record.send_state, 'sent');
  });

  it('follow-up due calculation does not create a second CRM record', () => {
    const approved = applyCipcResponseIntent(partnerEnquiry().overlay, 'approve', {
      now: '2026-08-24T08:00:00.000Z',
    }).record;
    const follow = calculateCipcResponseFollowUp(approved, {
      now: '2026-08-24T08:00:00.000Z',
      simulate_sent: true,
    });
    assert.equal(follow.created_new_record, false);
    assert.ok(follow.next_action_due);
    assert.notEqual(follow.ticket_id, 'new');
    const simulated = applyCipcResponseIntent(approved, 'simulate_sent', { now: '2026-08-27T08:00:00.000Z' });
    assert.equal(simulated.applied, true);
    assert.equal(simulated.record.send_state, 'send_simulated');
    assert.notEqual(simulated.record.send_state, 'sent');
    assert.equal(simulated.record.created_new_record, false);
  });

  it('intent=send remains blocked, including quotation and filing aliases', () => {
    const overlay = applyCipcResponseIntent(partnerEnquiry().overlay, 'approve').record;
    for (const intent of ['send', 'live_send', 'mark_sent', 'quote', 'payment', 'submit']) {
      const blocked = applyCipcResponseIntent(overlay, intent);
      assert.equal(blocked.applied, false, intent);
      assert.equal(blocked.protected_gate_encountered, true, intent);
      assert.ok(blocked.exact_protected_action, intent);
    }
  });
});

describe('#987 CIPC response automation — overlay merge and campaign reuse', () => {
  it('preserves unrelated JSON namespaces', () => {
    const merged = mergeCipcResponseJson(
      { locale: 'en', client_view: { keep: true, cipc_desk: { seed_marker: 'keep' } }, lux: { a: 1 } },
      { classification: 'direct_sme' },
    );
    assert.equal(merged.locale, 'en');
    assert.equal(merged.lux.a, 1);
    assert.equal(merged.client_view.keep, true);
    assert.equal(merged.client_view.cipc_desk.seed_marker, 'keep');
    assert.equal(merged.cipc_response.classification, 'direct_sme');
    const qj = mergeCipcResponseQualificationJson(
      { lux_operator_workflow: { keep: true }, cipc_campaign: { prospect_id: 'apio-advisory' } },
      { cipc_response: { classification: 'professional_partner' } },
    );
    assert.equal(qj.lux_operator_workflow.keep, true);
    assert.equal(qj.cipc_campaign.prospect_id, 'apio-advisory');
    assert.equal(qj.cipc_response.classification, 'professional_partner');
  });

  it('lists campaign records on the response board without a second CRM', () => {
    const campaign = listCipcCampaignBoard();
    const board = listCipcResponseBoard({ campaignRecords: campaign });
    assert.ok(board.length >= 10);
    assert.equal(board[0].source, 'campaign');
    assert.equal(board[0].send, false);
    const confirmation = buildCipcResponsePublicConfirmation(board[0]);
    assert.match(confirmation.reference, /^CD-/);
  });

  it('parses partner enquiry fields from existing email_text', () => {
    const built = buildPartnerFunnelEnquiryEmail({
      firm: 'Refined Accountants',
      contact_name: 'Damon Pronk',
      email: 'damon@refined.test',
      need: 'White-label beneficial ownership overflow',
      services: ['beneficial_ownership'],
      preferred_channel: 'phone',
    });
    const enquiry = parseCipcEnquiryFromIntake(built.email_text, { client_path: '/partners' });
    assert.equal(enquiry.company, 'Refined Accountants');
    assert.equal(enquiry.email, 'damon@refined.test');
    assert.equal(enquiry.source, 'partner_web');
    const classified = classifyCipcResponseLead(enquiry, { clientRoute: 'professional_partner' });
    assert.equal(classified.classification, 'professional_partner');
    const drafts = draftCipcResponseMessages({ enquiry, classification: classified });
    assert.equal(drafts.partner_discovery.send, false);
  });
});
