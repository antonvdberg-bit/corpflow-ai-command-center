/**
 * Product A — audit intake payload (pure validation + shape).
 * Used by POST /api/product-a/intake and node-tests.
 *
 * Variants:
 * - US clinic (default): `intake.product_a.us_clinic.v1` — `/product-a/us-clinics`
 * - Mauritius property: `intake.product_a.mauritius.v1` — `/product-a/mauritius`
 */

export const PRODUCT_A_INTAKE_EVENT_TYPE = 'intake.product_a.us_clinic.v1';
export const PRODUCT_A_INTAKE_SCHEMA = 'corpflow.product_a.intake.v1';
export const PRODUCT_A_INTAKE_SOURCE = 'product-a-landing';
export const PRODUCT_A_INTAKE_PAGE = '/product-a/us-clinics';

export const PRODUCT_A_MAURITIUS_INTAKE_EVENT_TYPE = 'intake.product_a.mauritius.v1';
export const PRODUCT_A_MAURITIUS_INTAKE_SCHEMA = 'corpflow.product_a.intake.mauritius.v1';
export const PRODUCT_A_MAURITIUS_INTAKE_PAGE = '/product-a/mauritius';
export const PRODUCT_A_MARKET_MAURITIUS_PROPERTY = 'mauritius-property';

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
 * @returns {'us_clinic' | 'mauritius_property'}
 */
export function detectProductAIntakeVariant(body) {
  if (body && typeof body === 'object' && str(body.market) === PRODUCT_A_MARKET_MAURITIUS_PROPERTY) {
    return 'mauritius_property';
  }
  return 'us_clinic';
}

/**
 * @param {string} websiteRaw
 * @returns {{ ok: true, website: string } | { ok: false, error: string, field: string }}
 */
function validateWebsiteField(websiteRaw) {
  if (!websiteRaw) return { ok: false, error: 'Website is required', field: 'website' };
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
  return { ok: true, website };
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, data: Record<string, string | null>, variant: 'us_clinic' } | { ok: false, error: string, field?: string }}
 */
export function validateProductAIntakeBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Missing JSON body', field: 'body' };
  }

  if (detectProductAIntakeVariant(body) === 'mauritius_property') {
    return { ok: false, error: 'Use Mauritius property intake fields for this market', field: 'market' };
  }

  const clinic_name = str(body.clinic_name);
  const websiteRaw = str(body.website);
  const contact_name = str(body.contact_name);
  const email = str(body.email).toLowerCase();
  const phoneRaw = str(body.phone);
  const city_state = str(body.city_state);
  const biggest_problem = str(body.biggest_problem);

  if (!clinic_name) return { ok: false, error: 'Clinic name is required', field: 'clinic_name' };
  const websiteCheck = validateWebsiteField(websiteRaw);
  if (!websiteCheck.ok) return websiteCheck;
  if (!contact_name) return { ok: false, error: 'Contact name is required', field: 'contact_name' };
  if (!email) return { ok: false, error: 'Email is required', field: 'email' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address', field: 'email' };
  }
  if (!city_state) return { ok: false, error: 'City and state are required', field: 'city_state' };
  if (!biggest_problem) {
    return { ok: false, error: 'Describe your biggest enquiry or booking problem', field: 'biggest_problem' };
  }

  return {
    ok: true,
    variant: 'us_clinic',
    data: {
      clinic_name,
      website: websiteCheck.website,
      contact_name,
      email,
      phone: phoneRaw || null,
      city_state,
      biggest_problem,
    },
  };
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, data: Record<string, string | null>, variant: 'mauritius_property' } | { ok: false, error: string, field?: string }}
 */
export function validateProductAMauritiusIntakeBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Missing JSON body', field: 'body' };
  }

  if (detectProductAIntakeVariant(body) !== 'mauritius_property') {
    return { ok: false, error: 'market must be mauritius-property', field: 'market' };
  }

  const agency_name = str(body.agency_name);
  const websiteRaw = str(body.website);
  const contact_name = str(body.contact_name);
  const email = str(body.email).toLowerCase();
  const phoneRaw = str(body.phone);
  const city_region = str(body.city_region);
  const biggest_problem = str(body.biggest_problem);

  if (!agency_name) return { ok: false, error: 'Agency name is required', field: 'agency_name' };
  const websiteCheck = validateWebsiteField(websiteRaw);
  if (!websiteCheck.ok) return websiteCheck;
  if (!contact_name) return { ok: false, error: 'Contact name is required', field: 'contact_name' };
  if (!email) return { ok: false, error: 'Email is required', field: 'email' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address', field: 'email' };
  }
  if (!city_region) return { ok: false, error: 'City or region is required', field: 'city_region' };
  if (!biggest_problem) {
    return { ok: false, error: 'Describe your biggest enquiry or follow-up problem', field: 'biggest_problem' };
  }

  return {
    ok: true,
    variant: 'mauritius_property',
    data: {
      agency_name,
      website: websiteCheck.website,
      contact_name,
      email,
      phone: phoneRaw || null,
      city_region,
      biggest_problem,
    },
  };
}

/**
 * @param {unknown} body
 * @returns {ReturnType<typeof validateProductAIntakeBody> | ReturnType<typeof validateProductAMauritiusIntakeBody>}
 */
export function validateProductAIntakeBodyForRequest(body) {
  if (detectProductAIntakeVariant(body) === 'mauritius_property') {
    return validateProductAMauritiusIntakeBody(body);
  }
  return validateProductAIntakeBody(body);
}

/**
 * @param {Record<string, string | null>} data
 * @param {{ received_at?: string, host?: string, page?: string, variant?: 'us_clinic' | 'mauritius_property' }} [meta]
 */
export function buildProductAIntakePayload(data, meta = {}) {
  const received_at = meta.received_at || new Date().toISOString();
  const variant = meta.variant || 'us_clinic';

  if (variant === 'mauritius_property') {
    return {
      schema: PRODUCT_A_MAURITIUS_INTAKE_SCHEMA,
      event_type: PRODUCT_A_MAURITIUS_INTAKE_EVENT_TYPE,
      received_at,
      status: 'new',
      market: PRODUCT_A_MARKET_MAURITIUS_PROPERTY,
      agency_name: data.agency_name,
      website: data.website,
      contact_name: data.contact_name,
      email: data.email,
      phone: data.phone,
      city_region: data.city_region,
      biggest_problem: data.biggest_problem,
      source: PRODUCT_A_INTAKE_SOURCE,
      page: meta.page || PRODUCT_A_MAURITIUS_INTAKE_PAGE,
      host: meta.host || '',
    };
  }

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
 * @param {string} businessName
 * @param {string} receivedAtIso
 * @param {'us_clinic' | 'mauritius_property'} [variant]
 */
export function buildProductAIntakeIdempotencyKey(email, businessName, receivedAtIso, variant = 'us_clinic') {
  const day = receivedAtIso.slice(0, 10);
  const slug = str(businessName).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48);
  const emailNorm = str(email).toLowerCase();
  if (variant === 'mauritius_property') {
    return `product-a:intake:mauritius-property:${emailNorm}:${slug}:${day}`;
  }
  // US clinic — preserve legacy key shape for existing automation dedup
  return `product-a:intake:${emailNorm}:${slug}:${day}`;
}
