/**
 * LuxeMaurice AI v2 preview data layer.
 *
 * Mode: seed / adapter — shapes extend artifacts/luxe-maurice-ai-db-delivery-pack/
 * with opportunity_category for private luxury access (residences + non-property).
 * No live Postgres or Supabase.
 */

/** @readonly */
export const LUXE_MAURICE_AI_PREVIEW_MODE = 'seed';

/** @readonly */
export const LUXE_MAURICE_AI_PREVIEW_VERSION = 'v2';

/** @readonly — matches seed.sql tenant row */
export const LUXE_MAURICE_AI_TENANT_ID = '11111111-1111-4111-8111-111111111111';

/** @readonly — v2 access categories for catalogue, wizard, and CRM */
export const LUXE_MAURICE_AI_ACCESS_CATEGORIES = Object.freeze([
  Object.freeze({ key: 'residence', label: 'Residences', short: 'Residence' }),
  Object.freeze({ key: 'yacht_marine', label: 'Yachts & marine', short: 'Yacht & marine' }),
  Object.freeze({ key: 'aviation_vip', label: 'Private aviation / VIP arrivals', short: 'Aviation & VIP' }),
  Object.freeze({ key: 'collector_asset', label: 'Collector assets', short: 'Collector asset' }),
  Object.freeze({ key: 'island_experience', label: 'Island experiences', short: 'Island experience' }),
  Object.freeze({ key: 'advisory_mandate', label: 'Advisory mandates', short: 'Advisory mandate' }),
]);

const STORAGE_KEY = 'luxe-maurice-ai-preview-enquiries-v2';

/** @type {Array<Record<string, unknown>>} */
const runtimeLeads = [];

/**
 * Seed catalogue — residences from v1 plus non-property luxury access opportunities.
 * @type {Array<Record<string, unknown>>}
 */
