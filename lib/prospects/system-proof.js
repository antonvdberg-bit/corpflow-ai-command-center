/**
 * Prospect maturation system-proof runner (#713 / WS2 system gate).
 *
 * Walks fresh synthetic prospects through enquiry → qualification → proposal
 * handoff readiness using existing maturation helpers. No CRM, no schema,
 * no email/WhatsApp/SMS send.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertDraftAssetConfigNoSend,
  checkQualificationGate,
  computeDailyOperatorSummary,
  computeWeeklyPipelineSummary,
  getDraftAsset,
  isProspectOverdue,
  isProspectStale,
  isReactivationDue,
  validateActiveProspectRequiredFields,
  validateProspect,
  validateStageTransition,
} from './maturation.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');

export const SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL =
  'artifacts/prospect-maturation-system-proof/latest-run.json';

const SYNTHETIC_NOW = new Date('2026-08-04T12:00:00.000Z');

/**
 * @param {string} rel
 * @param {string} [repoRoot]
 */
function loadFixture(rel, repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, rel), 'utf8'));
}

/**
 * Adapt fixture / view-model fields to the structural qualification gate shape.
 * Gate checks `business_name`; prospect fixtures store `organisation_name`.
 *
 * @param {Record<string, unknown>} prospect
 * @returns {Record<string, unknown>}
 */
export function toQualificationGateProspect(prospect) {
  return {
    ...prospect,
    business_name:
      prospect.business_name ||
      prospect.organisation_name ||
      prospect.business_display_name ||
      null,
  };
}

/**
 * Fresh Lead Rescue prospect for the happy-path walk.
 * @returns {Record<string, unknown>}
 */
export function seedFreshLeadRescueProspect() {
  return {
    id: 'synthetic-pm-sys-713-lr-001',
    reference: 'PM-SYS-LR-001',
    tenant_id: 'factory',
    product: 'ai-lead-rescue',
    person_name: 'Sam Synthetic',
    organisation_name: 'Synthetic Lagoon Desk',
    business_name: 'Synthetic Lagoon Desk',
    email: 'sam.synthetic+pm713@example.com',
    phone: '+2305550713',
    source: '/contact',
    buyer_need: 'losing-enquiries',
    service_interest: 'lead_rescue',
    product_service_path: 'ai-lead-rescue',
    owner: null,
    native_status: 'NEW_INTAKE',
    canonical_stage: 'new',
    priority: null,
    urgency: 'this-month',
    next_action: null,
    next_action_due: null,
    last_meaningful_activity_at: '2026-08-04T06:00:00.000Z',
    qualification_complete: false,
    estimated_value: 150,
    currency: 'USD',
    consent_contact: true,
    closure_reason: null,
    waiting_on: 'operator',
    created_at: '2026-08-04T06:00:00.000Z',
    updated_at: '2026-08-04T06:00:00.000Z',
    activity_count: 0,
  };
}

/**
 * Fresh Website Rescue prospect for a parallel maturation walk.
 * @returns {Record<string, unknown>}
 */
export function seedFreshWebsiteRescueProspect() {
  return {
    id: 'synthetic-pm-sys-713-wr-001',
    reference: 'PM-SYS-WR-001',
    tenant_id: 'factory',
    product: 'corpflow-rapid-delivery',
    person_name: 'Casey Synthetic',
    organisation_name: 'Synthetic Coral Pages',
    business_name: 'Synthetic Coral Pages',
    email: 'casey.synthetic+pm713@example.com',
    phone: '+2305550714',
    source: '/offers/premium-landing-page-rescue',
    buyer_need: 'website-improvement',
    service_interest: 'website_rescue',
    product_service_path: 'website_rescue',
    owner: null,
    native_status: 'new_intake',
    canonical_stage: 'new',
    priority: null,
    urgency: 'this-month',
    next_action: null,
    next_action_due: null,
    last_meaningful_activity_at: '2026-08-04T06:30:00.000Z',
    qualification_complete: false,
    estimated_value: 15000,
    currency: 'MUR',
    consent_contact: true,
    closure_reason: null,
    waiting_on: 'operator',
    created_at: '2026-08-04T06:30:00.000Z',
    updated_at: '2026-08-04T06:30:00.000Z',
    activity_count: 0,
  };
}

