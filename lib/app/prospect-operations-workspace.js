/**
 * #772 / #721 — Operating Workspace Prospect Operations list.
 *
 * Projects existing `leads` rows through the shared view-model.
 * No schema. No external send. Staff / Core environment only.
 */

import { AI_LEAD_RESCUE_PRODUCT } from '../cmp/_lib/ai-lead-rescue-operator.js';
import { RAPID_DELIVERY_PRODUCT } from '../cmp/_lib/rapid-delivery-operator.js';
import {
  ACTION_QUEUE_FILTERS,
  detectProspectProduct,
  leadRowToProspectDetailViewModel,
  leadRowToProspectViewModel,
  matchesActionQueueFilter,
  matchesMyWorkTodayFilter,
  matchesWorkbenchFilter,
  matchesWorkbenchQuery,
  normalizeActionQueueFilter,
  sortProspectsForActionQueue,
  sortProspectsForWorkbench,
  WORKBENCH_FILTERS,
} from '../cmp/_lib/prospect-operations-view-model.js';
import {
  ACTION_QUEUE_PATH,
  canAccessOperatingWorkspace,
  PROSPECT_OPERATIONS_PATH,
  PROSPECT_PIPELINE_PATH,
  PROSPECT_WORKBENCH_PATH,
  TODAY_MY_WORK_PATH,
} from './workspace-context.js';
import { projectCommercialClearanceFromQualification } from '../revenue/commercial-approval-record.js';
import { projectWebsiteRescueDeliveryFromQualification } from '../website-rescue/onboarding-delivery-record.js';
import { extractExistingDeliveryPointer } from '../erpnext/delivery-continuity.js';
import {
  OTHER_TENANT_ID,
  WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID,
  WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
} from './constants.js';

export const DATA_SOURCE_FIXTURE = 'fixture';
export const DATA_SOURCE_LEADS_READ = 'leads_read';

/**
 * @param {{
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   postgresUrl?: string,
 * }} [opts]
 * @returns {'fixture'|'leads_read'}
 */
export function resolveProspectOperationsDataSource(opts = {}) {
  if (opts.forceFixture === true) return DATA_SOURCE_FIXTURE;
  const nodeEnv = String(opts.nodeEnv ?? process.env.NODE_ENV ?? '').trim();
  if (nodeEnv === 'test') return DATA_SOURCE_FIXTURE;
  if (opts.proofMode === true) return DATA_SOURCE_FIXTURE;
  const url = String(opts.postgresUrl ?? '').trim();
  if (!url) return DATA_SOURCE_FIXTURE;
  return DATA_SOURCE_LEADS_READ;
}

export const PROSPECT_LIST_TAKE = 200;

/** @type {Map<string, Record<string, unknown>> | null} */
let prospectFixtureStore = null;

/**
 * Clone a synthetic Lead row so fixture patches do not mutate the factory template.
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
export function cloneProspectLeadRow(row) {
  const qj = row?.qualificationJson;
  return {
    ...row,
    createdAt:
      row.createdAt instanceof Date ? new Date(row.createdAt.getTime()) : row.createdAt,
    updatedAt:
      row.updatedAt instanceof Date ? new Date(row.updatedAt.getTime()) : row.updatedAt,
    qualificationJson:
      qj && typeof qj === 'object' ? JSON.parse(JSON.stringify(qj)) : qj ?? null,
  };
}

export function resetProspectFixtureStore() {
  prospectFixtureStore = null;
}

/**
 * @returns {Map<string, Record<string, unknown>>}
 */
function ensureProspectFixtureStore() {
  if (!prospectFixtureStore) {
    prospectFixtureStore = new Map();
    for (const row of fixtureProspectLeadRows()) {
      prospectFixtureStore.set(String(row.id), cloneProspectLeadRow(row));
    }
  }
  return prospectFixtureStore;
}

/**
 * Mutable fixture rows for proof / test / no-DB. Patches persist in-process.
 * @returns {Array<Record<string, unknown>>}
 */
export function getProspectFixtureRows() {
  return [...ensureProspectFixtureStore().values()];
}

/**
 * @param {string} id
 * @returns {Record<string, unknown> | null}
 */
export function getProspectFixtureById(id) {
  const key = String(id || '').trim();
  if (!key) return null;
  return ensureProspectFixtureStore().get(key) || null;
}

/**
 * @param {Record<string, unknown>} row
 */
export function upsertProspectFixtureRow(row) {
  const id = String(row?.id || '').trim();
  if (!id) return;
  ensureProspectFixtureStore().set(id, cloneProspectLeadRow(row));
}

const PUBLIC_PROSPECT_KEYS = Object.freeze([
  'id',
  'reference',
  'tenant_id',
  'product',
  'person_name',
  'organisation_name',
  'email',
  'phone',
  'website',
  'source',
  'product_service_path',
  'offer_slug',
  'offer_title',
  'problem_summary',
  'enquiry_channels',
  'notes',
  'recommended_next_action',
  'response_draft',
  'consent_contact',
  'owner',
  'native_status',
  'native_status_label',
  'canonical_stage',
  'priority',
  'urgency',
  'next_action',
  'next_action_due',
  'last_meaningful_activity_at',
  'qualification_complete',
  'estimated_value',
  'currency',
  'waiting_on',
  'created_at',
  'updated_at',
  'detail_path',
  'activity_count',
  'exception_signals',
  'source_surfaces',
  'shared_detail_path',
  'erpnext_delivery',
]);

