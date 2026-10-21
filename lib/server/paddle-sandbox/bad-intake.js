import { getApprovedBadZarService } from './bad-zar-catalog.js';

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const CORRELATION_PATTERN = /^[A-Za-z0-9:_-]{8,80}$/;
const PERSON_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .,'&()/-]{1,119}$/;

function text(value) {
  return String(value == null ? '' : value).trim();
}

export function createBadCorrelationId() {
  return `cfai-bad-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function validateBadCustomerIntake(input = {}) {
  const errors = [];
  const legal_business_name = text(input.legal_business_name);
  const contact_name = text(input.contact_name);
  const business_email = text(input.business_email).toLowerCase();
  const country = text(input.country).toUpperCase();
  const item_code = text(input.item_code);
  const correlation_id = text(input.correlation_id) || createBadCorrelationId();

  if (!PERSON_PATTERN.test(legal_business_name)) errors.push('legal_business_name');
  if (!PERSON_PATTERN.test(contact_name)) errors.push('contact_name');
  if (!EMAIL_PATTERN.test(business_email)) errors.push('business_email');
  if (!COUNTRY_PATTERN.test(country)) errors.push('country');
  if (!getApprovedBadZarService(item_code)) errors.push('item_code');
  if (!CORRELATION_PATTERN.test(correlation_id)) errors.push('correlation_id');

  return {
    ok: errors.length === 0,
    errors,
    value: errors.length
      ? null
      : {
          legal_business_name,
          contact_name,
          business_email,
          country,
          item_code,
          correlation_id,
          brand: 'business_admin_desk',
        },
  };
}

export function checkoutCustomData(intake) {
  const checked = validateBadCustomerIntake(intake);
  if (!checked.ok) return checked;
  return {
    ok: true,
    customData: {
      brand: checked.value.brand,
      item_code: checked.value.item_code,
      correlation_id: checked.value.correlation_id,
      legal_business_name: checked.value.legal_business_name,
      country: checked.value.country,
      contact_name: checked.value.contact_name,
    },
    customer: { email: checked.value.business_email },
  };
}

export function sanitizeBadLog(details = {}) {
  const safe = {};
  for (const key of ['event_id', 'event_type', 'item_code', 'correlation_id', 'country', 'outcome', 'error']) {
    if (details[key] != null) safe[key] = String(details[key]).slice(0, 120);
  }
  return safe;
}
