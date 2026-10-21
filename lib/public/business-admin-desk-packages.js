/**
 * Approved Business Admin Desk one-time service fees.
 * Government and statutory fees are excluded. Checkout is not activated here.
 * VAT treatment is intentionally absent: it is still an open commercial decision.
 */

import {
  isBusinessAdminDeskPublicHost,
  isCipcDeskStandingTestHost,
  normalizeHostname,
} from '../server/cipc-desk-runtime.js';

export const BUSINESS_ADMIN_DESK_PUBLIC_ORIGIN = 'https://businessadmindesk.co.za';

export const BAD_STATUTORY_FEE_NOTE =
  'Government and statutory fees are charged separately. They are not included in the service fee.';

export const BAD_CHECKOUT_NOTE =
  'Online checkout is not available. This website does not take card or bank payment.';

export const BAD_PACKAGE_MODEL_NOTE =
  'Each package is one integrated, software-managed company-administration process. Software workflow management and controlled human execution are parts of the same package. Fully automated filing is not live on this website.';

/** @typedef {'public' | 'staging' | 'other'} BusinessAdminDeskSurface */

/**
 * @param {string | null | undefined} host
 * @returns {BusinessAdminDeskSurface}
 */
export function resolveBusinessAdminDeskSurface(host) {
  const normalized = normalizeHostname(host);
  if (isBusinessAdminDeskPublicHost(normalized)) return 'public';
  if (isCipcDeskStandingTestHost(normalized)) return 'staging';
  return 'other';
}

/**
 * @param {number} amountZar
 * @returns {string}
 */
export function formatZarServiceFee(amountZar) {
  return `ZAR ${amountZar}`;
}

export const BUSINESS_ADMIN_DESK_PACKAGES = Object.freeze([
  Object.freeze({
    code: 'BAD-ONBOARD-EXISTING',
    name: 'Onboard an existing company',
    amountZar: 199,
    summary:
      'One-time onboarding of a company that already exists, creating a reusable verified file for later packages.',
  }),
  Object.freeze({
    code: 'BAD-REG-ONBOARD-BUNDLE',
    name: 'Registration and onboarding',
    amountZar: 299,
    summary:
      'Company registration together with onboarding. Initial beneficial ownership is scoped separately and is not included.',
  }),
  Object.freeze({
    code: 'BAD-ANNUAL-RETURN-BO-CURRENT',
    name: 'Annual return, beneficial ownership already current',
    amountZar: 99,
    summary: 'Annual return administration where beneficial ownership is already current.',
  }),
  Object.freeze({
    code: 'BAD-BO-SIMPLE',
    name: 'Simple beneficial ownership',
    amountZar: 249,
    summary:
      'A straightforward beneficial-ownership package. Complex ownership structures and cleanup are quoted separately.',
  }),
  Object.freeze({
    code: 'BAD-DIRECTOR-APPT-RESIGN',
    name: 'Director appointment or resignation',
    amountZar: 199,
    summary: 'Director appointment or resignation handled as one package.',
  }),
  Object.freeze({
    code: 'BAD-ADDRESS-CHANGE',
    name: 'Registered address change',
    amountZar: 69,
    summary: 'Registered address change administration.',
  }),
  Object.freeze({
    code: 'BAD-SHARE-CERT-VERIFIED',
    name: 'Verified share certificate',
    amountZar: 99,
    summary: 'A verified share certificate prepared as a company record. This is not a change of shareholding.',
  }),
  Object.freeze({
    code: 'BAD-NAME-RESERVATION',
    name: 'Company name reservation',
    amountZar: 99,
    summary: 'Company name reservation administration.',
  }),
  Object.freeze({
    code: 'BAD-FYE-CHANGE',
    name: 'Financial year-end change',
    amountZar: 199,
    summary: 'Financial year-end change administration.',
  }),
]);