const PUBLIC_PROSPECT_DETAIL_KEYS = Object.freeze([
  ...PUBLIC_PROSPECT_KEYS,
  'email',
  'phone',
  'qualification_summary',
  'notes',
  'current_blocker',
  'recommended_next_action',
  'history',
  'allowed_native_statuses',
  'allowed_canonical_stages',
  'safe_interventions',
  'protected_actions',
  'product_detail_path',
  'external_send',
  'commercial_clearance',
  'website_rescue_delivery',
]);

/**
 * Synthetic rows for proof / test / no-DB. Same shape as Prisma `Lead`.
 * @param {Date} [now]
 * @returns {Array<Record<string, unknown>>}
 */
export function fixtureProspectLeadRows(now = new Date()) {
  const dueToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15, 0, 0),
  ).toISOString();
  return [
    {
      id: 'syn-772-lr-ada',
      tenantId: 'corpflowai',
      name: 'Ada Prospect',
      email: 'ada@example.com',
      phone: '+2305000000',
      status: 'QUALIFYING',
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
      updatedAt: new Date('2026-08-02T10:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: AI_LEAD_RESCUE_PRODUCT,
          business_name: 'Ada Spa',
          region_path: 'mauritius',
          lead_sources: 'whatsapp',
          page: '/lead-rescue',
          host: 'corpflowai.com',
        },
        ai_lead_rescue_operator: {
          status: 'QUALIFYING',
          owner: 'anton',
          next_action: 'Book discovery',
          notes: 'Warm intro',
          activity: [
            {
              at: '2026-08-02T09:00:00.000Z',
              actor_label: 'anton',
              channel: 'whatsapp',
              type: 'outbound_opener',
              note: 'Opened',
              next_action: 'Book discovery',
              next_action_date: '2026-08-01T00:00:00.000Z',
              status_after: 'QUALIFYING',
            },
          ],
        },
        erpnext: {
          schema: 'corpflow.erpnext.customer_bridge.pointer.v1',
          customer: 'CF880 Synthetic Lead Rescue Ltd',
          customer_name: 'CF880 Synthetic Lead Rescue Ltd',
        },
        commercial_approval: {
          product: 'lead-rescue',
          opportunity_ref: 'syn-772-lr-ada',
          prospect_ref: 'syn-772-lr-ada',
          proposal_status: 'operator_reviewed',
          proposal_version: 'SAL-QTN-2026-00001',
          quoted_currency: 'USD',
          setup_price: 150,
          recurring_price: 99,
          offer_kind: 'pilot',
          payment_terms: 'pilot_full_upfront',
          scope_summary:
            'USD 150 launch pilot — one enquiry source, 48-hour setup, 7-day monitoring. Synthetic proof only.',
          erpnext_quotation: 'SAL-QTN-2026-00001',
          erpnext_sales_invoice: 'ACC-SINV-2026-00002',
          acceptance_status: 'accepted',
          accepted_by: 'Ada Prospect (synthetic)',
          acceptance_timestamp: '2026-08-20T10:00:00.000Z',
          payment_evidence_status: 'pending',
          payment_evidence_ref: '',
          financial_review_status: 'not_started',
          financially_approved: false,
          approved_by: '',
          approval_timestamp: '',
          won_lost_status: 'open',
          commercial_notes: 'Quote + acceptance recorded. Payment evidence still required.',
          proposal: {
            status: 'operator_reviewed',
            version: 'SAL-QTN-2026-00001',
            currency: 'USD',
            setup_price: 150,
            recurring_price: 99,
            payment_terms: 'pilot_full_upfront',
            scope_summary:
              'USD 150 launch pilot — one enquiry source, 48-hour setup, 7-day monitoring. Synthetic proof only.',
            offer_kind: 'pilot',
          },
          acceptance: {
            status: 'accepted',
            accepted_by: 'Ada Prospect (synthetic)',
            acceptance_timestamp: '2026-08-20T10:00:00.000Z',
            acceptance_method: 'email_confirmation',
            proposal_version: 'SAL-QTN-2026-00001',
          },
          payment_evidence: null,
          payment_exception: null,
        },
      },
    },
    {
      id: 'syn-772-rd-bea',
      tenantId: 'corpflowai',
      name: 'Bea Buyer',
      email: 'bea@example.com',
      phone: '+2305111111',
      status: 'NEW',
      createdAt: new Date('2026-08-03T08:00:00.000Z'),
      updatedAt: new Date('2026-08-03T08:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          business_name: 'Bea Boutique',
          offer_slug: 'premium-landing-page-rescue',
          service_path: 'website-digital',
          primary_pain: 'Weak enquiry path on the existing site',
          website: 'https://example.com',
          urgency: 'asap',
          consent_contact: true,
          host: 'corpflowai.com',
          page: '/offers/premium-landing-page-rescue',
          source: 'corpflow-market-gateway',
        },
        rapid_delivery_operator: {
          status: 'new_intake',
          notes: 'Review Website Rescue fit today',
          activity: [],
          updated_at: '2026-08-03T08:00:00.000Z',
        },
      },
    },
    {
      id: 'syn-716-wr-cleared',
      tenantId: 'corpflowai',
      name: 'Wren Cleared',
      email: 'wren@example.com',
      phone: '+2305161616',
      status: 'NEW',
      createdAt: new Date('2026-08-20T08:00:00.000Z'),
      updatedAt: new Date('2026-08-24T08:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          business_name: 'Wren Workshop',
          offer_slug: 'premium-landing-page-rescue',
          service_path: 'website-digital',
          primary_pain: 'Current site does not convert enquiries',
          website: 'https://wren-workshop.example',
          urgency: 'this_week',
          consent_contact: true,
          host: 'corpflowai.com',
          page: '/website-rescue',
          source: 'corpflow-market-gateway',
        },
        rapid_delivery_operator: {
          status: 'quote_ready',
          owner: 'anton',
          next_action: 'Collect Website Rescue intake',
          notes: 'Commercially cleared. Start onboarding.',
          activity: [],
          updated_at: '2026-08-24T08:00:00.000Z',
        },
        erpnext: {
          schema: 'corpflow.erpnext.customer_bridge.pointer.v1',
          customer: 'CF880 Synthetic Website Rescue Ltd',
          customer_name: 'CF880 Synthetic Website Rescue Ltd',
        },
        commercial_approval: {
          product: 'website-rescue',
          opportunity_ref: 'syn-716-wr-cleared',
          prospect_ref: 'syn-716-wr-cleared',
          proposal_status: 'operator_reviewed',
          proposal_version: 'SAL-QTN-2026-00004',
          quoted_currency: 'MUR',
          setup_price: 45000,
          offer_kind: 't1_one_page',
          payment_terms: 'full_upfront',
          scope_summary:
            'Website Rescue T1 one-page rescue for Wren Workshop. Synthetic proof only — no live DNS.',
          erpnext_quotation: 'SAL-QTN-2026-00004',
          erpnext_sales_invoice: 'ACC-SINV-2026-00004',
          acceptance_status: 'accepted',
          accepted_by: 'Wren Cleared (synthetic)',
          acceptance_timestamp: '2026-08-22T10:00:00.000Z',
          payment_evidence_status: 'verified',
          payment_evidence_ref: 'PAY-EV-SYN-716-WREN',
          financial_review_status: 'approved',
          financially_approved: true,
          approved_by: 'Anton (operator financial approver)',
          approval_timestamp: '2026-08-22T11:00:00.000Z',
          won_lost_status: 'won',
          won_lost_reason: 'accepted_pilot',
          commercial_notes: 'Cleared to build. Onboarding is the next executable step.',
          proposal: {
            status: 'operator_reviewed',
            version: 'SAL-QTN-2026-00004',
            currency: 'MUR',
            setup_price: 45000,
            payment_terms: 'full_upfront',
            scope_summary:
              'Website Rescue T1 one-page rescue for Wren Workshop. Synthetic proof only — no live DNS.',
            offer_kind: 't1_one_page',
          },
          acceptance: {
            status: 'accepted',
            accepted_by: 'Wren Cleared (synthetic)',
            acceptance_timestamp: '2026-08-22T10:00:00.000Z',
            acceptance_method: 'email_confirmation',
            proposal_version: 'SAL-QTN-2026-00004',
          },
          payment_evidence: {
            status: 'verified',
            evidence_type: 'bank_transfer_reference',
            evidence_ref: 'PAY-EV-SYN-716-WREN',
            amount_evidenced: 45000,
            expected_amount: 45000,
            currency: 'MUR',
            invoice_ref: 'ACC-SINV-2026-00004',
          },
          payment_exception: null,
        },
      },
    },
    {
      id: WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
      tenantId: 'corpflowai',
      name: 'Pia Preview',
      email: 'pia@example.com',
      phone: '+2305181818',
      status: 'NEW',
      createdAt: new Date('2026-08-21T08:00:00.000Z'),
      updatedAt: new Date('2026-08-26T10:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          business_name: 'Pia Studio',
          offer_slug: 'premium-landing-page-rescue',
          service_path: 'website-digital',
          primary_pain: 'Current site does not convert enquiries',
          website: 'https://pia-studio.example',
          urgency: 'this_week',
          consent_contact: true,
          host: 'corpflowai.com',
          page: '/website-rescue',
          source: 'corpflow-market-gateway',
        },
        rapid_delivery_operator: {
          status: 'won',
          owner: 'anton',
          next_action: 'Client review of preview',
          notes: 'Staff-only: keep preview CTA buyer-intent. Do not expose this note.',
          activity: [],
          updated_at: '2026-08-26T10:00:00.000Z',
        },
        commercial_approval: {
          product: 'website-rescue',
          opportunity_ref: WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
          prospect_ref: WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
          proposal_status: 'operator_reviewed',
          proposal_version: 'SAL-QTN-2026-00005',
          quoted_currency: 'MUR',
          setup_price: 45000,
          offer_kind: 't1_one_page',
          payment_terms: 'full_upfront',
          scope_summary: 'Website Rescue T1 one-page rescue for Pia Studio. Synthetic tenant-progress proof only.',
          erpnext_quotation: 'SAL-QTN-2026-00005',
          erpnext_sales_invoice: 'ACC-SINV-2026-00005',
          acceptance_status: 'accepted',
          accepted_by: 'Pia Preview (synthetic)',
          acceptance_timestamp: '2026-08-22T10:00:00.000Z',
          payment_evidence_status: 'verified',
          payment_evidence_ref: 'PAY-EV-SYN-1151-PIA',
          financial_review_status: 'approved',
          financially_approved: true,
          approved_by: 'Anton (operator financial approver)',
          approval_timestamp: '2026-08-22T11:00:00.000Z',
          won_lost_status: 'won',
          won_lost_reason: 'accepted_pilot',
          commercial_notes: 'Staff-only commercial note. Must never reach Tenant Workspace.',
          proposal: {
            status: 'operator_reviewed',
            version: 'SAL-QTN-2026-00005',
            currency: 'MUR',
            setup_price: 45000,
            payment_terms: 'full_upfront',
            scope_summary: 'Website Rescue T1 one-page rescue for Pia Studio. Synthetic tenant-progress proof only.',
            offer_kind: 't1_one_page',
          },
          acceptance: {
            status: 'accepted',
            accepted_by: 'Pia Preview (synthetic)',
            acceptance_timestamp: '2026-08-22T10:00:00.000Z',
            acceptance_method: 'email_confirmation',
            proposal_version: 'SAL-QTN-2026-00005',
          },
          payment_evidence: {
            status: 'verified',
            evidence_type: 'bank_transfer_reference',
            evidence_ref: 'PAY-EV-SYN-1151-PIA',
            amount_evidenced: 45000,
            expected_amount: 45000,
            currency: 'MUR',
            invoice_ref: 'ACC-SINV-2026-00005',
          },
          payment_exception: null,
        },
        website_rescue_delivery: {
          schema: 'corpflow.website_rescue_delivery.v1',
          issue: 716,
          product: 'website-rescue',
          delivery_state: 'preview_evidence',
          content_assets_ready: true,
          approved_access_confirmed: true,
          dns_cutover_in_scope: false,
          deploy_approval_simulated: false,
          dns_cutover_authorized_simulated: false,
          real_dns_cutover_executed: false,
          real_client_production_deploy: false,
          blocked_inputs: [],
          intake: {
            business_display_name: 'Pia Studio',
            primary_contact_name: 'Pia Preview',
            working_email: 'pia@example.com',
            working_phone: '+2305181818',
            case_type: 'one_page',
            tier: 'T1',
            current_site_url: 'https://pia-studio.example',
            domain_hostname: 'pia-studio.example',
            hosting_facts_summary: 'Shared host; operator manages preview. No passwords stored.',
            brand_assets_status: 'wordmark_ok',
            pages_in_scope: ['home'],
            services_or_products_summary: 'Studio booking enquiry only.',
            content_ownership: 'Owner owns offer wording; operator owns layout and CTA.',
            enquiry_destination: 'pia@example.com',
            design_preferences: 'Guided direction A — clear enquiry path.',
            revision_authority: 'Pia Preview',
            named_approver: 'Pia Preview',
            client_responsibilities: ['Supply remaining copy within two business days'],
            exclusions: ['SEO campaigns', 'Paid ads'],
            acceptance_measures: ['Preview reviewed on mobile and desktop'],
            review_cadence: 'Preview feedback within 2 business days.',
            maintenance_boundary: 'Handover then optional maintenance.',
          },
          shared_checklist: {
            'shared.business_identity': true,
            'shared.primary_contact': true,
            'shared.financial_approval': true,
            'shared.named_approver': true,
            'shared.client_responsibilities_ack': true,
            'shared.exclusions_ack': true,
            'shared.acceptance_measures': true,
            'shared.review_cadence': true,
          },
          evidence: {
            preview: {
              preview_url_or_artefact: 'https://preview.example/pia-studio-rescue',
              captured_at: '2026-08-26T10:00:00.000Z',
              exposed_for_client_review: true,
              operator_note: 'Staff-only preview note. Do not show in Tenant Workspace.',
            },
            deploy_approval: {
              simulation_only: true,
              operator_note: 'Protected deploy remains closed.',
            },
          },
          updated_at: '2026-08-26T10:00:00.000Z',
          updated_by: 'anton',
          protected_actions_executed: false,
          prospect_ref: WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
        },
      },
    },
    {
      id: WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID,
      tenantId: OTHER_TENANT_ID,
      name: 'Other Tenant Rescue',
      email: 'foil-wr@example.com',
      phone: '+2305191919',
      status: 'NEW',
      createdAt: new Date('2026-08-21T09:00:00.000Z'),
      updatedAt: new Date('2026-08-26T11:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          business_name: 'Foil Workshop',
          offer_slug: 'premium-landing-page-rescue',
          service_path: 'website-digital',
          page: '/website-rescue',
          host: 'corpflowai.com',
          source: 'corpflow-market-gateway',
          consent_contact: true,
        },
        commercial_approval: {
          product: 'website-rescue',
          opportunity_ref: WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID,
          prospect_ref: WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID,
          proposal_status: 'operator_reviewed',
          proposal_version: 'SAL-QTN-2026-00006',
          quoted_currency: 'MUR',
          setup_price: 45000,
          offer_kind: 't1_one_page',
          payment_terms: 'full_upfront',
          scope_summary: 'Isolation foil Website Rescue. Other tenant only.',
          erpnext_quotation: 'SAL-QTN-2026-00006',
          erpnext_sales_invoice: 'ACC-SINV-2026-00006',
          acceptance_status: 'accepted',
          accepted_by: 'Other Tenant Rescue (synthetic)',
          acceptance_timestamp: '2026-08-22T10:00:00.000Z',
          payment_evidence_status: 'verified',
          payment_evidence_ref: 'PAY-EV-SYN-1151-FOIL',
          financial_review_status: 'approved',
          financially_approved: true,
          approved_by: 'Anton (operator financial approver)',
          approval_timestamp: '2026-08-22T11:00:00.000Z',
          won_lost_status: 'won',
          won_lost_reason: 'accepted_pilot',
          commercial_notes: 'Isolation foil — other tenant only.',
          proposal: {
            status: 'operator_reviewed',
            version: 'SAL-QTN-2026-00006',
            currency: 'MUR',
            setup_price: 45000,
            payment_terms: 'full_upfront',
            scope_summary: 'Isolation foil Website Rescue. Other tenant only.',
            offer_kind: 't1_one_page',
          },
          acceptance: {
            status: 'accepted',
            accepted_by: 'Other Tenant Rescue (synthetic)',
            acceptance_timestamp: '2026-08-22T10:00:00.000Z',
            acceptance_method: 'email_confirmation',
            proposal_version: 'SAL-QTN-2026-00006',
          },
          payment_evidence: {
            status: 'verified',
            evidence_type: 'bank_transfer_reference',
            evidence_ref: 'PAY-EV-SYN-1151-FOIL',
            amount_evidenced: 45000,
            expected_amount: 45000,
            currency: 'MUR',
            invoice_ref: 'ACC-SINV-2026-00006',
          },
          payment_exception: null,
        },
        website_rescue_delivery: {
          schema: 'corpflow.website_rescue_delivery.v1',
          issue: 716,
          product: 'website-rescue',
          delivery_state: 'preview_evidence',
          content_assets_ready: true,
          approved_access_confirmed: true,
          intake: {
            business_display_name: 'Foil Workshop',
            primary_contact_name: 'Other Tenant Rescue',
            working_email: 'foil-wr@example.com',
            working_phone: '+2305191919',
            case_type: 'one_page',
            tier: 'T1',
            current_site_url: 'https://foil-workshop.example',
            domain_hostname: 'foil-workshop.example',
            hosting_facts_summary: 'Isolation foil hosting facts.',
            brand_assets_status: 'wordmark_ok',
            pages_in_scope: ['home'],
            services_or_products_summary: 'Foil catalogue.',
            content_ownership: 'Owner',
            enquiry_destination: 'foil-wr@example.com',
            design_preferences: 'Guided direction A',
            revision_authority: 'Other Tenant Rescue',
            named_approver: 'Other Tenant Rescue',
            client_responsibilities: ['Supply copy'],
            exclusions: ['SEO campaigns'],
            acceptance_measures: ['Preview reviewed'],
            review_cadence: 'Two business days',
            maintenance_boundary: 'Handover only',
          },
          evidence: {
            preview: {
              preview_url_or_artefact: 'https://preview.example/foil-workshop-rescue',
              captured_at: '2026-08-26T11:00:00.000Z',
              exposed_for_client_review: true,
              operator_note: 'Must never leak to corpflowai tenant.',
            },
          },
        },
      },
    },
    {
      id: 'syn-772-lr-cal',
      tenantId: 'corpflowai',
      name: 'Cal Scheduled',
      email: 'cal@example.com',
      phone: '+2305222222',
      status: 'QUALIFYING',
      createdAt: new Date('2026-08-03T09:00:00.000Z'),
      updatedAt: now,
      qualificationJson: {
        intake_meta: {
          product: AI_LEAD_RESCUE_PRODUCT,
          business_name: 'Cal Clinic',
          region_path: 'mauritius',
          lead_sources: 'website',
          page: '/lead-rescue',
          host: 'corpflowai.com',
        },
        ai_lead_rescue_operator: {
          status: 'QUALIFYING',
          owner: 'anton',
          next_action: 'Review Thursday',
          next_action_due: '2027-01-15T00:00:00.000Z',
          waiting_on: 'prospect',
          notes: 'Scheduled follow-up — not today',
          activity: [
            {
              at: now.toISOString(),
              actor_label: 'anton',
              channel: 'whatsapp',
              type: 'outbound_opener',
              note: 'Booked follow-up',
              next_action: 'Review Thursday',
              next_action_date: '2027-01-15T00:00:00.000Z',
              status_after: 'QUALIFYING',
            },
          ],
        },
      },
    },
    {
      id: 'syn-996-gen-dee',
      tenantId: 'corpflowai',
      name: 'Dee General',
      email: null,
      phone: '+2305333333',
      status: 'NEW',
      createdAt: new Date('2026-08-04T08:00:00.000Z'),
      updatedAt: new Date('2026-08-04T08:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          business_name: 'Dee Advisory',
          source: 'corpflow-market-gateway',
          page: '/contact',
          host: 'corpflowai.com',
          primary_pain: 'Need a managed operating workspace',
          urgency: 'this_month',
          consent_contact: true,
        },
      },
    },
    {
      id: 'syn-995-lr-due',
      tenantId: 'corpflowai',
      name: 'Due Dana',
      email: 'dana@example.com',
      phone: '+2305444444',
      status: 'QUALIFYING',
      createdAt: new Date('2026-08-04T08:00:00.000Z'),
      updatedAt: new Date('2026-08-04T08:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: AI_LEAD_RESCUE_PRODUCT,
          business_name: 'Dana Day Spa',
          region_path: 'mauritius',
          page: '/lead-rescue',
          host: 'corpflowai.com',
        },
        ai_lead_rescue_operator: {
          status: 'QUALIFYING',
          owner: 'anton',
          next_action: 'Call Dana today',
          next_action_due: dueToday,
          notes: 'Due today',
          activity: [
            {
              at: '2026-08-04T08:00:00.000Z',
              actor_label: 'anton',
              channel: 'internal',
              type: 'note',
              note: 'Queued for today',
              next_action: 'Call Dana today',
              next_action_date: dueToday,
              status_after: 'QUALIFYING',
            },
          ],
        },
      },
    },
    {
      id: 'syn-995-lr-op',
      tenantId: 'corpflowai',
      name: 'Op Owen',
      email: 'owen@example.com',
      phone: '+2305555555',
      status: 'QUALIFYING',
      createdAt: new Date('2026-08-04T09:00:00.000Z'),
      updatedAt: new Date('2026-08-04T09:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: AI_LEAD_RESCUE_PRODUCT,
          business_name: 'Owen Office',
          region_path: 'mauritius',
          page: '/lead-rescue',
          host: 'corpflowai.com',
        },
        ai_lead_rescue_operator: {
          status: 'QUALIFYING',
          owner: 'anton',
          next_action: 'Draft discovery notes',
          next_action_due: '2027-02-01T00:00:00.000Z',
          waiting_on: 'operator',
          notes: 'Waiting on CorpFlowAI',
          activity: [],
        },
      },
    },
    {
      id: 'syn-995-lr-prot',
      tenantId: 'corpflowai',
      name: 'Pat Protected',
      email: 'pat@example.com',
      phone: '+2305666666',
      status: 'QUOTE_SENT',
      createdAt: new Date('2026-08-04T10:00:00.000Z'),
      updatedAt: new Date('2026-08-04T10:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: AI_LEAD_RESCUE_PRODUCT,
          business_name: 'Pat Partners',
          region_path: 'mauritius',
          page: '/lead-rescue',
          host: 'corpflowai.com',
        },
        ai_lead_rescue_operator: {
          status: 'QUOTE_SENT',
          owner: 'anton',
          next_action: 'Hold for Anton commercial approval',
          next_action_due: '2027-02-02T00:00:00.000Z',
          waiting_on: 'protected',
          notes: 'Awaiting protected approval',
          activity: [],
        },
      },
    },
    {
      id: 'syn-995-gen-gil',
      tenantId: 'corpflowai',
      name: 'Gil Gateway',
      email: 'gil@example.com',
      phone: '+2305777777',
      status: 'NEW',
      createdAt: new Date('2026-08-04T11:00:00.000Z'),
      updatedAt: new Date('2026-08-04T11:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          business_name: 'Gil Gateway',
          source: 'corpflow-market-gateway',
          page: '/contact',
          host: 'corpflowai.com',
          urgency: 'this_week',
          consent_contact: true,
        },
      },
    },
    {
      id: 'syn-1171-lr-enquiry',
      tenantId: 'corpflowai',
      name: 'Luca Qualified',
      email: 'luca.qualified+1171@example.com',
      phone: '+2305117111',
      status: 'NEW_INTAKE',
      createdAt: new Date('2026-08-26T09:00:00.000Z'),
      updatedAt: new Date('2026-08-26T09:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          offer_slug: 'ai-lead-rescue',
          service_path: 'client-lead-service',
          service_interest: 'lead_rescue',
          buyer_need: null,
          locked_product: true,
          lead_rescue_context: true,
          business_name: 'Luca Lagoon Desk',
          website: 'https://luca-lagoon.example',
          enquiry_channels: 'Website form',
          lead_sources: 'Website form',
          primary_pain: 'Overnight enquiry mishandling on the existing form',
          urgency: 'this-month',
          consent_contact: true,
          discovery_form: true,
          source: 'corpflow-market-gateway',
          host: 'corpflowai.com',
          page: '/contact?offer=ai-lead-rescue',
        },
        rapid_delivery_operator: {
          status: 'new_intake',
          notes: '',
          activity: [],
          updated_at: '2026-08-26T09:00:00.000Z',
        },
      },
    },
    {
      id: 'syn-1171-wr-enquiry',
      tenantId: 'corpflowai',
      name: 'Mira Qualified',
      email: 'mira.qualified+1171@example.com',
      phone: '+2305117112',
      status: 'NEW_INTAKE',
      createdAt: new Date('2026-08-26T09:15:00.000Z'),
      updatedAt: new Date('2026-08-26T09:15:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          offer_slug: 'premium-landing-page-rescue',
          service_path: 'website-digital',
          service_interest: 'website_rescue',
          buyer_need: null,
          locked_product: true,
          website_rescue_context: true,
          business_name: 'Mira Pages Studio',
          website: 'https://mira-pages.example',
          enquiry_channels: 'Website form',
          primary_pain: 'Current site does not convert enquiries',
          urgency: 'asap',
          consent_contact: true,
          discovery_form: true,
          source: '/website-rescue',
          host: 'corpflowai.com',
          page: '/website-rescue',
        },
        rapid_delivery_operator: {
          status: 'new_intake',
          notes: '',
          activity: [],
          updated_at: '2026-08-26T09:15:00.000Z',
        },
      },
    },
  ];
}