/**
 * Assign required active fields so maturation gates can pass.
 * @param {Record<string, unknown>} prospect
 * @param {{ owner?: string, next_action?: string, next_action_due?: string }} fields
 */
export function assignOperatorFields(prospect, fields = {}) {
  return {
    ...prospect,
    owner: fields.owner ?? 'Anton Operator',
    next_action: fields.next_action ?? 'Acknowledge enquiry and start qualification',
    next_action_due: fields.next_action_due ?? '2026-08-05T12:00:00.000Z',
    waiting_on: 'operator',
    updated_at: SYNTHETIC_NOW.toISOString(),
  };
}

/**
 * @param {Record<string, unknown>} seed
 * @param {Array<{ to: string, patch: Record<string, unknown> }>} path
 * @param {'ai_lead_rescue' | 'website_rescue'} gateKey
 */
function walkMaturationPath(seed, path, gateKey) {
  /** @type {Array<{ from: string, to: string, allowed: boolean, reason?: string }>} */
  const transitions = [];
  let current = { ...seed };

  const missingAtStart = validateActiveProspectRequiredFields(current);

  current = assignOperatorFields(current, {
    next_action: 'Send acknowledgement draft and open qualifying checklist',
    next_action_due: '2026-08-04T18:00:00.000Z',
  });

  for (const step of path) {
    const from = String(current.canonical_stage || '');
    const result = validateStageTransition(current, step.to);
    transitions.push({
      from,
      to: step.to,
      allowed: result.allowed === true,
      reason: result.allowed ? undefined : result.reason || 'blocked',
    });
    if (!result.allowed) {
      return {
        ok: false,
        prospect: current,
        transitions,
        failed_at: step.to,
        reason: result.reason || 'TRANSITION_BLOCKED',
        missing_required_at_start: missingAtStart,
        qualification: null,
        drafts: null,
        no_send_config: assertDraftAssetConfigNoSend(),
      };
    }
    current = {
      ...current,
      ...step.patch,
      canonical_stage: step.to,
      updated_at: SYNTHETIC_NOW.toISOString(),
      last_meaningful_activity_at: SYNTHETIC_NOW.toISOString(),
    };
  }

  const qualification = checkQualificationGate(toQualificationGateProspect(current), gateKey);
  const draftAck = getDraftAsset('acknowledgement');
  const draftProposal = getDraftAsset('proposal_handoff');
  const noSend = assertDraftAssetConfigNoSend();

  return {
    ok: qualification.qualified === true && noSend.safe === true,
    prospect: current,
    transitions,
    missing_required_at_start: missingAtStart,
    qualification,
    drafts: {
      acknowledgement_send: draftAck?.send === false,
      proposal_handoff_send: draftProposal?.send === false,
    },
    no_send_config: noSend,
  };
}

/**
 * Walk Lead Rescue prospect through maturation stages to proposal_sent.
 * @param {Record<string, unknown>} [seed]
 */
export function walkLeadRescueMaturationPath(seed = seedFreshLeadRescueProspect()) {
  return walkMaturationPath(
    seed,
    [
      {
        to: 'qualifying',
        patch: {
          native_status: 'QUALIFYING',
          qualification_complete: false,
          next_action: 'Complete Lead Rescue qualification checklist',
          next_action_due: '2026-08-05T12:00:00.000Z',
        },
      },
      {
        to: 'discovery_booked',
        patch: {
          native_status: 'DEMO_BOOKED',
          qualification_complete: true,
          next_action: 'Run discovery call; confirm leaky source and owner WhatsApp',
          next_action_due: '2026-08-06T12:00:00.000Z',
        },
      },
      {
        to: 'proposal_ready',
        patch: {
          native_status: 'QUOTE_SENT',
          next_action: 'Prepare pilot proposal for Anton approval before send',
          next_action_due: '2026-08-06T18:00:00.000Z',
        },
      },
      {
        to: 'proposal_sent',
        patch: {
          native_status: 'QUOTE_SENT',
          next_action: 'Wait for prospect reply; follow up once after agreed interval',
          next_action_due: '2026-08-08T12:00:00.000Z',
          waiting_on: 'prospect',
        },
      },
    ],
    'ai_lead_rescue',
  );
}

/**
 * Walk Website Rescue prospect through maturation stages to proposal_ready.
 * @param {Record<string, unknown>} [seed]
 */
