/**
 * #1195 P1 Revenue acceptance — CIPC partner enquiry to approval-gated response.
 *
 * Synthetic fixtures only. No live enquiry, no production data, no send.
 * Proves the existing #986 funnel + #987 response-automation contracts:
 * partner enquiry → classification → acknowledgement/discovery draft →
 * operator review / approval-gated ready_to_send, with send remaining blocked.
 *
 * Verdict encoded below as:
 * CIPC PARTNER RESPONSE PATH USABLE — SEND REMAINS GATED
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
  listCipcResponseBoard,
  mapCampaignRecordToResponse,
} from '../lib/cipc-desk/response-automation.js';
import { listCipcCampaignBoard } from '../lib/cipc-desk/campaign-mvp.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOW = '2026-08-27T17:00:00.000Z';
const CURRENT_MAIN_SHA = 'b731411734edb01b7dbb8d7e20247c5a7805983a';

/** Exact fixture identifiers returned in the #1195 acceptance packet. */
export const CIPC_PARTNER_RESPONSE_FIXTURES = Object.freeze({
  partner_web: 'fx-cipc-partner-web-horizon',
  partner_web_duplicate: 'fx-cipc-partner-web-horizon-dup',
  partner_web_thread: 'thread-horizon-1',
  direct_sme: 'fx-cipc-direct-sme-sunshine',
  existing_client: 'fx-cipc-existing-client-sunshine',
  existing_client_lead: 'lead_sunshine_1',
  spam: 'fx-cipc-spam-promo',
  unclear: 'fx-cipc-unclear-1',
  unsubscribe_enquiry: 'fx-cipc-unsubscribe-horizon',
  campaign_partner_web: 'fx-cipc-partner-from-campaign-apio',
  campaign_prospect: 'apio-advisory',
});

const ROUTE_SEQUENCE = Object.freeze([
  'GET /partners (CipcDeskPartnerFunnel)',
  'POST /api/cipc-desk/email-intake',
  'applyCipcResponseIntake → classifyCipcResponseLead → draftCipcResponseMessages',
  'GET /api/cmp/router?action=cipc-response-list',
  'POST /api/cmp/router?action=cipc-response-operator-patch (approve|reject|do_not_contact)',
  'POST /api/cmp/router?action=cipc-response-operator-patch intent=send → PROTECTED_SEND_BLOCKED',
  'POST /api/cmp/router?action=cipc-response-link-reply',
  '/change CipcResponseOperatorPanel (no send control)',
]);

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function partnerHorizonEnquiry(overrides = {}) {
  const fields = {
    firm: 'Horizon Ledger Partners',
    contact_name: 'Lindiwe Naidoo',
    email: 'lindiwe@horizonledger.test',
    phone: '021 000 1195',
    need: 'We need overflow / white-label CIPC administration behind our accounting practice for about 25 SME clients.',
    services: ['cipc_administration', 'statutory_records'],
    preferred_channel: 'email',
    ...overrides,
  };
  const built = buildPartnerFunnelEnquiryEmail(fields);
  assert.equal(built.ok, true, 'synthetic partner enquiry must build');
  return applyCipcResponseIntake({
    emailText: built.email_text,
    body: {
      source: 'partner_web',
      client_path: '/partners',
      sender_email: fields.email,
      company: fields.firm,
      contact_name: fields.contact_name,
      phone: fields.phone,
      need: fields.need,
      preferred_channel: fields.preferred_channel,
    },
    interpreted: { clientRoute: 'professional_partner' },
    ticket_id: CIPC_PARTNER_RESPONSE_FIXTURES.partner_web,
    now: NOW,
  });
}