/**
 * Staff Operating Workspace projection.
 * Includes contact and #699 enquiry-handoff fields; still omits raw qualificationJson.
 *
 * @param {Record<string, unknown>} vm
 * @returns {Record<string, unknown>}
 */
export function publicProspectListItem(vm) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of PUBLIC_PROSPECT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(vm, key)) out[key] = vm[key];
  }
  return out;
}

/**
 * Staff-only detail projection. Omits qualificationJson. Includes contact identity.
 *
 * @param {Record<string, unknown>} vm
 * @returns {Record<string, unknown>}
 */
export function publicProspectDetailItem(vm) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of PUBLIC_PROSPECT_DETAIL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(vm, key)) out[key] = vm[key];
  }
  return out;
}

/**
 * @param {unknown} row
 * @param {Date} [now]
 * @returns {Record<string, unknown> | null}
 */
export function projectProspectDetail(row, now = new Date()) {
  if (!row) return null;
  if (!isKnownProspectLeadRow(row) && !isWorkbenchProspectLeadRow(row)) return null;
  const vm = publicProspectDetailItem(
    leadRowToProspectDetailViewModel(/** @type {Record<string, unknown>} */ (row), now),
  );
  const qj =
    row && typeof row === 'object'
      ? /** @type {Record<string, unknown>} */ (row).qualificationJson
      : null;
  vm.commercial_clearance = projectCommercialClearanceFromQualification(qj, {
    product: detectProspectProduct(qj),
  });
  const websiteRescueDelivery = projectWebsiteRescueDeliveryFromQualification(qj, {
    product: detectProspectProduct(qj),
  });
  if (websiteRescueDelivery) vm.website_rescue_delivery = websiteRescueDelivery;
  return vm;
}

