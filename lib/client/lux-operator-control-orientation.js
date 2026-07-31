/**
 * Lux / Rare & Exclusive — operator control orientation (issue #704).
 *
 * Copy + checklist for the Lux-only `/change` banner when tenant context is
 * `luxe-maurice`. Keeps Jan oriented: this desk is not the public client site.
 *
 * No schema/env/auth/CRM redesign — presentation helpers only.
 */

/** @type {string} */
export const LUX_OPERATOR_CONTROL_TENANT_ID = 'luxe-maurice';

/** Plain space label for the Lux operator desk. */
export const LUX_OPERATOR_CONTROL_SPACE_TITLE = 'Rare & Exclusive operator control space';

/** Explicit boundary line — must stay visible to Jan. */
export const LUX_OPERATOR_CONTROL_NOT_PUBLIC_NOTICE = 'This is not the public client site';

/** One-line purpose for enquiry workflow testing. */
export const LUX_OPERATOR_CONTROL_PURPOSE =
  'Use this space to review enquiries and move them through the private-client workflow';

/** Anchor already used by #673/#675 CRM panel on `/change`. */
export const LUX_OPERATOR_CRM_WORKSPACE_HASH = '#lux-crm-leads-workspace';

/** Public enquiry form path (unchanged by this slice). */
export const LUX_OPERATOR_CONCIERGE_PATH = '/concierge';

/**
 * Jan functional test sequence — workflow capability, not visual polish.
 * Stages match `LUX_LEAD_CRM_STAGES` from #673/#675.
 *
 * @type {readonly { id: string, label: string, href?: string }[]}
 */
export const LUX_OPERATOR_JAN_TEST_CHECKLIST = Object.freeze([
  {
    id: 'submit-concierge',
    label: 'Submit a test enquiry on /concierge (email + telephone required).',
    href: LUX_OPERATOR_CONCIERGE_PATH,
  },
  {
    id: 'return-change',
    label: 'Return to /change (this operator control space).',
  },
  {
    id: 'find-queue',
    label: 'Find the enquiry in the operator queue / Leads CRM panel.',
    href: LUX_OPERATOR_CRM_WORKSPACE_HASH,
  },
  {
    id: 'check-contact',
    label: 'Confirm email and telephone are visible on the lead.',
    href: LUX_OPERATOR_CRM_WORKSPACE_HASH,
  },
  {
    id: 'move-status',
    label: 'Move status: new → contacted → qualified → invited → closed.',
    href: LUX_OPERATOR_CRM_WORKSPACE_HASH,
  },
  {
    id: 'record-gaps',
    label: 'Record what did not match expectation (function first, not visuals).',
  },
]);

/**
 * Visual tokens for the orientation panel — cool operator strip, not ivory/sand
 * public marketing chrome.
 *
 * @returns {Record<string, string>}
 */
export function buildLuxOperatorOrientationTokens() {
  return {
    panelBg: 'rgba(8, 20, 36, 0.92)',
    panelBorder: 'rgba(56, 189, 248, 0.55)',
    accentBar: '#38bdf8',
    eyebrow: '#7dd3fc',
    title: '#f0f9ff',
    notice: '#fde68a',
    body: '#cbd5e1',
    stepNum: '#38bdf8',
    link: '#7dd3fc',
    muted: '#94a3b8',
  };
}

/**
 * Whether the Lux operator orientation layer should render.
 * Same gate shape as Lux CRM on `/change` (tenant or admin acting on Lux host).
 *
 * @param {{
 *   logged_in?: boolean,
 *   level?: string | null,
 *   tenant_id?: string | null,
 *   acting_tenant_id?: string | null,
 *   surface?: string | null,
 *   host_tenant_id?: string | null,
 * }} [ctx]
 */
export function shouldShowLuxOperatorControlOrientation(ctx = {}) {
  if (ctx.logged_in !== true) return false;
  const level = String(ctx.level || '').toLowerCase();
  const tid = String(ctx.tenant_id || '').trim();
  if (level === 'tenant' && tid === LUX_OPERATOR_CONTROL_TENANT_ID) return true;
  const acting = String(ctx.acting_tenant_id || '').trim();
  const host = String(ctx.host_tenant_id || '').trim();
  return (
    level === 'admin' &&
    String(ctx.surface || '') === 'tenant' &&
    acting === LUX_OPERATOR_CONTROL_TENANT_ID &&
    host === LUX_OPERATOR_CONTROL_TENANT_ID
  );
}