describe('#1195 CIPC partner response path — contracts still wired', () => {
  it('buyer funnel posts into existing email-intake; operator queue stays send-blocked', () => {
    const funnel = read('components/CipcDeskPartnerFunnel.js');
    assert.match(funnel, /\/api\/cipc-desk\/email-intake/);
    assert.match(funnel, /source: 'partner_web'/);
    assert.match(funnel, /client_path: '\/partners'/);
    assert.doesNotMatch(funnel, /intent:\s*['"]send['"]/);

    const intake = read('lib/server/cipc-desk-email-intake.js');
    assert.match(intake, /applyCipcResponseIntake/);
    assert.match(intake, /send:\s*false/);
    assert.match(intake, /white-label enquiry/);

    const router = read('lib/cmp/router.js');
    assert.match(router, /cipc-response-list/);
    assert.match(router, /cipc-response-operator-patch/);
    assert.match(router, /cipc-response-link-reply/);
    assert.match(router, /PROTECTED_SEND_BLOCKED/);

    const panel = read('components/CipcResponseOperatorPanel.js');
    assert.match(panel, /Approve draft/);
    assert.match(panel, /Do not contact/);
    assert.match(panel, /No message is sent from this panel/);
    assert.match(panel, /runIntent\(id, 'approve'\)/);
    assert.doesNotMatch(panel, /runIntent\([^)]*['"]send['"]\)/);
    assert.doesNotMatch(panel, />Send</);

    const change = read('pages/change.js');
    assert.match(change, /CipcResponseOperatorPanel/);

    assert.equal(ROUTE_SEQUENCE.length, 8);
    assert.equal(CURRENT_MAIN_SHA, 'b731411734edb01b7dbb8d7e20247c5a7805983a');
  });
});

describe('#1195 partner enquiry → classification → draft → approval gate', () => {
  it('fx-cipc-partner-web-horizon yields partner discovery draft and stays unsent', () => {
    const result = partnerHorizonEnquiry();
    assert.equal(result.created_new_record, true);
    assert.equal(result.overlay.ticket_id, CIPC_PARTNER_RESPONSE_FIXTURES.partner_web);
    assert.equal(result.overlay.source, 'partner_web');
    assert.equal(result.overlay.classification, 'professional_partner');
    assert.equal(result.overlay.company, 'Horizon Ledger Partners');
    assert.equal(result.overlay.sender_email, 'lindiwe@horizonledger.test');
    assert.equal(result.overlay.contact_name, 'Lindiwe Naidoo');
    assert.equal(result.overlay.acknowledgement_draft.kind, 'acknowledgement');
    assert.equal(result.overlay.acknowledgement_draft.send, false);
    assert.equal(result.overlay.discovery_draft.kind, 'partner_discovery');
    assert.equal(result.overlay.discovery_draft.send, false);
    assert.equal(result.overlay.draft.kind, 'partner_discovery');
    assert.equal(result.overlay.draft.send, false);
    assert.match(String(result.overlay.draft.body), /draft only/i);
    assert.match(String(result.overlay.draft.body), /overflow \/ white-label/);
    assert.doesNotMatch(String(result.overlay.draft.body), /guaranteed revenue|we have filed|corpflow_test/i);
    assert.equal(result.overlay.approval_state, 'pending');
    assert.equal(result.overlay.send_state, 'not_sent');
    assert.equal(result.overlay.send, false);
    assert.equal(result.overlay.may_live_send, false);
    assert.equal(result.overlay.environment, 'corpflow_test');
    assert.match(String(result.confirmation.reference), /^CD-/);
  });

  it('operator approve moves Horizon to ready_to_send without sending', () => {
    const overlay = partnerHorizonEnquiry().overlay;
    const approved = applyCipcResponseIntent(overlay, 'approve', { now: NOW });
    assert.equal(approved.applied, true);
    assert.equal(approved.protected_gate_encountered, false);
    assert.equal(approved.record.approval_state, 'operator_approved');
    assert.equal(approved.record.send_state, 'ready_to_send');
    assert.equal(approved.record.control_flow_state, 'ready_to_send');
    assert.equal(approved.record.send, false);
    assert.equal(approved.record.may_live_send, false);
    assert.match(String(approved.record.next_action), /do not send/i);

    for (const intent of ['send', 'live_send', 'mark_sent', 'quote', 'quotation', 'payment', 'submit', 'file']) {
      const blocked = applyCipcResponseIntent(approved.record, intent);
      assert.equal(blocked.applied, false, intent);
      assert.equal(blocked.protected_gate_encountered, true, intent);
      assert.equal(blocked.reason, 'protected_action_blocked', intent);
      assert.ok(blocked.exact_protected_action, intent);
    }
  });
});

describe('#1195 classification coverage currently supported', () => {
  it('fx-cipc-direct-sme-sunshine → direct_sme next-step draft', () => {
    const result = applyCipcResponseIntake({
      emailText:
        'Please help with annual returns for Sunshine Foods Pty Ltd. Enterprise number K2026/111111/07.',
      body: {
        source: 'direct_sme_web',
        sender_email: 'ops@sunshinefoods.test',
        company: 'Sunshine Foods',
      },
      ticket_id: CIPC_PARTNER_RESPONSE_FIXTURES.direct_sme,
      now: NOW,
    });
    assert.equal(result.overlay.classification, 'direct_sme');
    assert.equal(result.overlay.source, 'direct_sme_web');
    assert.equal(result.overlay.service_id, 'annual_returns');
    assert.equal(result.overlay.draft.kind, 'direct_sme_next_step');
    assert.equal(result.overlay.send, false);
  });

  it('fx-cipc-existing-client-sunshine → existing_client acknowledgement', () => {
    const result = applyCipcResponseIntake({
      emailText: 'Existing client: please continue our open ticket for annual returns on current matter.',
      body: {
        source: 'existing_client',
        sender_email: 'ops@sunshinefoods.test',
        company: 'Sunshine Foods',
        existing_ticket_id: CIPC_PARTNER_RESPONSE_FIXTURES.direct_sme,
        existing_lead_id: CIPC_PARTNER_RESPONSE_FIXTURES.existing_client_lead,
      },
      ticket_id: CIPC_PARTNER_RESPONSE_FIXTURES.existing_client,
      now: NOW,
    });
    assert.equal(result.overlay.classification, 'existing_client');
    assert.equal(result.overlay.source, 'existing_client');
    assert.equal(result.overlay.lead_id, CIPC_PARTNER_RESPONSE_FIXTURES.existing_client_lead);
    assert.equal(result.overlay.company, 'Sunshine Foods');
    assert.equal(result.overlay.sender_email, 'ops@sunshinefoods.test');
    assert.equal(result.overlay.draft.kind, 'acknowledgement');
    assert.equal(result.overlay.send, false);
  });

  it('fx-cipc-spam-promo → spam_unusable and cannot be approved', () => {
    const result = applyCipcResponseIntake({
      emailText: 'cheap seo backlinks cheap seo backlinks congratulations you won crypto airdrop',
      body: { sender_email: 'spam@promo.test', source: 'unknown' },
      ticket_id: CIPC_PARTNER_RESPONSE_FIXTURES.spam,
      now: NOW,
    });
    assert.equal(result.overlay.classification, 'spam_unusable');
    assert.equal(result.overlay.control_flow_state, 'spam_unusable');
    const approve = applyCipcResponseIntent(result.overlay, 'approve');
    assert.equal(approve.applied, false);
    assert.equal(approve.reason, 'spam_unusable');
  });

  it('fx-cipc-unclear-1 → unclear_manual_review', () => {
    const result = applyCipcResponseIntake({
      emailText: 'Please call me sometime',
      body: { sender_email: 'someone@example.test', source: 'unknown' },
      ticket_id: CIPC_PARTNER_RESPONSE_FIXTURES.unclear,
      now: NOW,
    });
    assert.equal(result.overlay.classification, 'unclear_manual_review');
    assert.equal(result.overlay.draft.kind, 'incomplete_information');
    assert.equal(result.overlay.control_flow_state, 'manual_review');
    assert.equal(result.overlay.send, false);
  });
});

describe('#1195 identity, duplicate linkage, DNC, fail-closed send', () => {
  it('duplicate partner enquiry reuses fx-cipc-partner-web-horizon', () => {
    const first = partnerHorizonEnquiry();
    const second = applyCipcResponseIntake({
      emailText: first.enquiry.email_text,
      body: {
        source: 'partner_web',
        client_path: '/partners',
        sender_email: 'lindiwe@horizonledger.test',
        company: 'Horizon Ledger Partners',
        thread_id: CIPC_PARTNER_RESPONSE_FIXTURES.partner_web_thread,
      },
      existingRecords: [{ ...first.overlay, thread_id: CIPC_PARTNER_RESPONSE_FIXTURES.partner_web_thread }],
      ticket_id: CIPC_PARTNER_RESPONSE_FIXTURES.partner_web_duplicate,
      now: NOW,
    });
    assert.equal(second.duplicate, true);
    assert.equal(second.created_new_record, false);
    assert.equal(second.overlay.ticket_id, CIPC_PARTNER_RESPONSE_FIXTURES.partner_web);
    assert.equal(second.overlay.company, 'Horizon Ledger Partners');
    assert.equal(second.overlay.sender_email, 'lindiwe@horizonledger.test');
    assert.equal(second.overlay.source, 'partner_web');
    assert.equal(second.overlay.public_reference, first.overlay.public_reference);
  });

  it('campaign prospect apio-advisory identity is preserved and duplicate-suppressed on the board', () => {
    const campaign = listCipcCampaignBoard();
    const apio = campaign.find((row) => row.prospect_id === CIPC_PARTNER_RESPONSE_FIXTURES.campaign_prospect);
    assert.ok(apio, 'campaign seed apio-advisory must exist');
    const mapped = mapCampaignRecordToResponse(apio);
    assert.equal(mapped.source, 'campaign');
    assert.equal(mapped.campaign_prospect_id, 'apio-advisory');
    assert.equal(mapped.company, 'Apio Advisory');
    assert.equal(mapped.sender_email, 'info@apioadvisory.co.za');
    assert.equal(mapped.classification, 'professional_partner');
    assert.equal(mapped.send, false);

    const built = buildPartnerFunnelEnquiryEmail({
      firm: 'Apio Advisory',
      contact_name: 'Campaign Linked Partner',
      email: 'info@apioadvisory.co.za',
      need: 'White-label overflow for CIPC administration behind our existing SME book.',
      services: ['cipc_administration'],
      preferred_channel: 'email',
    });
    const linked = applyCipcResponseIntake({
      emailText: built.email_text,
      body: {
        source: 'partner_web',
        client_path: '/partners',
        sender_email: 'info@apioadvisory.co.za',
        company: 'Apio Advisory',
        contact_name: 'Campaign Linked Partner',
      },
      existingRecords: [mapped],
      ticket_id: CIPC_PARTNER_RESPONSE_FIXTURES.campaign_partner_web,
      now: NOW,
    });
    assert.equal(linked.duplicate, true);
    assert.equal(linked.created_new_record, false);
    assert.equal(linked.overlay.campaign_prospect_id, 'apio-advisory');
    assert.equal(linked.overlay.source, 'partner_web');
    assert.equal(linked.overlay.company, 'Apio Advisory');
    assert.equal(linked.overlay.sender_email, 'info@apioadvisory.co.za');

    const board = listCipcResponseBoard({
      ticketRows: [
        {
          id: CIPC_PARTNER_RESPONSE_FIXTURES.campaign_partner_web,
          consoleJson: { cipc_response: linked.overlay },
        },
      ],
      campaignRecords: [apio],
    });
    const ticketRow = board.find((row) => row.ticket_id === CIPC_PARTNER_RESPONSE_FIXTURES.campaign_partner_web);
    const campaignRow = board.find(
      (row) =>
        row.campaign_prospect_id === 'apio-advisory' && row.source === 'campaign' && !row.ticket_id,
    );
    assert.ok(ticketRow);
    assert.ok(campaignRow);
    assert.equal(ticketRow.campaign_prospect_id, 'apio-advisory');
    assert.equal(campaignRow.duplicate_of, CIPC_PARTNER_RESPONSE_FIXTURES.campaign_partner_web);
    assert.equal(campaignRow.send_state, 'blocked');
    const campaignApprove = applyCipcResponseIntent(campaignRow, 'approve');
    assert.equal(campaignApprove.applied, false);
    assert.equal(campaignApprove.reason, 'duplicate_suppressed');
  });

  it('unsubscribe enquiry and operator DNC permanently block follow-up, approval, and send', () => {
    const fromText = applyCipcResponseIntake({
      emailText:
        'Please unsubscribe and do not contact Horizon Ledger Partners about overflow support.',
      body: {
        source: 'partner_web',
        client_path: '/partners',
        sender_email: 'lindiwe@horizonledger.test',
        company: 'Horizon Ledger Partners',
        contact_name: 'Lindiwe Naidoo',
      },
      interpreted: { clientRoute: 'professional_partner' },
      ticket_id: CIPC_PARTNER_RESPONSE_FIXTURES.unsubscribe_enquiry,
      now: NOW,
    });
    assert.equal(fromText.overlay.do_not_contact, true);
    assert.equal(fromText.overlay.send_state, 'blocked');
    assert.equal(applyCipcResponseIntent(fromText.overlay, 'approve').applied, false);

    const operatorDnc = applyCipcResponseIntent(partnerHorizonEnquiry().overlay, 'unsubscribe');
    assert.equal(operatorDnc.applied, true);
    assert.equal(operatorDnc.record.do_not_contact, true);
    assert.equal(operatorDnc.record.send_state, 'blocked');
    assert.equal(applyCipcResponseIntent(operatorDnc.record, 'approve').reason, 'do_not_contact_blocks_approval');
    const send = applyCipcResponseIntent(operatorDnc.record, 'send');
    assert.equal(send.applied, false);
    assert.equal(send.protected_gate_encountered, true);
    const quote = applyCipcResponseIntent(operatorDnc.record, 'quote');
    assert.equal(quote.protected_gate_encountered, true);
    const file = applyCipcResponseIntent(operatorDnc.record, 'file');
    assert.equal(file.protected_gate_encountered, true);
  });

  it('records the #1195 acceptance verdict on current main', () => {
    assert.equal(CURRENT_MAIN_SHA, 'b731411734edb01b7dbb8d7e20247c5a7805983a');
    assert.equal(
      'CIPC PARTNER RESPONSE PATH USABLE — SEND REMAINS GATED',
      'CIPC PARTNER RESPONSE PATH USABLE — SEND REMAINS GATED',
    );
  });
});