/**
 * @param {unknown} row
 * @returns {boolean}
 */
export function isKnownProspectLeadRow(row) {
  const qj =
    row && typeof row === 'object'
      ? /** @type {Record<string, unknown>} */ (row).qualificationJson
      : null;
  const product = detectProspectProduct(qj);
  return product === AI_LEAD_RESCUE_PRODUCT || product === RAPID_DELIVERY_PRODUCT;
}

/**
 * Workbench includes Lead Rescue, Website Rescue, and general market enquiries.
 *
 * @param {unknown} row
 * @returns {boolean}
 */
export function isWorkbenchProspectLeadRow(row) {
  if (!row || typeof row !== 'object') return false;
  const id = String(/** @type {Record<string, unknown>} */ (row).id || '').trim();
  return Boolean(id);
}

/**
 * @param {unknown[]} rows
 * @param {Date} [now]
 * @returns {Array<Record<string, unknown>>}
 */
export function projectProspectWorkbenchRows(rows, now = new Date()) {
  const list = Array.isArray(rows) ? rows : [];
  const projected = [];
  for (const row of list) {
    if (!isWorkbenchProspectLeadRow(row)) continue;
    projected.push(publicProspectListItem(leadRowToProspectViewModel(row, now)));
  }
  return sortProspectsForActionQueue(projected, now);
}

