/**
 * #711 integrated Scenarios A (Lead Rescue) and B (Website Rescue).
 *
 * Composes final-main capabilities only:
 * - market buyer-need routing (#749)
 * - prospect maturation walks (#713 / #755)
 * - commercial approval rail (#714)
 * - Lead Rescue / Website Rescue system-proof delivery (#715 / #716)
 *
 * No schema, no messaging runtime, no real DNS, no production deploy.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MARKET_BUYER_NEED_OPTIONS,
  mapBuyerNeedToInternal,
  resolveMarketEnquiryRouting,
  isConsistentServiceProductPair,
  recommendedMarketEnquiryNextAction,
} from '../public/corpflow-market-service-paths.js';
import {
  proveMaturationGateBlocks,
  walkLeadRescueMaturationPath,
  walkWebsiteRescueMaturationPath,
} from '../prospects/system-proof.js';
import {
  assertDraftAssetConfigNoSend,
  getDraftAsset,
  validateStageTransition,
} from '../prospects/maturation.js';
import {
  toOnboardingHandoff,
  evaluateFinancialApprovalGate,
} from '../revenue/commercial-approval.js';
import {
  buildSystemProofIntake as buildLrIntake,
  seedOnboardingRecordFromHandoff as seedLrOnboarding,
  completeOnboardingInputs as completeLrInputs,
  proveBuildGateBlocks as proveLrGates,
  walkSystemProofDeliveryPath as walkLrDelivery,
} from '../lead-rescue/system-proof.js';
import {
  canUseMessagingRuntime as canUseLrMessaging,
} from '../lead-rescue/onboarding-delivery.js';
import {
  buildSystemProofIntake as buildWrIntake,
  seedOnboardingRecordFromHandoff as seedWrOnboarding,
  completeOnboardingInputs as completeWrInputs,
  proveBuildGateBlocks as proveWrGates,
  walkSystemProofDeliveryPath as walkWrDelivery,
} from '../website-rescue/system-proof.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');

export const INTEGRATED_ARTIFACT_DIR_REL = 'artifacts/gtm-integrated-711';
export const INTEGRATED_RUN_ID = 'GTM-711-FINAL-MAIN-20260805';

/** Fresh synthetic IDs for this final-main execution (not prior system-proof fixture IDs). */
export const SCENARIO_A_IDS = Object.freeze({
  run_id: INTEGRATED_RUN_ID,
  enquiry_ref: 'INT-SYN-711A-20260805-001',
  prospect_id: 'synthetic-pm-int-711a-lr-001',
  prospect_ref: 'PM-INT-711A-LR-20260805-001',
  commercial_id: 'synthetic-ca-711a-lr-001',
  opportunity_ref: 'OPP-SYN-711A-LR-20260805-001',
  financial_approval_ref: 'FA-SYN-711A-LR-20260805-001',
  payment_evidence_ref: 'PAY-EV-SYN-711A-LR-20260805-001',
  onboarding_id: 'synthetic-onb-711a-lr-001',
  onboarding_ref: 'ONB-SYN-711A-LR-20260805-001',
  delivery_ref: 'DEL-SYN-711A-LR-20260805-001',
});

export const SCENARIO_B_IDS = Object.freeze({
  run_id: INTEGRATED_RUN_ID,
  enquiry_ref: 'INT-SYN-711B-20260805-001',
  prospect_id: 'synthetic-pm-int-711b-wr-001',
  prospect_ref: 'PM-INT-711B-WR-20260805-001',
  commercial_id: 'synthetic-ca-711b-wr-001',
  opportunity_ref: 'OPP-SYN-711B-WR-20260805-001',
  financial_approval_ref: 'FA-SYN-711B-WR-20260805-001',
  payment_evidence_ref: 'PAY-EV-SYN-711B-WR-20260805-001',
  onboarding_id: 'synthetic-onb-711b-wr-001',
  onboarding_ref: 'ONB-SYN-711B-WR-20260805-001',
  delivery_ref: 'DEL-SYN-711B-WR-20260805-001',
});

const RAN_AT = '2026-08-05T00:30:00.000Z';

/**
 * @param {'lead-rescue' | 'website-rescue'} product
 * @param {typeof SCENARIO_A_IDS | typeof SCENARIO_B_IDS} ids
 * @param {Record<string, unknown>} extras
 */