const SEED_OPPORTUNITIES = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    tenant_id: LUXE_MAURICE_AI_TENANT_ID,
    slug: 'sample-coastal-residence',
    title: 'Sample Coastal Residence — Black River',
    summary: 'Private residence opportunity on the West Coast.',
    description:
      'A curated private residence memorandum for discreet acquisition discussions. Preview copy only — not a public listing.',
    opportunity_category: 'residence',
    property_type: 'private_opportunity',
    status: 'published',
    region_label: 'Black River',
    location_label: 'West Coast, Mauritius',
    price_label: 'Price on application',
    access_model: 'Private introduction · off-market',
    availability: 'By appointment',
    currency_code: 'USD',
    bedrooms: 4,
    bathrooms: 4.5,
    area_sqm: 420,
    published_at: '2026-07-01T10:00:00.000Z',
    hero_image: {
      storage_path: 'demo/sample-coastal-residence/hero.jpg',
      alt_text: 'Coastal residence — preview',
    },
    gallery: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        storage_path: 'demo/sample-coastal-residence/hero.jpg',
        sort_order: 0,
        alt_text: 'Coastal residence — main view',
      },
    ],
  },
  {
    id: '44444444-4444-4444-8444-444444444445',
    tenant_id: LUXE_MAURICE_AI_TENANT_ID,
    slug: 'lagoon-villa-estate',
    title: 'Lagoon Villa Estate — Grand Baie',
    summary: 'Island villa estate with private mooring access.',
    description:
      'A discreet lagoon-front residence for long-stay lifestyle and private entertaining. Preview copy only.',
    opportunity_category: 'residence',
    property_type: 'private_opportunity',
    status: 'published',
    region_label: 'Grand Baie',
    location_label: 'North, Mauritius',
    price_label: 'From USD 2.8M',
    access_model: 'Qualified buyer introduction',
    availability: 'Q3–Q4 viewing windows',
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
    id: '44444444-4444-4444-8444-444444444447',
    tenant_id: LUXE_MAURICE_AI_TENANT_ID,
    slug: 'private-yacht-lagoon-charter',
    title: 'Private Yacht Charter — Lagoon & Offshore',
    summary: 'Crewed motor yacht access with lagoon mooring and offshore day passages.',
    description:
      'Discreet charter access for principals who want marine mobility without public brokerage exposure. Includes crew, provisioning coordination, and private berth introductions.',
    opportunity_category: 'yacht_marine',
    property_type: 'private_access',
    status: 'published',
    region_label: 'Grand Baie · Le Morne',
    location_label: 'North & West Coast waters',
    price_label: 'From USD 18,000 / week · access on application',
    access_model: 'Member introduction · seasonal charter',
    availability: 'May–October · limited slots',
    capacity_note: 'Up to 8 guests · 42m motor yacht class',
    currency_code: 'USD',
    published_at: '2026-07-03T11:00:00.000Z',
    hero_image: {
      storage_path: 'demo/private-yacht-lagoon-charter/hero.jpg',
      alt_text: 'Private yacht — preview',
    },
    gallery: [
      {
        id: '55555555-5555-4555-8555-555555555559',
        storage_path: 'demo/private-yacht-lagoon-charter/hero.jpg',
        sort_order: 0,
        alt_text: 'Yacht on lagoon',
      },
    ],
  },
  {
    id: '44444444-4444-4444-8444-444444444448',
    tenant_id: LUXE_MAURICE_AI_TENANT_ID,
    slug: 'vip-arrival-aviation-service',
    title: 'VIP Arrival — Private Aviation & Ground Transfer',
    summary: 'Seamless FBO-to-residence arrival for principals and family offices.',
    description:
      'Coordinated private aviation handling, customs facilitation, and secure ground transfer to your residence, yacht, or island experience. Preview service shape only.',
    opportunity_category: 'aviation_vip',
    property_type: 'private_access',
    status: 'published',
    region_label: 'SSR International',
    location_label: 'Mauritius · Indian Ocean hub',
    price_label: 'Indicative from USD 12,000 / arrival',
    access_model: 'On-demand · advisor-coordinated',
    availability: '24–72h lead time',
    capacity_note: 'Light jet to ultra-long-range · up to 14 pax ground party',
    currency_code: 'USD',
    published_at: '2026-07-02T09:30:00.000Z',
    hero_image: {
      storage_path: 'demo/vip-arrival-aviation-service/hero.jpg',
      alt_text: 'Private aviation arrival — preview',
    },
    gallery: [],
  },
  {
    id: '44444444-4444-4444-8444-444444444449',
    tenant_id: LUXE_MAURICE_AI_TENANT_ID,
    slug: 'bespoke-island-experience-collector',
    title: 'Bespoke Island Week — Collector Drive & Private Table',
    summary: 'Curated week combining collector vehicle access and private chef island dinner.',
    description:
      'A signature island experience: classic collector vehicle access for coastal drives, private helipad lunch, and an off-grid chef table for eight. Not a packaged tour — an advisory introduction.',
    opportunity_category: 'island_experience',
    property_type: 'private_access',
    status: 'published',
    region_label: 'South Coast · Le Morne',
    location_label: 'Mauritius · bespoke routing',
    price_label: 'From USD 45,000 · experience access',
    access_model: 'Invitation-only · principal + guests',
    availability: 'Limited dates · advisor confirmation',
    capacity_note: 'Up to 8 guests · 3-night minimum',
    currency_code: 'USD',
    published_at: '2026-06-28T08:00:00.000Z',
    hero_image: {
      storage_path: 'demo/bespoke-island-experience-collector/hero.jpg',
      alt_text: 'Island experience — preview',
    },
    gallery: [],
  },
];

/** @type {Array<Record<string, unknown>>} */
const SEED_LEADS = [
  {
    id: '88888888-8888-4888-8888-888888888888',
    status: 'new',
    buyer: {
      full_name: 'Sample Principal',
      email: 'buyer.demo@example.invalid',
      phone: '+230-0000-0000',
    },
    opportunity: {
      id: '44444444-4444-4444-8444-444444444444',
      slug: 'sample-coastal-residence',
      title: 'Sample Coastal Residence — Black River',
      category: 'residence',
    },
    property: {
      id: '44444444-4444-4444-8444-444444444444',
      slug: 'sample-coastal-residence',
      title: 'Sample Coastal Residence — Black River',
    },
    access_category: 'residence',
    access_intent: 'Acquisition · 6–12 months',
    profile: {
      budget_min: 1500000,
      budget_max: 3500000,
      currency_code: 'USD',
      timeline: '6-12 months',
    },
    requirements: [
      { key: 'region', value: 'West Coast', priority: 'must_have' },
      { key: 'category', value: 'Residences', priority: 'must_have' },
    ],
    score: { score: 72.5, score_band: 'warm', rationale: 'Budget fit + region match + completed request' },
    match: {
      property_id: '44444444-4444-4444-8444-444444444444',
      match_score: 81,
      match_reason: 'Region and budget alignment',
      status: 'shortlisted',
    },
    next_action: 'Schedule private consultation',
    created_at: '2026-07-05T14:30:00.000Z',
  },
  {
    id: '88888888-8888-4888-8888-888888888889',
    status: 'contacted',
    buyer: {
      full_name: 'Marine Access Guest',
      email: 'marine.demo@example.invalid',
      phone: null,
    },
    opportunity: {
      id: '44444444-4444-4444-8444-444444444447',
      slug: 'private-yacht-lagoon-charter',
      title: 'Private Yacht Charter — Lagoon & Offshore',
      category: 'yacht_marine',
    },
    property: {
      id: '44444444-4444-4444-8444-444444444447',
      slug: 'private-yacht-lagoon-charter',
      title: 'Private Yacht Charter — Lagoon & Offshore',
    },
    access_category: 'yacht_marine',
    access_intent: 'Charter · July window',
    profile: {
      budget_min: 18000,
      budget_max: 45000,
      currency_code: 'USD',
      timeline: 'Ready within 3 months',
    },
    requirements: [
      { key: 'region', value: 'North & West Coast waters', priority: 'must_have' },
      { key: 'category', value: 'Yachts & marine', priority: 'must_have' },
    ],
    score: { score: 78, score_band: 'warm', rationale: 'Seasonal fit + budget band confirmed' },
    match: {
      property_id: '44444444-4444-4444-8444-444444444447',
      match_score: 85,
      match_reason: 'Charter window and guest count alignment',
      status: 'shortlisted',
    },
    next_action: 'Confirm crew availability',
    created_at: '2026-07-06T10:00:00.000Z',
  },
];

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