export function walkWebsiteRescueMaturationPath(seed = seedFreshWebsiteRescueProspect()) {
  return walkMaturationPath(
    seed,
    [
      {
        to: 'qualifying',
        patch: {
          native_status: 'reviewing',
          qualification_complete: false,
          next_action: 'Complete Website Rescue qualification checklist',
          next_action_due: '2026-08-05T12:00:00.000Z',
        },
      },
      {
        to: 'discovery_booked',
        patch: {
          native_status: 'discovery_booked',
          qualification_complete: true,
          next_action: 'Run discovery; capture current site URL and rescue scope',
          next_action_due: '2026-08-06T12:00:00.000Z',
        },
      },
      {
        to: 'proposal_ready',
        patch: {
          native_status: 'quote_ready',
          next_action: 'Assemble Website Rescue proposal for commercial review',
          next_action_due: '2026-08-07T12:00:00.000Z',
        },
      },
    ],
    'website_rescue',
  );
}

/**
 * Prove gate / detection scenarios from fixtures + synthetic mutations.
 * @param {string} [repoRoot]
 */
export function proveMaturationGateBlocks(repoRoot = REPO_ROOT) {
  const missingOwner = loadFixture(
    'fixtures/prospect-maturation/07-active-prospect-missing-owner.json',
    repoRoot,
  );
  const missingNext = loadFixture(
    'fixtures/prospect-maturation/08-active-prospect-missing-next-action.json',
    repoRoot,
  );
  const overdue = loadFixture('fixtures/prospect-maturation/03-overdue-prospect.json', repoRoot);
  const stalled = loadFixture('fixtures/prospect-maturation/04-stalled-prospect.json', repoRoot);
  const lost = loadFixture('fixtures/prospect-maturation/05-lost-prospect-with-reason.json', repoRoot);
  const reactivation = loadFixture(
    'fixtures/prospect-maturation/06-reactivation-due-prospect.json',
    repoRoot,
  );
  const qualifiedWr = loadFixture(
    'fixtures/prospect-maturation/02-qualified-website-rescue-prospect.json',
    repoRoot,
  );

  const seed = seedFreshLeadRescueProspect();
  const badJump = validateStageTransition(seed, 'proposal_sent');
  const ownerGate = validateStageTransition(
    { ...seed, canonical_stage: 'new', owner: null },
    'qualifying',
  );
  const closureGate = validateStageTransition(
    { ...seed, canonical_stage: 'qualifying', owner: 'Anton', closure_reason: null },
    'lost',
  );

  return {
    missing_owner: {
      validation: validateActiveProspectRequiredFields(missingOwner),
      combined: validateProspect(missingOwner),
    },
    missing_next_action_or_due: {
      validation: validateActiveProspectRequiredFields(missingNext),
      combined: validateProspect(missingNext),
    },
    overdue: {
      overdue: isProspectOverdue(overdue, SYNTHETIC_NOW),
    },
    stalled: {
      stale: isProspectStale(stalled, SYNTHETIC_NOW),
      stage: stalled.canonical_stage,
      closure_reason: stalled.closure_reason || null,
    },
    lost_with_reason: {
      validation: validateProspect(lost),
      stage: lost.canonical_stage,
      closure_reason: lost.closure_reason || null,
    },
    reactivation_due: {
      due: isReactivationDue(reactivation, SYNTHETIC_NOW),
    },
    qualified_website_rescue: {
      qualification: checkQualificationGate(toQualificationGateProspect(qualifiedWr), 'website_rescue'),
      validation: validateActiveProspectRequiredFields(qualifiedWr),
    },
    invalid_jump_new_to_proposal_sent: {
      allowed: badJump.allowed === true,
      reason: badJump.reason || null,
    },
    owner_required_before_qualifying: {
      allowed: ownerGate.allowed === true,
      reason: ownerGate.reason || null,
    },
    closure_reason_required_for_lost: {
      allowed: closureGate.allowed === true,
      reason: closureGate.reason || null,
    },
  };
}

/**
 * Run the independent prospect maturation system-proof path.
 * @param {{ repoRoot?: string, writeArtifact?: boolean }} [options]
 */