function buildFinanciallyApprovedCommercial(product, ids, extras = {}) {
  const isLr = product === 'lead-rescue';
  const currency = isLr ? 'USD' : 'MUR';
  const setup = isLr ? 150 : 95000;
  const depositOrFull = isLr ? 150 : 47500;
  const paymentTerms = isLr ? 'pilot_full_upfront' : 'deposit_50_balance_before_production';
  const offerKind = isLr ? 'pilot' : 'standard';
  const wonReason = isLr ? 'accepted_pilot' : 'accepted_standard_offer';
  const scope = isLr
    ? 'Lead Rescue launch pilot (synthetic #711A): one leaky enquiry source; messaging runtime off.'
    : 'Website Rescue T3 bounded rebuild (synthetic #711B): home/about/services/contact; DNS simulated only.';

  return {
    id: ids.commercial_id,
    opportunity_ref: ids.opportunity_ref,
    product,
    prospect_ref: ids.prospect_ref,
    onboarding_ref: ids.onboarding_ref,
    delivery_ref: ids.delivery_ref,
    proposal_status: 'accepted',
    proposal_version: 'v1.0',
    quoted_currency: currency,
    setup_price: setup,
    recurring_price: isLr ? 99 : null,
    offer_kind: offerKind,
    payment_terms: paymentTerms,
    scope_summary: scope,
    acceptance_status: 'accepted',
    accepted_by: extras.accepted_by || (isLr ? 'Sam Approver (client)' : 'Jordan Approver (client)'),
    acceptance_timestamp: '2026-08-05T00:10:00Z',
    payment_evidence_status: 'verified',
    payment_evidence_ref: ids.payment_evidence_ref,
    financial_review_status: 'approved',
    financially_approved: false,
    approved_by: 'Anton (operator financial approver)',
    approval_timestamp: '2026-08-05T00:20:00Z',
    won_lost_status: 'won',
    won_lost_reason: wonReason,
    commercial_notes: `Fresh synthetic #711 integrated commercial — ${ids.run_id}`,
    commercial_blockers: [],
    financial_approval_ref: ids.financial_approval_ref,
    proposal: {
      status: 'accepted',
      version: 'v1.0',
      currency,
      setup_price: setup,
      recurring_price: isLr ? 99 : null,
      payment_terms: paymentTerms,
      scope_summary: scope,
      offer_kind: offerKind,
      ...(isLr ? {} : { case_type: 'rebuild' }),
    },
    acceptance: {
      status: 'accepted',
      accepted_by: extras.accepted_by || (isLr ? 'Sam Approver (client)' : 'Jordan Approver (client)'),
      acceptance_timestamp: '2026-08-05T00:10:00Z',
      acceptance_method: isLr ? 'email_confirmation' : 'signed_pdf',
      proposal_version: 'v1.0',
    },
    payment_evidence: {
      status: 'verified',
      evidence_type: 'bank_transfer_reference',
      evidence_ref: ids.payment_evidence_ref,
      evidence_date: '2026-08-05',
      expected_amount: depositOrFull,
      amount_evidenced: depositOrFull,
      currency,
      payment_term: paymentTerms,
      verified_by: 'Anton (operator)',
      notes: 'Synthetic payment evidence only — no bank credentials.',
    },
    payment_exception: null,
  };
}

/**
 * Market-path regression checks for final main (synthetic, no form redesign).
 */
export function runMarketPathRegression() {
  const options = MARKET_BUYER_NEED_OPTIONS.map((o) => o.id);
  const labels = MARKET_BUYER_NEED_OPTIONS.map((o) => o.label);
  const lr = mapBuyerNeedToInternal('losing-enquiries');
  const wr = mapBuyerNeedToInternal('website-improvement');
  const contradiction = isConsistentServiceProductPair('client-lead-service', 'premium-landing-page-rescue');
  const lockedWr = resolveMarketEnquiryRouting({
    locked_offer: true,
    offer_slug: 'premium-landing-page-rescue',
  });
  const lockedLr = resolveMarketEnquiryRouting({
    locked_offer: true,
    offer_slug: 'ai-lead-rescue',
  });
  const next = recommendedMarketEnquiryNextAction({
    buyer_need: 'losing-enquiries',
    urgency: 'this-month',
  });

  const ok =
    options.length === 5 &&
    labels.includes('I am losing or mishandling enquiries') &&
    lr.ok === true &&
    lr.service_interest === 'lead_rescue' &&
    lr.offer_slug === 'ai-lead-rescue' &&
    wr.ok === true &&
    wr.service_interest === 'website_rescue' &&
    wr.offer_slug === 'premium-landing-page-rescue' &&
    contradiction.ok === false &&
    lockedWr.ok === true &&
    lockedWr.service_interest === 'website_rescue' &&
    lockedLr.ok === true &&
    lockedLr.service_interest === 'lead_rescue';

  return {
    ok,
    buyer_need_option_count: options.length,
    buyer_need_ids: options,
    lead_rescue_map: lr,
    website_rescue_map: wr,
    contradiction_rejected: contradiction.ok === false,
    contradiction_reason: contradiction.ok ? null : contradiction.reason,
    locked_offer_lead_rescue: lockedLr,
    locked_offer_website_rescue: lockedWr,
    next_action_sample: next,
    dual_fields_absent_in_options: true,
    automatic_external_action: false,
  };
}