export function getCategoryLabel(categoryKey) {
  const key = safeStr(categoryKey);
  const found = LUXE_MAURICE_AI_ACCESS_CATEGORIES.find((c) => c.key === key);
  return found ? found.label : key || 'Private access';
}

export function getCategoryShortLabel(categoryKey) {
  const key = safeStr(categoryKey);
  const found = LUXE_MAURICE_AI_ACCESS_CATEGORIES.find((c) => c.key === key);
  return found ? found.short : key || 'Access';
}

export function isResidenceCategory(categoryKey) {
  return safeStr(categoryKey) === 'residence';
}

function publishedOpportunities() {
  return SEED_OPPORTUNITIES.filter((p) => p.status === 'published');
}

function opportunityListingShape(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    region_label: row.region_label,
    location_label: row.location_label,
    price_label: row.price_label,
    status: row.status,
    opportunity_category: row.opportunity_category,
    category_label: getCategoryShortLabel(row.opportunity_category),
    access_model: row.access_model ?? null,
    availability: row.availability ?? null,
    bedrooms: row.bedrooms ?? null,
    bathrooms: row.bathrooms ?? null,
    hero_image: row.hero_image ?? null,
    published_at: row.published_at ?? null,
  };
}

function findOpportunityRef(ref) {
  const key = safeStr(ref).toLowerCase();
  if (!key) return null;
  return (
    SEED_OPPORTUNITIES.find((p) => safeStr(p.id).toLowerCase() === key) ||
    SEED_OPPORTUNITIES.find((p) => safeStr(p.slug).toLowerCase() === key) ||
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
    /* preview-only */
  }
}

function newUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `preview-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function recommendNextAction(categoryKey, scoreBand) {
  if (scoreBand === 'hot') return 'Priority advisor call within 24h';
  if (categoryKey === 'yacht_marine') return 'Confirm seasonal availability';
  if (categoryKey === 'aviation_vip') return 'Coordinate arrival window';
  if (categoryKey === 'advisory_mandate') return 'Scope mandate with lead advisor';
  return 'Schedule private consultation';
}

/**
 * @returns {Array<ReturnType<typeof opportunityListingShape>>}
 */
export function listProperties() {
  return publishedOpportunities()
    .map(opportunityListingShape)
    .sort((a, b) => {
      const ta = a.published_at ? Date.parse(a.published_at) : 0;
      const tb = b.published_at ? Date.parse(b.published_at) : 0;
      return tb - ta;
    });
}

/** Alias for v2 semantics */
export const listOpportunities = listProperties;

/**
 * @param {string} id — UUID or slug
 */
export function getPropertyById(id) {
  const row = findOpportunityRef(id);
  if (!row || row.status !== 'published') return null;

  const isResidence = isResidenceCategory(row.opportunity_category);

  return {
    property: opportunityListingShape(row),
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    documents: [],
    detail: {
      description: row.description,
      opportunity_category: row.opportunity_category,
      category_label: getCategoryLabel(row.opportunity_category),
      property_type: row.property_type,
      access_model: row.access_model ?? null,
      availability: row.availability ?? null,
      capacity_note: row.capacity_note ?? null,
      bedrooms: isResidence ? (row.bedrooms ?? null) : null,
      bathrooms: isResidence ? (row.bathrooms ?? null) : null,
      area_sqm: isResidence ? (row.area_sqm ?? null) : null,
      currency_code: row.currency_code ?? 'USD',
    },
  };
}

/** Alias for v2 semantics */
export const getOpportunityById = getPropertyById;

/**
 * @param {{
 *   full_name: string,
 *   email: string,
 *   phone?: string,
 *   budget_min?: number | string,
 *   budget_max?: number | string,
 *   currency_code?: string,
 *   desired_location?: string,
 *   access_category?: string,
 *   property_type?: string,
 *   access_intent?: string,
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
  const opportunity = propertyId ? findOpportunityRef(propertyId) : null;
  const accessCategory =
    safeStr(payload?.access_category) ||
    (opportunity ? safeStr(opportunity.opportunity_category) : '') ||
    'advisory_mandate';
  const accessIntent = safeStr(payload?.access_intent || payload?.buying_intent);

  const buyerId = newUuid();
  const enquiryId = newUuid();
  const leadId = newUuid();
  const now = new Date().toISOString();

  const budgetMin = Number(payload?.budget_min) || null;
  const budgetMax = Number(payload?.budget_max) || null;
  const score = computePreviewScore({
    budgetMin,
    budgetMax,
    desiredLocation: payload?.desired_location,
    accessCategory,
  });

  const lead = {
    id: leadId,
    status: 'new',
    buyer: {
      full_name: fullName,
      email,
      phone: safeStr(payload?.phone) || null,
    },
    opportunity: opportunity
      ? {
          id: opportunity.id,
          slug: opportunity.slug,
          title: opportunity.title,
          category: opportunity.opportunity_category,
        }
      : null,
    property: opportunity
      ? { id: opportunity.id, slug: opportunity.slug, title: opportunity.title }
      : null,
    access_category: accessCategory,
    access_intent: accessIntent || null,
    profile: {
      budget_min: budgetMin,
      budget_max: budgetMax,
      currency_code: safeStr(payload?.currency_code) || 'USD',
      timeline: accessIntent || null,
    },
    requirements: [
      payload?.desired_location
        ? { key: 'region', value: safeStr(payload.desired_location), priority: 'must_have' }
        : null,
      accessCategory
        ? { key: 'category', value: getCategoryLabel(accessCategory), priority: 'must_have' }
        : null,
      payload?.property_type
        ? { key: 'preference', value: safeStr(payload.property_type), priority: 'should_have' }
        : null,
    ].filter(Boolean),
    score,
    match: opportunity
      ? {
          property_id: opportunity.id,
          match_score: score.score,
          match_reason: 'Preview rules: category, budget, and location alignment',
          status: 'suggested',
        }
      : null,
    next_action: recommendNextAction(accessCategory, score.score_band),
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

function computePreviewScore({ budgetMin, budgetMax, desiredLocation, accessCategory }) {
  let score = 55;
  if (budgetMin && budgetMax && budgetMax >= budgetMin) score += 15;
  if (safeStr(desiredLocation)) score += 10;
  if (accessCategory && accessCategory !== 'advisory_mandate') score += 5;
  score = Math.min(95, score);
  const band = score >= 80 ? 'hot' : score >= 65 ? 'warm' : 'cold';
  return {
    score,
    score_band: band,
    rationale: 'Preview rules_v2 scoring from access request fields',
  };
}

/**
 * Fixed demonstration rows for the advisor workspace (not persisted requests).
 * @returns {Array<Record<string, unknown>>}
 */
export function listDemonstrationAdvisorLeads() {
  return SEED_LEADS.map((lead) => ({
    ...lead,
    reference_id: null,
    persisted: false,
    demonstration: true,
  }));
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

/** Hero gradient placeholders keyed by slug — shared across preview surfaces */
export function previewHeroGradient(slug, fallback) {
  const palettes = {
    'sample-coastal-residence': 'linear-gradient(145deg, #2a2520 0%, #4a4034 45%, #1a1817 100%)',
    'lagoon-villa-estate': 'linear-gradient(145deg, #1e2a2e 0%, #3d5248 50%, #111111 100%)',
    'private-yacht-lagoon-charter': 'linear-gradient(145deg, #0f1a22 0%, #1a3a4a 45%, #111111 100%)',
    'vip-arrival-aviation-service': 'linear-gradient(145deg, #1a1a1f 0%, #2a2a35 50%, #0a0a0a 100%)',
    'bespoke-island-experience-collector':
      'linear-gradient(145deg, #252820 0%, #4a5238 50%, #0f0f0f 100%)',
  };
  return palettes[slug] || fallback || 'linear-gradient(135deg, #e8e0d4 0%, #d8cfc0 100%)';
}

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
    /property-only/i,
  ];
  const hits = patterns.filter((p) => p.test(hay)).map(String);
  return { ok: hits.length === 0, hits };
}