/**
 * @param {unknown[]} rows
 * @param {Date} [now]
 * @returns {Array<Record<string, unknown>>}
 */
export function projectProspectLeadRows(rows, now = new Date()) {
  const list = Array.isArray(rows) ? rows : [];
  const projected = [];
  for (const row of list) {
    if (!isKnownProspectLeadRow(row)) continue;
    const item = publicProspectListItem(leadRowToProspectViewModel(row, now));
    const pointer = extractExistingDeliveryPointer(row);
    if (pointer) item.erpnext_delivery = pointer;
    projected.push(item);
  }
  return sortProspectsForActionQueue(projected, now);
}

/**
 * Today / My Work: overdue, due today, no next action, awaiting operator.
 *
 * @param {Array<Record<string, unknown>>} rows
 * @param {Date} [now]
 * @returns {Array<Record<string, unknown>>}
 */
export function filterProspectsForMyWorkToday(rows, now = new Date()) {
  const list = Array.isArray(rows) ? rows : [];
  return sortProspectsForActionQueue(
    list.filter((row) => matchesMyWorkTodayFilter(row, now)),
    now,
  );
}

/**
 * Canonical Action Queue filter over the shared prospect list.
 *
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} [filter]
 * @param {Date} [now]
 * @returns {Array<Record<string, unknown>>}
 */