/**
 * Scenario A — Lead Rescue integrated path with fresh IDs.
 */
export function runScenarioALeadRescue() {
  const ids = SCENARIO_A_IDS;
  /** @type {Array<{ step: string, from?: string, to?: string, ok: boolean, detail?: unknown }>} */
  const ledger = [];
  const external_sends_executed = [];

  const routing = resolveMarketEnquiryRouting({ buyer_need: 'losing-enquiries' });
  ledger.push({
    step: 'market_enquiry_classification',
    ok: routing.ok === true,
    detail: {
      enquiry_ref: ids.enquiry_ref,
      buyer_need: 'losing-enquiries',
      routing,
      source: '/contact#discovery',
      consent_contact: true,
      urgency: 'this-month',
    },
  });
  if (!routing.ok) {
    return { ok: false, scenario: 'A', ids, ledger, reason: 'ROUTING_FAILED', external_sends_executed };
  }

  const seed = {
    id: ids.prospect_id,
    reference: ids.prospect_ref,
    tenant_id: 'factory',
    product: 'ai-lead-rescue',
    person_name: 'Alex Integrated',
    organisation_name: 'Integrated Lagoon Desk',
    business_name: 'Integrated Lagoon Desk',
    email: 'alex.integrated+711a@example.com',
    phone: '+2305550711',
    source: '/contact#discovery',
    buyer_need: routing.buyer_need,
    service_interest: routing.service_interest,
    product_service_path: 'ai-lead-rescue',
    market_service_path: routing.service_path,
    offer_slug: routing.offer_slug,
    owner: null,
    native_status: 'NEW_INTAKE',
    canonical_stage: 'new',
    urgency: 'this-month',
    next_action: null,
    next_action_due: null,
    last_meaningful_activity_at: RAN_AT,
    qualification_complete: false,
    estimated_value: 150,
    currency: 'USD',
    consent_contact: true,
    closure_reason: null,
    waiting_on: 'operator',
    created_at: RAN_AT,
    updated_at: RAN_AT,
    activity_count: 0,
    enquiry_ref: ids.enquiry_ref,
  };

  const draftAck = getDraftAsset('acknowledgement');
  const noSend = assertDraftAssetConfigNoSend();
  ledger.push({
    step: 'acknowledgement_draft_only',
    ok: draftAck?.send === false && noSend.safe === true,
    detail: { asset_id: 'acknowledgement', send: draftAck?.send, no_send_config: noSend },
  });

  const ownerGate = validateStageTransition(seed, 'qualifying');
  ledger.push({
    step: 'gate_owner_required_before_qualifying',
    ok: ownerGate.allowed === false,
    detail: ownerGate,
  });

  const walk = walkLeadRescueMaturationPath(seed);
  ledger.push({
    step: 'prospect_maturation_walk',
    ok: walk.ok === true && walk.prospect?.canonical_stage === 'proposal_sent',
    detail: {
      transitions: walk.transitions,
      final_stage: walk.prospect?.canonical_stage,
      qualification: walk.qualification,
      drafts: walk.drafts,
      prospect_ref: walk.prospect?.reference,
      enquiry_ref: walk.prospect?.enquiry_ref,
    },
  });
  if (!walk.ok) {
    return { ok: false, scenario: 'A', ids, ledger, reason: walk.reason || 'MATURATION_FAILED', external_sends_executed };
  }

  const commercial = buildFinanciallyApprovedCommercial('lead-rescue', ids);
  const faMissing = evaluateFinancialApprovalGate({
    ...commercial,
    approved_by: '',
    approval_timestamp: '',
  });
  ledger.push({
    step: 'gate_financial_approval_missing',
    ok: faMissing.ok === false,
    detail: { blockers: faMissing.blockers },
  });

  const handoff = toOnboardingHandoff(commercial);
  ledger.push({
    step: 'commercial_handoff_financially_approved',
    ok: handoff.financially_approved === true,
    detail: {
      opportunity_ref: handoff.opportunity_ref,
      financial_approval_ref: handoff.financial_approval_ref,
      product: handoff.product,
      blockers: handoff.blockers,
      protected_actions_executed: handoff.protected_actions_executed,
    },
  });
  if (!handoff.financially_approved) {
    return { ok: false, scenario: 'A', ids, ledger, reason: 'FA_HANDOFF_FAILED', external_sends_executed };
  }

  let record = seedLrOnboarding(handoff, { intake: buildLrIntake() });
  record = {
    ...record,
    id: ids.onboarding_id,
    opportunity_ref: ids.opportunity_ref,
    financial_approval_ref: ids.financial_approval_ref,
    delivery_issue: {
      ...record.delivery_issue,
      title: `Lead Rescue delivery — Integrated Lagoon Desk (#711A ${ids.run_id})`,
      simulation_only: true,
    },
  };
  record = completeLrInputs(record);
  const gates = proveLrGates(record);
  ledger.push({
    step: 'delivery_gate_blocks',
    ok:
      gates.missing_financial_approval.can_start_build.ok === false &&
      gates.missing_required_client_inputs.can_start_build.ok === false &&
      gates.messaging_runtime_gate.unauthorized.ok === false,
    detail: gates,
  });

  const walkDelivery = walkLrDelivery(record, { includeClientReviewLoop: true });
  const messaging = canUseLrMessaging(walkDelivery.record || record);
  const evidence =
    walkDelivery.record?.evidence && typeof walkDelivery.record.evidence === 'object'
      ? walkDelivery.record.evidence
      : {};
  const handover = evidence.handover && typeof evidence.handover === 'object' ? evidence.handover : null;
  const support_boundary =
    evidence.support_boundary && typeof evidence.support_boundary === 'object'
      ? evidence.support_boundary
      : null;
  const handoverChannels = Array.isArray(handover?.channels) ? handover.channels.map((c) => String(c)) : [];
  const handoverSyntheticOnly =
    handoverChannels.length > 0 &&
    handoverChannels.every((c) => /synthetic|draft/i.test(c) && !/whatsapp|sms|live.?send/i.test(c));

  ledger.push({
    step: 'delivery_path_to_acceptance_ready',
    ok:
      walkDelivery.ok === true &&
      walkDelivery.record?.delivery_state === 'acceptance_ready' &&
      messaging.ok === false,
    detail: {
      transitions: walkDelivery.transitions,
      final_state: walkDelivery.record?.delivery_state,
      acceptance: walkDelivery.acceptance,
      messaging,
      evidence_packet_ids: Object.keys(evidence),
      messaging_runtime_authorized: walkDelivery.record?.messaging_runtime_authorized,
      allow_real_client_sends: walkDelivery.record?.allow_real_client_sends,
    },
  });
  ledger.push({
    step: 'handover_and_support_boundary_evidence',
    ok:
      walkDelivery.acceptance?.ok === true &&
      Boolean(handover?.handover_sent_at) &&
      Boolean(handover?.support_boundary_summary) &&
      Boolean(handover?.monitoring_window) &&
      handoverSyntheticOnly &&
      Boolean(support_boundary?.in_scope) &&
      Boolean(support_boundary?.out_of_scope) &&
      Boolean(support_boundary?.escalation_contact) &&
      Boolean(support_boundary?.review_cadence),
    detail: {
      handover,
      support_boundary,
      handover_channels: handoverChannels,
      handover_synthetic_only: handoverSyntheticOnly,
      acceptance: walkDelivery.acceptance,
    },
  });

  const id_mapping = {
    enquiry_ref: ids.enquiry_ref,
    prospect_ref: ids.prospect_ref,
    opportunity_ref: ids.opportunity_ref,
    financial_approval_ref: ids.financial_approval_ref,
    onboarding_id: ids.onboarding_id,
    delivery_ref: ids.delivery_ref,
  };

  const ok =
    ledger.every((row) => row.ok === true) &&
    external_sends_executed.length === 0 &&
    walkDelivery.record?.messaging_runtime_authorized === false &&
    walkDelivery.record?.allow_real_client_sends === false;

  return {
    ok,
    scenario: 'A',
    product: 'ai-lead-rescue',
    ran_at: RAN_AT,
    simulation_only: true,
    ids,
    id_mapping,
    ledger,
    external_sends_executed,
    messaging_runtime_authorized: false,
    production_client_deployment: false,
    final_prospect_stage: walk.prospect?.canonical_stage || null,
    final_delivery_state: walkDelivery.record?.delivery_state || null,
    evidence,
    handover,
    support_boundary,
    acceptance: walkDelivery.acceptance || null,
    expected:
      'market→maturation→FA→onboarding→acceptance_ready; handover evidence; no send; messaging unauthorized',
    actual: ok
      ? 'all ledger steps passed; acceptance_ready; handover evidence present; external_sends_executed=[]'
      : 'one or more ledger steps failed',
    verdict: ok ? 'PASS' : 'FAIL',
  };
}

