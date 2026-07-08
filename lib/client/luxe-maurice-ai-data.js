/**
 * LuxeMaurice AI v1 preview data layer.
 *
 * Mode: seed / adapter — shapes match artifacts/luxe-maurice-ai-db-delivery-pack/
 * (schema.sql, seed.sql, API_CONTRACT.md). No live Postgres or Supabase.
 */

/** @readonly */
export const LUXE_MAURICE_AI_PREVIEW_MODE = 'seed';

/** @readonly — matches seed.sql tenant row */
export const LUXE_MAURICE_AI_TENANT_ID = '11111111-1111-4111-8111-111111111111';

const STORAGE_KEY = 'luxe-maurice-ai-preview-enquiries-v1';

/** @type {Array<Record<string, unknown>>} */
const runtimeLeads = [];

/**
 * Seed catalogue — primary row from seed.sql plus two contract-shaped
 * preview opportunities for catalogue richness (same field model as schema).
 * @type {Array<Record<string, unknown>>}
 */
const SEED_PROPERTIES = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    tenant_id: LUXE_MAURICE_AI_TENANT_ID,
    slug: 'sample-coastal-residence',
    title: 'Sample Coastal Residence — Black River',
    summary: 'Private opportunity sample for schema preview.',
    description:
      'This is demo copy only. It represents a curated private opportunity memorandum, not a live listing.',
    property_type: 'private_opportunity',
    status: 'published',
    region_label: 'Black River',
    location_label: 'West Coast, Mauritius',
    price_label: 'Price on application',
    currency_code: 'USD',
    bedrooms: 4,
    bathrooms: 4.5,
    area_sqm: 420,
    published_at: '2026-07-01T10:00:00.000Z',
    hero_image: {
      storage_path: 'demo/sample-coastal-residence/hero.jpg',
      alt_text: 'Sample hero image — demo only',
    },
    gallery: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        storage_path: 'demo/sample-coastal-residence/hero.jpg',
        sort_order: 0,
        alt_text: 'Coastal residence — main view',
      },
      {
        id: '55555555-5555-4555-8555-555555555556',
        storage_path: 'demo/sample-coastal-residence/gallery-2.jpg',
        sort_order: 1,
        alt_text: 'Terrace and ocean outlook',
      },
    ],
  },
  {
    id: '44444444-4444-4444-8444-444444444445',
    tenant_id: LUXE_MAURICE_AI_TENANT_ID,
    slug: 'lagoon-villa-estate',
    title: 'Lagoon Villa Estate — Grand Baie',
    summary: 'Waterfront villa opportunity with private mooring access.',
    description:
      'A discreet lagoon-front residence positioned for long-stay lifestyle and private entertaining. Preview copy only.',
    property_type: 'private_opportunity',
    status: 'published',
    region_label: 'Grand Baie',
    location_label: 'North, Mauritius',
    price_label: 'From USD 2.8M',
    currency_code: 'USD',
    bedrooms: 5,
    bathrooms: 5,
    area_sqm: 580,
    published_at: '2026-06-20T09:00:00.000Z',
    hero_image: {
      storage_path: 'demo/lagoon-villa-estate/hero.jpg',
      alt_text: 'Lagoon villa — preview',
    },
    gallery: [
      {
        id: '55555555-5555-4555-8555-555555555557',
        storage_path: 'demo/lagoon-villa-estate/hero.jpg',
        sort_order: 0,
        alt_text: 'Lagoon frontage',
      },
    ],
  },
  {
    id: '44444444-4444-4444-8444-444444444446',
    tenant_id: LUXE_MAURICE_AI_TENANT_ID,
    slug: 'golf-residence-anahita',
    title: 'Golf Residence — Anahita',
    summary: 'Fairway-facing residence within a gated coastal enclave.',
    description:
      'Editorial preview of a golf-side private residence with club access and marina proximity. Not a live listing.',
    property_type: 'private_opportunity',
    status: 'published',
    region_label: 'Anahita',
    location_label: 'East Coast, Mauritius',
    price_label: 'From USD 3.2M',
    currency_code: 'USD',
    bedrooms: 4,
    bathrooms: 4,
    area_sqm: 510,
    published_at: '2026-06-10T08:00:00.000Z',
    hero_image: {
      storage_path: 'demo/golf-residence-anahita/hero.jpg',
      alt_text: 'Golf residence — preview',
    },
    gallery: [
      {
        id: '55555555-5555-4555-8555-555555555558',
        storage_path: 'demo/golf-residence-anahita/hero.jpg',
        sort_order: 0,
        alt_text: 'Fairway outlook',
      },
    ],
  },
];