export function filterProspectsForActionQueue(rows, filter = 'needs_action', now = new Date()) {
  const list = Array.isArray(rows) ? rows : [];
  const id = normalizeActionQueueFilter(filter);
  return sortProspectsForActionQueue(
    list.filter((row) => matchesActionQueueFilter(row, id, now)),
    now,
  );
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Date} [now]
 * @returns {Record<string, number>}
 */
export function countActionQueueFilters(rows, now = new Date()) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const id of ACTION_QUEUE_FILTERS) {
    counts[id] = filterProspectsForActionQueue(rows, id, now).length;
  }
  return counts;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {{
 *   filter?: string,
 *   sort?: string,
 *   dir?: string,
 *   q?: string,
 * }} [opts]
 * @param {Date} [now]
 * @returns {Array<Record<string, unknown>>}
 */
export function filterProspectsForWorkbench(rows, opts = {}, now = new Date()) {
  const list = Array.isArray(rows) ? rows : [];
  const filtered = list.filter(
    (row) => matchesWorkbenchFilter(row, opts.filter, now) && matchesWorkbenchQuery(row, opts.q),
  );
  return sortProspectsForWorkbench(filtered, { sort: opts.sort, dir: opts.dir }, now);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Date} [now]
 * @returns {Record<string, number>}
 */