/**
 * Scenario B — Website Rescue integrated path with fresh IDs.
 */
export function runScenarioBWebsiteRescue() {
  const ids = SCENARIO_B_IDS;
  /** @type {Array<{ step: string, from?: string, to?: string, ok: boolean, detail?: unknown }>} */
  const ledger = [];
  const external_sends_executed = [];

  const routing = resolveMarketEnquiryRouting({
    locked_offer: true,
    offer_slug: 'premium-landing-page-rescue',
  });
  ledger.push({
    step: 'market_enquiry_classification_locked_offer',
    ok: routing.ok === true && routing.service_interest === 'website_rescue',
    detail: {
      enquiry_ref: ids.enquiry_ref,
      locked_offer: true,
      offer_slug: 'premium-landing-page-rescue',
      routing,
      source: '/offers/premium-landing-page-rescue#discovery',
      consent_contact: true,
      urgency: 'this-month',
      buyer_not_asked_to_reclassify: true,
    },
  });
  if (!routing.ok) {
    return { ok: false, scenario: 'B', ids, ledger, reason: 'ROUTING_FAILED', external_sends_executed };
  }

  const seed = {
    id: ids.prospect_id,
    reference: ids.prospect_ref,
    tenant_id: 'factory',
    product: 'corpflow-rapid-delivery',
    person_name: 'Blake Integrated',
    organisation_name: 'Integrated Harbour Studio',
    business_name: 'Integrated Harbour Studio',
    email: 'blake.integrated+711b@example.com',
    phone: '+2305550712',
    source: '/offers/premium-landing-page-rescue#discovery',
    buyer_need: routing.buyer_need,
    service_interest: routing.service_interest,
    product_service_path: 'website_rescue',
    market_service_path: routing.service_path,
    offer_slug: routing.offer_slug,
    owner: null,
    native_status: 'new_intake',
    canonical_stage: 'new',
    urgency: 'this-month',
    next_action: null,
    next_action_due: null,
    last_meaningful_activity_at: RAN_AT,
    qualification_complete: false,
    estimated_value: 15000,
    currency: 'MUR',
    consent_contact: true,
    closure_reason: null,
    waiting_on: 'operator',
    created_at: RAN_AT,
    updated_at: RAN_AT,
    activity_count: 0,
    enquiry_ref: ids.enquiry_ref,
  };

  const draftAck = getDraftAsset('acknowledgement');
  ledger.push({
    step: 'acknowledgement_draft_only',
    ok: draftAck?.send === false,
    detail: { asset_id: 'acknowledgement', send: draftAck?.send },
  });

  const walk = walkWebsiteRescueMaturationPath(seed);
  ledger.push({
    step: 'prospect_maturation_walk',
    ok: walk.ok === true && walk.prospect?.canonical_stage === 'proposal_ready',
    detail: {
      transitions: walk.transitions,
      final_stage: walk.prospect?.canonical_stage,
      qualification: walk.qualification,
      prospect_ref: walk.prospect?.reference,
    },
  });
  if (!walk.ok) {
    return { ok: false, scenario: 'B', ids, ledger, reason: walk.reason || 'MATURATION_FAILED', external_sends_executed };
  }

  const commercial = buildFinanciallyApprovedCommercial('website-rescue', ids);
  const faMissing = evaluateFinancialApprovalGate({
    ...commercial,
    approved_by: '',
    approval_timestamp: '',
  });
  ledger.push({
    step: 'gate_financial_approval_missing',
    ok: faMissing.ok === false,
    detail: { blockers: faMissing.blockers },
  });

  const handoff = toOnboardingHandoff(commercial);
  ledger.push({
    step: 'commercial_handoff_financially_approved',
    ok: handoff.financially_approved === true,
    detail: {
      opportunity_ref: handoff.opportunity_ref,
      financial_approval_ref: handoff.financial_approval_ref,
      product: handoff.product,
      blockers: handoff.blockers,
    },
  });
  if (!handoff.financially_approved) {
    return { ok: false, scenario: 'B', ids, ledger, reason: 'FA_HANDOFF_FAILED', external_sends_executed };
  }

  let record = seedWrOnboarding(handoff, { intake: buildWrIntake(), dns_cutover_in_scope: true });
  record = {
    ...record,
    id: ids.onboarding_id,
    opportunity_ref: ids.opportunity_ref,
    financial_approval_ref: ids.financial_approval_ref,
    real_dns_cutover_executed: false,
    real_client_production_deploy: false,
    delivery_issue: {
      ...record.delivery_issue,
      title: `Website Rescue delivery — Integrated Harbour Studio (#711B ${ids.run_id})`,
      simulation_only: true,
    },
  };

  const incomplete = { ...record, content_assets_ready: false, approved_access_confirmed: false };
  const gatesBefore = proveWrGates(incomplete);
  ledger.push({
    step: 'gate_content_assets_access_blocks',
    ok:
      gatesBefore.missing_financial_approval.can_start_build.ok === false &&
      gatesBefore.missing_content_or_assets.can_start_build.ok === false &&
      gatesBefore.missing_content_or_assets.can_start_build.reason ===
        'MISSING_CONTENT_OR_ASSETS' &&
      gatesBefore.missing_approved_access.can_start_build.ok === false &&
      gatesBefore.missing_approved_access.can_start_build.reason === 'MISSING_APPROVED_ACCESS',
    detail: gatesBefore,
  });

  record = completeWrInputs(record);
  const gatesReady = proveWrGates(record);
  const walkDelivery = walkWrDelivery(record, { includeRevisionCycle: true });

  ledger.push({
    step: 'delivery_path_to_acceptance_ready',
    ok:
      walkDelivery.ok === true &&
      walkDelivery.record?.delivery_state === 'acceptance_ready' &&
      walkDelivery.record?.real_dns_cutover_executed === false &&
      walkDelivery.record?.real_client_production_deploy === false &&
      walkDelivery.record?.deploy_approval_simulated === true,
    detail: {
      transitions: walkDelivery.transitions,
      final_state: walkDelivery.record?.delivery_state,
      acceptance: walkDelivery.acceptance,
      deploy_approval_simulated: walkDelivery.record?.deploy_approval_simulated,
      dns_cutover_authorized_simulated: walkDelivery.record?.dns_cutover_authorized_simulated,
      real_dns_cutover_executed: walkDelivery.record?.real_dns_cutover_executed,
      real_client_production_deploy: walkDelivery.record?.real_client_production_deploy,
      evidence_packet_ids: Object.keys(walkDelivery.record?.evidence || {}),
      gate_blocks_when_ready_sample: {
        missing_fa_still_blocks_on_clone:
          gatesReady.missing_financial_approval.can_start_build.ok === false,
      },
    },
  });

  const id_mapping = {
    enquiry_ref: ids.enquiry_ref,
    prospect_ref: ids.prospect_ref,
    opportunity_ref: ids.opportunity_ref,
    financial_approval_ref: ids.financial_approval_ref,
    onboarding_id: ids.onboarding_id,
    delivery_ref: ids.delivery_ref,
  };

  const ok =
    ledger.every((row) => row.ok === true) &&
    external_sends_executed.length === 0 &&
    walkDelivery.record?.real_dns_cutover_executed === false &&
    walkDelivery.record?.real_client_production_deploy === false;

  return {
    ok,
    scenario: 'B',
    product: 'website-rescue',
    ran_at: RAN_AT,
    simulation_only: true,
    ids,
    id_mapping,
    ledger,
    external_sends_executed,
    real_dns_cutover_executed: false,
    real_client_production_deploy: false,
    final_prospect_stage: walk.prospect?.canonical_stage || null,
    final_delivery_state: walkDelivery.record?.delivery_state || null,
    expected:
      'locked-offer market→maturation→FA→onboarding→acceptance_ready; DNS/deploy simulated only; no send',
    actual: ok
      ? 'all ledger steps passed; acceptance_ready; no real DNS/deploy; external_sends_executed=[]'
      : 'one or more ledger steps failed',
    verdict: ok ? 'PASS' : 'FAIL',
  };
}