/** @type {Array<Record<string, unknown>>} */
const SEED_LEADS = [
  {
    id: '88888888-8888-4888-8888-888888888888',
    status: 'new',
    buyer: {
      full_name: 'Sample Buyer',
      email: 'buyer.demo@example.invalid',
      phone: '+230-0000-0000',
    },
    property: {
      id: '44444444-4444-4444-8444-444444444444',
      slug: 'sample-coastal-residence',
      title: 'Sample Coastal Residence — Black River',
    },
    profile: {
      budget_min: 1500000,
      budget_max: 3500000,
      currency_code: 'USD',
      timeline: '6-12 months',
    },
    requirements: [
      { key: 'region', value: 'West Coast', priority: 'must_have' },
      { key: 'property_type', value: 'Completed residence', priority: 'should_have' },
    ],
    score: { score: 72.5, score_band: 'warm', rationale: 'Budget fit + region match + completed wizard' },
    match: {
      property_id: '44444444-4444-4444-8444-444444444444',
      match_score: 81,
      match_reason: 'Region and budget alignment',
      status: 'shortlisted',
    },
    created_at: '2026-07-05T14:30:00.000Z',
  },
];

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

function publishedProperties() {
  return SEED_PROPERTIES.filter((p) => p.status === 'published');
}

function propertyListingShape(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    region_label: row.region_label,
    location_label: row.location_label,
    price_label: row.price_label,
    status: row.status,
    bedrooms: row.bedrooms ?? null,
    bathrooms: row.bathrooms ?? null,
    hero_image: row.hero_image ?? null,
    published_at: row.published_at ?? null,
  };
}

function findPropertyRef(ref) {
  const key = safeStr(ref).toLowerCase();
  if (!key) return null;
  return (
    SEED_PROPERTIES.find((p) => safeStr(p.id).toLowerCase() === key) ||
    SEED_PROPERTIES.find((p) => safeStr(p.slug).toLowerCase() === key) ||
    null
  );
}

function readBrowserLeads() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBrowserLeads(/** @type {Array<Record<string, unknown>>} */ leads) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch {
    /* preview-only — ignore quota errors */
  }
}

function newUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `preview-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * @returns {Array<ReturnType<typeof propertyListingShape>>}
 */
export function listProperties() {
  return publishedProperties()
    .map(propertyListingShape)
    .sort((a, b) => {
      const ta = a.published_at ? Date.parse(a.published_at) : 0;
      const tb = b.published_at ? Date.parse(b.published_at) : 0;
      return tb - ta;
    });
}

/**
 * @param {string} id — UUID or slug
 */
export function getPropertyById(id) {
  const row = findPropertyRef(id);
  if (!row || row.status !== 'published') return null;
  return {
    property: propertyListingShape(row),
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    documents: [],
    detail: {
      description: row.description,
      property_type: row.property_type,
      bedrooms: row.bedrooms ?? null,
      bathrooms: row.bathrooms ?? null,
      area_sqm: row.area_sqm ?? null,
      currency_code: row.currency_code ?? 'USD',
    },
  };
}

/**
 * @param {{
 *   full_name: string,
 *   email: string,
 *   phone?: string,
 *   budget_min?: number | string,
 *   budget_max?: number | string,
 *   currency_code?: string,
 *   desired_location?: string,
 *   property_type?: string,
 *   buying_intent?: string,
 *   notes?: string,
 *   property_id?: string,
 * }} payload
 */
export function createEnquiry(payload) {
  const fullName = safeStr(payload?.full_name);
  const email = safeStr(payload?.email);
  if (!fullName || !email) {
    return { ok: false, error: 'Name and email are required.' };
  }

  const propertyId = safeStr(payload?.property_id) || null;
  const property = propertyId ? findPropertyRef(propertyId) : null;
  const buyerId = newUuid();
  const enquiryId = newUuid();
  const leadId = newUuid();
  const now = new Date().toISOString();

  const budgetMin = Number(payload?.budget_min) || null;
  const budgetMax = Number(payload?.budget_max) || null;
  const score = computePreviewScore({ budgetMin, budgetMax, desiredLocation: payload?.desired_location });

  const lead = {
    id: leadId,
    status: 'new',
    buyer: {
      full_name: fullName,
      email,
      phone: safeStr(payload?.phone) || null,
    },
    property: property
      ? { id: property.id, slug: property.slug, title: property.title }
      : null,
    profile: {
      budget_min: budgetMin,
      budget_max: budgetMax,
      currency_code: safeStr(payload?.currency_code) || 'USD',
      timeline: safeStr(payload?.buying_intent) || null,
    },
    requirements: [
      payload?.desired_location
        ? { key: 'region', value: safeStr(payload.desired_location), priority: 'must_have' }
        : null,
      payload?.property_type
        ? { key: 'property_type', value: safeStr(payload.property_type), priority: 'should_have' }
        : null,
    ].filter(Boolean),
    score,
    match: property
      ? {
          property_id: property.id,
          match_score: score.score,
          match_reason: 'Preview rules: budget and location alignment',
          status: 'suggested',
        }
      : null,
    notes: safeStr(payload?.notes) || null,
    created_at: now,
    enquiry_id: enquiryId,
    buyer_id: buyerId,
  };

  runtimeLeads.unshift(lead);
  const browserLeads = readBrowserLeads();
  browserLeads.unshift(lead);
  writeBrowserLeads(browserLeads);

  return {
    ok: true,
    enquiry_id: enquiryId,
    lead_id: leadId,
    buyer_id: buyerId,
  };
}

function computePreviewScore({ budgetMin, budgetMax, desiredLocation }) {
  let score = 55;
  if (budgetMin && budgetMax && budgetMax >= budgetMin) score += 15;
  if (safeStr(desiredLocation)) score += 10;
  score = Math.min(95, score);
  const band = score >= 80 ? 'hot' : score >= 65 ? 'warm' : 'cold';
  return {
    score,
    score_band: band,
    rationale: 'Preview rules_v1 scoring from wizard fields',
  };
}

/**
 * @returns {Array<Record<string, unknown>>}
 */
export function listLeads() {
  const browser = readBrowserLeads();
  const merged = [...browser, ...runtimeLeads, ...SEED_LEADS];
  const seen = new Set();
  return merged.filter((lead) => {
    const id = safeStr(lead?.id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * @param {string} leadId
 */
export function getLeadScore(leadId) {
  const lead = listLeads().find((l) => safeStr(l.id) === safeStr(leadId));
  if (!lead) return null;
  return {
    lead_id: lead.id,
    score: lead.score ?? null,
    match: lead.match ?? null,
  };
}

/** Client-facing copy guard — forbidden internal terms. */
export const LUXE_MAURICE_AI_FORBIDDEN_COPY = Object.freeze([
  'GitHub',
  'Cursor',
  'Supabase',
  'service_role',
  'CorpFlowAI',
  'audit',
  'recovery roadmap',
  'CMP',
]);

/**
 * @param {string} text
 */
export function luxeMauriceAiCopyAuditGuard(text) {
  const hay = safeStr(text);
  const patterns = [
    /\bGitHub\b/,
    /\bCursor\b/,
    /\bSupabase\b/,
    /\bservice_role\b/i,
    /\bCorpFlowAI\b/,
    /\baudit\b/i,
    /recovery roadmap/i,
  ];
  const hits = patterns.filter((p) => p.test(hay)).map(String);
  return { ok: hits.length === 0, hits };
}
