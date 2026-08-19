import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CIPC_FIRST_SERVICE_IDS,
  CIPC_SERVICE_FACTORY_VERSION,
  FACTORY_CONFIG,
  applyCipcFactoryIntent,
  assertSafeEvidenceRecord,
  buildCipcPartnerPortfolio,
  buildEvidenceChecklist,
  classifyCipcExceptions,
  deriveCipcFactoryState,
  draftCipcClientStatusUpdate,
  draftCipcMissingInformationRequest,
  evaluateCipcFactoryMatter,
  filterCipcExceptionWorkbench,
  getCipcFictionalScenario,
  getCipcServiceFactoryPurpose,
  getCipcServiceTemplate,
  listCipcServiceTemplates,
  mapFactoryStateToLayer5,
  resolveCipcServiceId,
  runCipcFictionalScenario,
} from '../lib/cipc-desk/service-factory.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('factory config reuses existing primitives and forbids a second data model', () => {
  const purpose = getCipcServiceFactoryPurpose();
  assert.equal(purpose.version, CIPC_SERVICE_FACTORY_VERSION);
  assert.equal(purpose.issue, '#988');
  assert.equal(purpose.tenant_id, 'cipc-desk');
  assert.equal(purpose.schema_change, false);
  assert.equal(purpose.send, false);
  assert.equal(purpose.public_launch, false);
  assert.ok(asArr(purpose.reuse).includes('cmp_tickets'));
  assert.ok(asArr(purpose.reuse).includes('POST /api/cipc-desk/email-intake'));
  assert.equal(FACTORY_CONFIG.$schema_change, false);
  assert.doesNotMatch(JSON.stringify(FACTORY_CONFIG), /create table|new prisma model|second postgres/i);
});

test('common service template covers Annual Returns, Director Changes, and Beneficial Ownership', () => {
  const templates = listCipcServiceTemplates();
  assert.deepEqual(
    templates.map((t) => t.service_id),
    [...CIPC_FIRST_SERVICE_IDS],
  );
  for (const t of templates) {
    assert.ok(t.pack);
    assert.ok(String(t.standing_url).startsWith('https://cipc.corpflowai.com/'));
    assert.ok(Array.isArray(t.email_intake_slugs) && t.email_intake_slugs.length >= 1);
    assert.deepEqual(t.v1_entity_scope, ['pty_ltd', 'cc']);
    assert.ok(asArr(t.human_gates).includes('external_cipc_submission'));
    assert.ok(asArr(t.deterministic_moves).includes('complete_clean_case_to_ready_to_file'));
  }
  assert.equal(resolveCipcServiceId('annual-returns'), 'annual_returns');
  assert.equal(resolveCipcServiceId('director-appointments-resignations'), 'director_changes');
  assert.equal(resolveCipcServiceId('beneficial ownership review feedback'), 'beneficial_ownership');
  assert.equal(getCipcServiceTemplate('annual_returns')?.pack_status, 'sarah_approved_v1');
});

test('factory states map onto existing Layer 5 statuses rather than a new ticket lifecycle', () => {
  assert.equal(mapFactoryStateToLayer5('ready_to_file'), 'ready_for_submission');
  assert.equal(mapFactoryStateToLayer5('specialist_gate'), 'specialist_review');
  assert.equal(mapFactoryStateToLayer5('information_incomplete'), 'information_incomplete');
  assert.equal(mapFactoryStateToLayer5('completed'), 'completed');
  const primitiveMap = FACTORY_CONFIG.primitive_map;
  assert.equal(primitiveMap.scoped_service.tables[0], 'cmp_tickets');
  assert.equal(primitiveMap.qualified_lead.tables[0], 'leads');
  assert.equal(primitiveMap.audit_trail.tables.includes('telemetry_events'), true);
});

test('clean Annual Return reaches ready_to_file and cannot auto-submit', () => {
  const run = runCipcFictionalScenario('annual_returns_clean_pty_ltd');
  assert.equal(run.evaluation.service_id, 'annual_returns');
  assert.equal(run.evaluation.factory_state, 'ready_to_file');
  assert.equal(run.evaluation.layer5_status, 'ready_for_submission');
  assert.equal(run.evaluation.workbench_visible, false);
  assert.equal(run.evaluation.may_auto_submit, false);
  assert.equal(run.evaluation.blocked_protected_action, 'controlled external CIPC submission');
  assert.equal(run.submit_attempt.applied, false);
  assert.equal(run.submit_attempt.protected_gate_encountered, true);
  assert.match(String(run.submit_attempt.exact_protected_action), /external CIPC submission/i);
  assert.match(run.missing_info_draft, /Draft only — not sent/);
  assert.match(run.client_update_draft, /Draft only — not sent/);
});

test('director death and complex BO escalate to the exception workbench', () => {
  const death = runCipcFictionalScenario('director_changes_death');
  assert.equal(death.evaluation.service_id, 'director_changes');
  assert.equal(death.evaluation.factory_state, 'specialist_gate');
  assert.equal(death.evaluation.layer5_status, 'specialist_review');
  assert.equal(death.evaluation.workbench_visible, true);
  assert.ok(death.evaluation.exceptions.includes('director_death_or_removal'));
  assert.equal(death.submit_attempt.applied, false);

  const trust = runCipcFictionalScenario('beneficial_ownership_trust');
  assert.equal(trust.evaluation.service_id, 'beneficial_ownership');
  assert.equal(trust.evaluation.factory_state, 'specialist_gate');
  assert.ok(trust.evaluation.exceptions.includes('complex_beneficial_ownership'));
  assert.match(JSON.stringify(trust.evaluation), /specialist/);
  assert.doesNotMatch(JSON.stringify(trust), /we have determined that/i);
});