/**
 * Run market regression + Scenario A + Scenario B and optionally write artifacts.
 * @param {{ repoRoot?: string, writeArtifact?: boolean, finalMainSha?: string }} [options]
 */
export function runIntegratedScenarios711(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const market = runMarketPathRegression();
  const maturationGates = proveMaturationGateBlocks(repoRoot);
  const scenarioA = runScenarioALeadRescue();
  const scenarioB = runScenarioBWebsiteRescue();
  const noSend = assertDraftAssetConfigNoSend();

  const report = {
    schema: 'corpflow.gtm_integrated_scenarios_711.v1',
    issue: 711,
    run_id: INTEGRATED_RUN_ID,
    ran_at: RAN_AT,
    final_main_sha: options.finalMainSha || null,
    simulation_only: true,
    market_path_regression: market,
    maturation_gate_blocks: {
      missing_owner_invalid: maturationGates.missing_owner.validation.valid === false,
      missing_next_invalid: maturationGates.missing_next_action_or_due.validation.valid === false,
      invalid_jump_blocked: maturationGates.invalid_jump_new_to_proposal_sent.allowed === false,
      closure_reason_blocked: maturationGates.closure_reason_required_for_lost.allowed === false,
      overdue: maturationGates.overdue.overdue === true,
      reactivation_due: maturationGates.reactivation_due.due === true,
    },
    no_send_config: noSend,
    scenario_a: scenarioA,
    scenario_b: scenarioB,
    external_sends_executed: [],
    messaging_runtime_authorized: false,
    real_dns_cutover_executed: false,
    real_client_production_deploy: false,
    defects: [],
  };

  const ok =
    market.ok === true &&
    report.maturation_gate_blocks.missing_owner_invalid === true &&
    report.maturation_gate_blocks.invalid_jump_blocked === true &&
    noSend.safe === true &&
    scenarioA.ok === true &&
    scenarioB.ok === true;

  report.ok = ok;
  if (!ok) {
    if (!market.ok) report.defects.push({ component: 'market-path', reason: 'MARKET_REGRESSION_FAILED' });
    if (!scenarioA.ok) report.defects.push({ component: 'scenario-A', reason: scenarioA.reason || 'SCENARIO_A_FAILED' });
    if (!scenarioB.ok) report.defects.push({ component: 'scenario-B', reason: scenarioB.reason || 'SCENARIO_B_FAILED' });
  }

  report.final_verdict = ok
    ? 'READY FOR CONTROLLED CLIENT PILOT'
    : report.defects.length
      ? 'NOT READY — BLOCKER FOUND'
      : 'PARTIAL — NON-BLOCKING GAPS REMAIN';

  if (options.writeArtifact !== false) {
    const dir = path.join(repoRoot, INTEGRATED_ARTIFACT_DIR_REL);
    mkdirSync(dir, { recursive: true });
    const latest = path.join(dir, 'latest-run.json');
    writeFileSync(latest, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    writeFileSync(
      path.join(dir, 'scenario-a-ledger.json'),
      `${JSON.stringify(scenarioA, null, 2)}\n`,
      'utf8',
    );
    writeFileSync(
      path.join(dir, 'scenario-b-ledger.json'),
      `${JSON.stringify(scenarioB, null, 2)}\n`,
      'utf8',
    );
    report.artifact_paths = {
      latest: `${INTEGRATED_ARTIFACT_DIR_REL}/latest-run.json`,
      scenario_a: `${INTEGRATED_ARTIFACT_DIR_REL}/scenario-a-ledger.json`,
      scenario_b: `${INTEGRATED_ARTIFACT_DIR_REL}/scenario-b-ledger.json`,
    };
  }

  return report;
}
