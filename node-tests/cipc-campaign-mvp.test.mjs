/**
 * CIPC campaign MVP — unit tests (#985).
 *
 * Confirms control flow, scoring, first 10 verified prospects, duplicate
 * suppression, draft generation, and the send gate. No schema. No live send.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  CAMPAIGN_CONFIG,
  CIPC_CAMPAIGN_PRODUCT,
  CIPC_CAMPAIGN_TENANT_ID,
  CIPC_CAMPAIGN_VERSION,
  applyCipcCampaignIntent,
  assertCipcCampaignSafetyFlags,
  buildCipcCampaignLeadUpsert,
  detectCipcCampaignDuplicates,
  draftCipcCampaignOutreach,
  getCipcCampaignPurpose,
  hydrateCipcCampaignRecord,
  isCipcCampaignOperatorScope,
  listCipcCampaignBoard,
  listCipcCampaignSeedProspects,
  mergeCipcCampaignQualificationJson,
  scoreCipcCampaignSignals,
  validateCipcCampaignBoard,
} from '../lib/cipc-desk/campaign-mvp.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_PATH = join(root, 'lib', 'cipc-desk', 'campaign-mvp.js');

const FIRST_TEN = [
  'Apio Advisory',
  'Refined Accountants',
  'NJN Audit',
  'SM Accounting & Advisory',
  'Besalca Accounting',
  'Audax Accounting Solutions',
  'Louis Marais & Partners',
  'Stellar Accounting Solutions',
  'JBS Advisory & Accounting',
  'Esterhuyse & Associates',
];

describe('#985 CIPC campaign MVP — safety', () => {
  it('declares no schema, no send, no public launch', () => {
    const flags = assertCipcCampaignSafetyFlags();
    assert.equal(flags.schema_change, false);
    assert.equal(flags.send, false);
    assert.equal(flags.protected, true);
    assert.equal(flags.public_launch, false);
    const purpose = getCipcCampaignPurpose();
    assert.equal(purpose.version, CIPC_CAMPAIGN_VERSION);
    assert.equal(purpose.issue, '#985');
    assert.equal(purpose.tenant_id, CIPC_CAMPAIGN_TENANT_ID);
    assert.equal(purpose.operator_surface, '/change');
    assert.ok(purpose.reuse.includes('postgres leads'));
    assert.equal(isCipcCampaignOperatorScope({ kind: 'tenant', tenantId: 'cipc-desk' }), true);
    assert.equal(isCipcCampaignOperatorScope({ kind: 'tenant', tenantId: 'luxe-maurice' }), false);
    assert.equal(isCipcCampaignOperatorScope({ kind: 'factory_master' }), true);
  });

  it('does not import messaging senders or invent a second CRM', () => {
    const src = readFileSync(MODULE_PATH, 'utf8');
    assert.equal(src.includes('nodemailer'), false);
    assert.equal(/from ['"].*email/.test(src), false);
    assert.equal(src.includes('twilio'), false);
    assert.equal(src.includes('import.meta'), false);
    assert.match(JSON.stringify(CAMPAIGN_CONFIG.$warning).toLowerCase(), /no second crm/);
    const router = readFileSync(join(root, 'lib', 'cmp', 'router.js'), 'utf8');
    assert.match(router, /cipc-campaign-list/);
    assert.match(router, /PROTECTED_SEND_BLOCKED/);
    assert.match(router, /import\(\s*['"]\.\.\/cipc-desk\/campaign-mvp\.js['"]\s*\)/);
    const change = readFileSync(join(root, 'pages', 'change.js'), 'utf8');
    assert.match(change, /CipcCampaignOperatorPanel/);
  });
});

describe('#985 CIPC campaign MVP — first 10 verified prospects', () => {
  it('loads exactly the first-wave firms from the issue with required fields', () => {
    const board = listCipcCampaignBoard();
    assert.equal(board.length, 10);
    assert.deepEqual(
      board.map((row) => row.company),
      FIRST_TEN,
    );
    const validated = validateCipcCampaignBoard(board);
    assert.deepEqual(validated, { ok: true, count: 10 });
    for (const row of board) {
      assert.equal(row.segment, 'A');
      assert.ok(Number(row.fit_score) >= 55);
      assert.ok(Array.isArray(row.service_overlap_signals));
      assert.ok(String(row.source_evidence_url).startsWith('http'));
      assert.equal(row.approval_state, 'pending');
      assert.notEqual(row.send_state, 'sent');
      assert.equal(row.response_state, 'none');
      assert.equal(row.do_not_contact, false);
      assert.equal(row.control_flow_state, 'message_drafted');
      assert.equal(row.message_draft.send, false);
      assert.match(String(row.next_action), /do not send/i);
    }
  });

  it('keeps unverified decision-maker and email fields blank instead of inventing them', () => {
    const board = listCipcCampaignBoard();
    const apio = board.find((row) => row.prospect_id === 'apio-advisory');
    assert.equal(apio.decision_maker_name, '');
    const jbs = board.find((row) => row.prospect_id === 'jbs-advisory-accounting');
    assert.equal(jbs.email, '');
    assert.equal(jbs.contact_route, 'website_form');
    const refined = board.find((row) => row.prospect_id === 'refined-accountants');
    assert.equal(refined.decision_maker_name, 'Damon Pronk');
    assert.equal(refined.decision_maker_verified, true);
  });

  it('scores from declared signals only', () => {
    assert.equal(
      scoreCipcCampaignSignals({
        existing_secretarial_cipc_client_base: true,
        accounting_advisory_serving_smes: true,
        explicit_secretarial_likely_capacity_need: true,
      }),
      55,
    );
    const louis = listCipcCampaignBoard().find((row) => row.prospect_id === 'louis-marais-partners');
    assert.equal(louis.fit_score, 80);
  });
});

describe('#985 CIPC campaign MVP — drafts, duplicates, persist mapping', () => {
  it('generates one Group A draft per prospect without job-hunt language', () => {
    const seed = listCipcCampaignSeedProspects()[1];
    const draft = draftCipcCampaignOutreach(seed);
    assert.equal(draft.send, false);
    assert.equal(draft.message_version, 'segment-a-v1');
    assert.match(draft.subject, /Refined Accountants/);
    assert.match(draft.body, /fractional \/ white-label/);
    assert.match(draft.body, /draft only/i);
    assert.doesNotMatch(draft.body, /looking for remote work/i);
    assert.doesNotMatch(draft.body, /CIPC clerk/i);
    assert.equal(draft.follow_up.length, 3);
    assert.match(draft.body, /cipc\.corpflowai\.com\/partners/);
  });

  it('suppresses duplicates by website host and email', () => {
    const board = listCipcCampaignBoard();
    const clone = {
      ...board[0],
      prospect_id: 'apio-advisory-dup',
      company: 'Apio Advisory Duplicate',
    };
    const map = detectCipcCampaignDuplicates([...board, clone]);
    assert.equal(map.get('apio-advisory-dup'), 'apio-advisory');
  });

  it('maps onto existing leads + qualification_json without a new table', () => {
    const row = listCipcCampaignBoard()[0];
    const upsert = buildCipcCampaignLeadUpsert(row);
    assert.equal(upsert.tenantId, 'cipc-desk');
    assert.equal(upsert.intent, 'cipc-campaign');
    assert.equal(upsert.qualificationJson.intake_meta.product, CIPC_CAMPAIGN_PRODUCT);
    assert.equal(upsert.qualificationJson.cipc_campaign.prospect_id, row.prospect_id);
    assert.equal(upsert.status, 'NEW');
    const merged = mergeCipcCampaignQualificationJson(
      { lux_operator_workflow: { keep: true }, intake_meta: { source: 'old' } },
      upsert.qualificationJson,
    );
    assert.equal(merged.lux_operator_workflow.keep, true);
    assert.equal(merged.intake_meta.product, CIPC_CAMPAIGN_PRODUCT);
  });

  it('merges stored lead state onto the seed board', () => {
    const board = listCipcCampaignBoard({
      leadRows: [
        {
          id: 'lead_refined_1',
          email: 'damon@refinedaccountants.co.za',
          qualificationJson: {
            cipc_campaign: {
              prospect_id: 'refined-accountants',
              approval_state: 'operator_approved',
              send_state: 'ready_to_send',
              next_action: 'Ready for Anton first-batch send approval. Do not send from the system.',
            },
          },
        },
      ],
    });
    const refined = board.find((row) => row.prospect_id === 'refined-accountants');
    assert.equal(refined.lead_id, 'lead_refined_1');
    assert.equal(refined.persisted, true);
    assert.equal(refined.approval_state, 'operator_approved');
    assert.equal(refined.control_flow_state, 'ready_to_send');
    assert.notEqual(refined.send_state, 'sent');
  });
});

describe('#985 CIPC campaign MVP — approval gate and protected send', () => {
  it('lets the operator approve a draft into ready_to_send without sending', () => {
    const row = listCipcCampaignBoard()[1];
    const result = applyCipcCampaignIntent(row, 'approve');
    assert.equal(result.applied, true);
    assert.equal(result.protected_gate_encountered, false);
    assert.equal(result.record.approval_state, 'operator_approved');
    assert.equal(result.record.send_state, 'ready_to_send');
    assert.equal(result.record.control_flow_state, 'ready_to_send');
  });

  it('blocks live send as the exact protected action', () => {
    const row = applyCipcCampaignIntent(listCipcCampaignBoard()[1], 'approve').record;
    const send = applyCipcCampaignIntent(row, 'send');
    assert.equal(send.applied, false);
    assert.equal(send.protected_gate_encountered, true);
    assert.match(String(send.exact_protected_action), /first outbound campaign batch/i);
    assert.notEqual(send.record.send_state, 'sent');
  });

  it('honours do-not-contact and does not approve those rows', () => {
    const row = listCipcCampaignBoard()[0];
    const dnc = applyCipcCampaignIntent(row, 'do_not_contact');
    assert.equal(dnc.applied, true);
    assert.equal(dnc.record.do_not_contact, true);
    assert.equal(dnc.record.control_flow_state, 'closed');
    const approve = applyCipcCampaignIntent(dnc.record, 'approve');
    assert.equal(approve.applied, false);
    assert.equal(approve.reason, 'do_not_contact_blocks_approval');
  });

  it('does not invent a sendable email on hydrate when the seed email is blank', () => {
    const seed = listCipcCampaignSeedProspects().find((row) => row.id === 'jbs-advisory-accounting');
    const record = hydrateCipcCampaignRecord(seed, {});
    const upsert = buildCipcCampaignLeadUpsert(record);
    assert.equal(upsert.email, '');
    assert.equal(record.email, '');
  });
});
