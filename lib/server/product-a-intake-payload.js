/**
 * Product A — US clinic audit intake payload (pure validation + shape).
 * Used by POST /api/product-a/intake and node-tests.
 */

export const PRODUCT_A_INTAKE_EVENT_TYPE = 'intake.product_a.us_clinic.v1';
export const PRODUCT_A_INTAKE_SCHEMA = 'corpflow.product_a.intake.v1';
export const PRODUCT_A_INTAKE_SOURCE = 'product-a-landing';
export const PRODUCT_A_INTAKE_PAGE = '/product-a/us-clinics';

function str(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeWebsiteUrl(raw) {
  const s = str(raw);
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, data: Record<string, string | null> } | { ok: false, error: string, field?: string }}
 */
export function validateProductAIntakeBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Missing JSON body', field: 'body' };
  }

  const clinic_name = str(body.clinic_name);
  const websiteRaw = str(body.website);
  const contact_name = str(body.contact_name);
  const email = str(body.email).toLowerCase();
  const phoneRaw = str(body.phone);
  const city_state = str(body.city_state);
  const biggest_problem = str(body.biggest_problem);

  if (!clinic_name) return { ok: false, error: 'Clinic name is required', field: 'clinic_name' };
  if (!websiteRaw) return { ok: false, error: 'Website is required', field: 'website' };
  if (!contact_name) return { ok: false, error: 'Contact name is required', field: 'contact_name' };
  if (!email) return { ok: false, error: 'Email is required', field: 'email' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address', field: 'email' };
  }
  if (!city_state) return { ok: false, error: 'City and state are required', field: 'city_state' };
  if (!biggest_problem) {
    return { ok: false, error: 'Describe your biggest enquiry or booking problem', field: 'biggest_problem' };
  }

  const website = normalizeWebsiteUrl(websiteRaw);
  try {
    const u = new URL(website);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, error: 'Website must use http or https', field: 'website' };
    }
    if (!u.hostname) {
      return { ok: false, error: 'Enter a valid website URL', field: 'website' };
    }
  } catch {
    return { ok: false, error: 'Enter a valid website URL', field: 'website' };
  }

  return {
    ok: true,
    data: {
      clinic_name,
      website,
      contact_name,
      email,
      phone: phoneRaw || null,
      city_state,
      biggest_problem,
    },
  };
}

/**
 * @param {Record<string, string | null>} data
 * @param {{ received_at?: string, host?: string, page?: string }} [meta]
 */
export function buildProductAIntakePayload(data, meta = {}) {
  const received_at = meta.received_at || new Date().toISOString();
  return {
    schema: PRODUCT_A_INTAKE_SCHEMA,
    event_type: PRODUCT_A_INTAKE_EVENT_TYPE,
    received_at,
    status: 'new',
    clinic_name: data.clinic_name,
    website: data.website,
    contact_name: data.contact_name,
    email: data.email,
    phone: data.phone,
    city_state: data.city_state,
    biggest_problem: data.biggest_problem,
    source: PRODUCT_A_INTAKE_SOURCE,
    page: meta.page || PRODUCT_A_INTAKE_PAGE,
    host: meta.host || '',
  };
}

/**
 * @param {string} email
 * @param {string} clinicName
 * @param {string} receivedAtIso
 */
export function buildProductAIntakeIdempotencyKey(email, clinicName, receivedAtIso) {
  const day = receivedAtIso.slice(0, 10);
  const clinicSlug = str(clinicName).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48);
  return `product-a:intake:${str(email).toLowerCase()}:${clinicSlug}:${day}`;
}