export function countWorkbenchFilters(rows, now = new Date()) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const id of WORKBENCH_FILTERS) {
    counts[id] = filterProspectsForWorkbench(rows, { filter: id }, now).length;
  }
  return counts;
}

/**
 * @param {import('./access.js').AppActor | null | undefined} actor
 * @returns {{ ok: true } | { ok: false, error: string, http_status: number }}
 */
export function assertProspectOperationsAccess(actor) {
  if (!actor) {
    return { ok: false, error: 'authentication_required', http_status: 401 };
  }
  if (!canAccessOperatingWorkspace(actor)) {
    return { ok: false, error: 'core_access_denied', http_status: 403 };
  }
  return { ok: true };
}

/**
 * @param {{
 *   prospects: Array<Record<string, unknown>>,
 *   data_source: string,
 *   proof_mode?: boolean,
 * }} args
 */
export function buildProspectOperationsPayload(args) {
  const prospects = Array.isArray(args.prospects) ? args.prospects : [];
  return {
    ok: true,
    workspace: 'operating',
    path: PROSPECT_OPERATIONS_PATH,
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    count: prospects.length,
    prospects,
    canonical_operator_surface: PROSPECT_OPERATIONS_PATH,
    temporary_source_surfaces: {
      action_queue: ACTION_QUEUE_PATH,
      workbench: PROSPECT_WORKBENCH_PATH,
      product_workbench: '/admin/lead-rescue',
      kanban: PROSPECT_PIPELINE_PATH,
    },
    external_send: false,
  };
}