export function runProspectMaturationSystemProof(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const walkLr = walkLeadRescueMaturationPath(seedFreshLeadRescueProspect());
  const walkWr = walkWebsiteRescueMaturationPath(seedFreshWebsiteRescueProspect());
  const gates = proveMaturationGateBlocks(repoRoot);

  const fixturePaths = [
    'fixtures/prospect-maturation/01-new-lead-rescue-prospect.json',
    'fixtures/prospect-maturation/02-qualified-website-rescue-prospect.json',
    'fixtures/prospect-maturation/03-overdue-prospect.json',
    'fixtures/prospect-maturation/04-stalled-prospect.json',
    'fixtures/prospect-maturation/05-lost-prospect-with-reason.json',
    'fixtures/prospect-maturation/06-reactivation-due-prospect.json',
    'fixtures/prospect-maturation/07-active-prospect-missing-owner.json',
    'fixtures/prospect-maturation/08-active-prospect-missing-next-action.json',
  ];
  const fixtures = fixturePaths.map((rel) => loadFixture(rel, repoRoot));
  const daily = computeDailyOperatorSummary(fixtures, SYNTHETIC_NOW);
  const weekly = computeWeeklyPipelineSummary(fixtures, SYNTHETIC_NOW);
  const noSend = assertDraftAssetConfigNoSend();

  const gatesOk =
    gates.missing_owner.validation.valid === false &&
    gates.missing_next_action_or_due.validation.valid === false &&
    gates.overdue.overdue === true &&
    gates.reactivation_due.due === true &&
    gates.lost_with_reason.validation.valid === true &&
    gates.invalid_jump_new_to_proposal_sent.allowed === false &&
    gates.owner_required_before_qualifying.allowed === false &&
    gates.closure_reason_required_for_lost.allowed === false &&
    gates.qualified_website_rescue.qualification?.qualified === true;

  /** @type {Record<string, unknown>} */
  const report = {
    schema: 'corpflow.prospect_maturation_system_proof.v1',
    issue: 713,
    ran_at: SYNTHETIC_NOW.toISOString(),
    simulation_only: true,
    external_sends_executed: [],
    messaging_runtime_authorized: false,
    no_send_config: noSend,
    walk_lead_rescue: {
      ok: walkLr.ok,
      final_stage: walkLr.prospect?.canonical_stage || null,
      transitions: walkLr.transitions,
      missing_required_at_start: walkLr.missing_required_at_start,
      qualification: walkLr.qualification || null,
      drafts: walkLr.drafts || null,
      failed_at: walkLr.failed_at || null,
      reason: walkLr.reason || null,
      prospect_ref: walkLr.prospect?.reference || null,
      prospect_id: walkLr.prospect?.id || null,
      buyer_need: walkLr.prospect?.buyer_need || null,
      service_interest: walkLr.prospect?.service_interest || null,
    },
    walk_website_rescue: {
      ok: walkWr.ok,
      final_stage: walkWr.prospect?.canonical_stage || null,
      transitions: walkWr.transitions,
      missing_required_at_start: walkWr.missing_required_at_start,
      qualification: walkWr.qualification || null,
      drafts: walkWr.drafts || null,
      failed_at: walkWr.failed_at || null,
      reason: walkWr.reason || null,
      prospect_ref: walkWr.prospect?.reference || null,
      prospect_id: walkWr.prospect?.id || null,
      buyer_need: walkWr.prospect?.buyer_need || null,
      service_interest: walkWr.prospect?.service_interest || null,
    },
    gate_block_proof: gates,
    operator_summaries: {
      daily: {
        total: daily.total,
        active: daily.active,
        overdue: daily.overdue,
        due_today: daily.due_today,
        stalled: daily.stalled,
        missing_owner: daily.missing_owner,
        missing_next_action: daily.missing_next_action,
        new_unreviewed: daily.new_unreviewed,
        action_required_ids: daily.action_required_ids,
      },
      weekly: {
        total: weekly.total,
        terminal: weekly.terminal,
        stale_active: weekly.stale_active,
        health: weekly.health,
        by_stage: weekly.by_stage,
      },
    },
  };

  report.ok =
    walkLr.ok === true &&
    walkWr.ok === true &&
    gatesOk === true &&
    noSend.safe === true &&
    Array.isArray(report.external_sends_executed) &&
    report.external_sends_executed.length === 0 &&
    report.messaging_runtime_authorized === false;

  if (options.writeArtifact !== false) {
    const outPath = path.join(repoRoot, SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    report.artifact_path = SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL;
  }

  return report;
}