test('partner portfolio groups one firm and shows Sarah only the exception entity', () => {
  const run = runCipcFictionalScenario('partner_portfolio_three_entities');
  assert.equal(run.portfolio.length, 1);
  assert.equal(run.portfolio[0].partner_key, 'cf988-fictional-accounting-firm');
  assert.equal(run.portfolio[0].entity_count, 3);
  assert.equal(run.portfolio[0].workbench_count, 1);
  assert.equal(run.workbench.length, 1);
  assert.equal(run.workbench[0].service_id, 'beneficial_ownership');
  assert.ok(run.evaluations.some((ev) => ev.service_id === 'annual_returns' && ev.factory_state === 'ready_to_file'));
});

test('completion requires proof metadata and never stores sensitive document bytes', () => {
  const completed = runCipcFictionalScenario('annual_returns_completed_with_proof');
  assert.equal(completed.evaluation.factory_state, 'completed');
  assert.equal(completed.evaluation.layer5_status, 'completed');
  const evidence = buildEvidenceChecklist(getCipcFictionalScenario('annual_returns_completed_with_proof'));
  assert.ok(evidence.some((item) => item.kind === 'filing_certificate_reference' && item.present === true));

  const clean = getCipcFictionalScenario('annual_returns_clean_pty_ltd');
  assert.notEqual(deriveCipcFactoryState(clean), 'completed');

  const safe = assertSafeEvidenceRecord({
    kind: 'filing_confirmation_reference',
    file_name: 'ar-confirmation-fictional.pdf',
    pointer: 'cmp_ticket_attachments:fictional',
  });
  assert.equal(safe.ok, true);

  const blocked = assertSafeEvidenceRecord({
    kind: 'identity_document_image',
    file_name: 'id-scan.png',
    bytes: 'not-allowed',
  });
  assert.equal(blocked.ok, false);
});

test('live send and payment intents stay blocked; missing-info drafts stay drafts', () => {
  const matter = getCipcFictionalScenario('annual_returns_clean_pty_ltd');
  const send = applyCipcFactoryIntent(matter, 'live_client_send');
  const pay = applyCipcFactoryIntent(matter, 'payment');
  assert.equal(send.applied, false);
  assert.match(String(send.exact_protected_action), /live email/i);
  assert.equal(pay.applied, false);
  assert.match(String(pay.exact_protected_action), /payment/i);
  const draft = draftCipcMissingInformationRequest({
    brief: { service: 'annual-returns', missing_information: ['enterprise number'] },
    client_view: { cipc_desk: { entity_type: 'pty_ltd' } },
  });
  assert.match(draft, /Draft only/);
  assert.match(draft, /enterprise/);
});

test('canonical doc records the eight required #988 work items', () => {
  const doc = readFileSync(join(root, 'docs/operations/CIPC_SERVICE_FACTORY_READINESS_V1.md'), 'utf8');
  assert.match(doc, /#988/);
  assert.match(doc, /#640/);
  assert.match(doc, /cmp_tickets/);
  assert.match(doc, /common factory/);
  assert.match(doc, /Deterministic/);
  assert.match(doc, /Human gates/);
  assert.match(doc, /Never.*GitHub/s);
  assert.match(doc, /partner_key/);
  assert.match(doc, /Exception workbench/);
  assert.match(doc, /proof-of-filing/);
  assert.match(doc, /Fictional end-to-end/);
  assert.match(doc, /ANTON ACTION: NONE/);
  assert.match(doc, /Not a public launch/);
  assert.doesNotMatch(doc, /we will file within|guaranteed within|official CIPC partner/i);
});

test('NPC or missing mandate stays off the ready-to-file path', () => {
  const npc = evaluateCipcFactoryMatter({
    brief: { service: 'annual-returns' },
    client_view: {
      cipc_desk: {
        entity_key: 'K2026/009999/08',
        entity_type: 'npc',
        mandate_signed: true,
        prerequisites: { bo: 'satisfied', afs_fas: 'satisfied' },
      },
    },
  });
  assert.ok(classifyCipcExceptions(npc).length >= 0);
  assert.equal(npc.factory_state, 'specialist_gate');
  assert.ok(npc.exceptions.includes('entity_outside_v1_scope'));

  const noMandate = evaluateCipcFactoryMatter({
    brief: { service: 'annual-returns' },
    client_view: {
      cipc_desk: {
        entity_key: 'K2026/000010/07',
        entity_type: 'pty_ltd',
        mandate_signed: false,
        prerequisites: { bo: 'satisfied', afs_fas: 'satisfied' },
      },
    },
  });
  assert.equal(noMandate.factory_state, 'mandate');
  assert.equal(noMandate.workbench_visible, false);
});

test('exception workbench hides clean ready-to-file clerical work', () => {
  const matters = [
    getCipcFictionalScenario('annual_returns_clean_pty_ltd'),
    getCipcFictionalScenario('director_changes_death'),
  ];
  const board = filterCipcExceptionWorkbench(matters);
  assert.equal(board.length, 1);
  assert.equal(board[0].ticket_id, 'cf988-dc-death');
  const portfolio = buildCipcPartnerPortfolio(matters);
  assert.equal(portfolio.length, 0);
});

test('client status draft does not claim a live send occurred', () => {
  const text = draftCipcClientStatusUpdate(getCipcFictionalScenario('annual_returns_clean_pty_ltd'));
  assert.match(text, /Draft only — not sent/);
  assert.doesNotMatch(text, /email was sent|we have submitted to CIPC/i);
});

/**
 * @param {unknown} v
 * @returns {unknown[]}
 */
function asArr(v) {
  return Array.isArray(v) ? v : [];
}
