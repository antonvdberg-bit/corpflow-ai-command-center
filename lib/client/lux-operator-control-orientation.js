/**
 * Lux / Rare & Exclusive — operator control orientation (issue #704).
 *
 * Copy + checklist for the Lux-only panel on `/change` when the active
 * tenant context is `luxe-maurice`. Helps Jan distinguish the private
 * operator/control space from the public ivory/sand client site, and
 * steers functional testing of the concierge enquiry workflow (#673/#675).
 *
 * Not used on public marketing surfaces. No schema/env/auth changes.
 */

/** Tenant id this orientation applies to (Lux spoke only). */
export const LUX_OPERATOR_CONTROL_TENANT_ID = 'luxe-maurice';

export const LUX_OPERATOR_CONTROL_TITLE = 'Rare & Exclusive operator control space';

export const LUX_OPERATOR_CONTROL_NOT_PUBLIC =
  'This is not the public client site.';

export const LUX_OPERATOR_CONTROL_PURPOSE =
  'Use this space to review enquiries and move them through the private-client workflow.';

/**
 * Concise Jan functional test sequence (workflow capability, not visuals).
 * Links point at existing surfaces; status steps reuse #673/#675 stages.
 *
 * @type {readonly { id: string, label: string, href?: string }[]}
 */
export const LUX_OPERATOR_FUNCTIONAL_TEST_CHECKLIST = Object.freeze([
  {
    id: 'submit_enquiry',
    label: 'Submit a test enquiry on /concierge (email + telephone required).',
    href: '/concierge',
  },
  {
    id: 'return_change',
    label: 'Return to /change (this operator control space).',
    href: '/change',
  },
  {
    id: 'find_queue',
    label: 'Find the enquiry in the operator queue (Leads · LuxeMaurice CRM).',
    href: '#lux-crm-leads-workspace',
  },
  {
    id: 'check_contact',
    label: 'Confirm email and telephone are visible on the selected lead.',
    href: '#lux-crm-leads-workspace',
  },
  {
    id: 'move_status',
    label:
      'Move status: new → contacted → qualified → invited → closed (existing enquiry workflow).',
    href: '#lux-crm-leads-workspace',
  },
  {
    id: 'record_gaps',
    label: 'Record what did not match expectation (functionality first — not visual polish).',
  },
]);

/**
 * @param {unknown} tenantId
 * @returns {boolean}
 */
export function isLuxOperatorControlTenant(tenantId) {
  return String(tenantId || '').trim() === LUX_OPERATOR_CONTROL_TENANT_ID;
}