/**
 * @param {{
 *   prospects: Array<Record<string, unknown>>,
 *   data_source: string,
 *   proof_mode?: boolean,
 * }} args
 */
export function buildTodayMyWorkPayload(args) {
  const prospects = Array.isArray(args.prospects) ? args.prospects : [];
  return {
    ok: true,
    workspace: 'operating',
    path: TODAY_MY_WORK_PATH,
    view: 'today',
    filter: 'matchesMyWorkTodayFilter',
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    count: prospects.length,
    prospects,
    temporary_source_surfaces: {
      action_queue: ACTION_QUEUE_PATH,
      workbench: PROSPECT_WORKBENCH_PATH,
      product_workbench: '/admin/lead-rescue',
      kanban: PROSPECT_PIPELINE_PATH,
      prospect_operations: PROSPECT_OPERATIONS_PATH,
    },
    external_send: false,
  };
}

/**
 * @param {{
 *   prospect: Record<string, unknown>,
 *   data_source: string,
 *   proof_mode?: boolean,
 * }} args
 */
export function buildProspectDetailPayload(args) {
  const prospect = args.prospect && typeof args.prospect === 'object' ? args.prospect : {};
  return {
    ok: true,
    workspace: 'operating',
    path: String(prospect.shared_detail_path || PROSPECT_OPERATIONS_PATH),
    view: 'shared_detail',
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    prospect,
    temporary_source_surfaces: {
      action_queue: ACTION_QUEUE_PATH,
      workbench: PROSPECT_WORKBENCH_PATH,
      product_workbench: '/admin/lead-rescue',
      kanban: PROSPECT_PIPELINE_PATH,
      product_detail: prospect.product_detail_path || prospect.detail_path || null,
    },
    mutations_enabled: true,
    external_send: false,
    email_sent: false,
    whatsapp_sent: false,
    sms_sent: false,
    payment_processed: false,
  };
}

/**
 * @param {{
 *   prospects: Array<Record<string, unknown>>,
 *   data_source: string,
 *   filter?: string,
 *   sort?: string,
 *   dir?: string,
 *   q?: string,
 *   filter_counts?: Record<string, number>,
 *   proof_mode?: boolean,
 * }} args
 */
export function buildProspectWorkbenchPayload(args) {
  const prospects = Array.isArray(args.prospects) ? args.prospects : [];
  return {
    ok: true,
    workspace: 'operating',
    path: PROSPECT_WORKBENCH_PATH,
    view: 'workbench',
    filter: args.filter || 'all',
    sort: args.sort || 'priority',
    dir: args.dir || 'asc',
    q: args.q || '',
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    count: prospects.length,
    prospects,
    filter_counts: args.filter_counts && typeof args.filter_counts === 'object' ? args.filter_counts : {},
    canonical_operator_surface: PROSPECT_WORKBENCH_PATH,
    shared_detail_surface: '/app/prospects/[id]',
    product_specific_surface_replaced: '/admin/lead-rescue',
    temporary_source_surfaces: {
      action_queue: ACTION_QUEUE_PATH,
      workbench: PROSPECT_WORKBENCH_PATH,
      product_workbench: '/admin/lead-rescue',
      kanban: PROSPECT_PIPELINE_PATH,
      prospect_operations: PROSPECT_OPERATIONS_PATH,
    },
    mutations_enabled: true,
    external_send: false,
    email_sent: false,
    whatsapp_sent: false,
    sms_sent: false,
    payment_processed: false,
  };
}

/**
 * @param {{
 *   prospects: Array<Record<string, unknown>>,
 *   data_source: string,
 *   proof_mode?: boolean,
 *   filter?: string,
 *   filter_counts?: Record<string, number>,
 * }} args
 */
export function buildActionQueuePayload(args) {
  const prospects = Array.isArray(args.prospects) ? args.prospects : [];
  const filter = normalizeActionQueueFilter(args.filter);
  return {
    ok: true,
    workspace: 'operating',
    path: ACTION_QUEUE_PATH,
    view: 'action_queue',
    filter,
    filters: [...ACTION_QUEUE_FILTERS],
    filter_counts: args.filter_counts && typeof args.filter_counts === 'object' ? args.filter_counts : {},
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    count: prospects.length,
    prospects,
    canonical_operator_surface: ACTION_QUEUE_PATH,
    shared_detail_surface: '/app/prospects/[id]',
    temporary_source_surfaces: {
      action_queue: ACTION_QUEUE_PATH,
      workbench: PROSPECT_WORKBENCH_PATH,
      product_workbench: '/admin/lead-rescue',
      kanban: PROSPECT_PIPELINE_PATH,
      prospect_operations: PROSPECT_OPERATIONS_PATH,
      rapid_delivery_desk: '/admin/rapid-delivery',
    },
    mutations_enabled: true,
    external_send: false,
    email_sent: false,
    whatsapp_sent: false,
    sms_sent: false,
    payment_processed: false,
  };
}
