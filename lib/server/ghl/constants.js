/** Living Word GHL read-only probe v1 — tenant + API constants. */

export const GHL_LWM_TENANT_ID = 'living-word-mauritius';

export const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com';

export const GHL_API_VERSION_HEADER = '2021-07-28';

/** Maximum read-only outbound calls per probe run. */
export const GHL_PROBE_MAX_API_CALLS = 19;

/** Minimum delay between calls (ms) to respect burst limits. */
export const GHL_PROBE_INTER_CALL_DELAY_MS = 150;

export const GHL_ENV_LOCATION_ID = 'CORPFLOW_GHL_LIVING_WORD_MAURITIUS_LOCATION_ID';

export const GHL_ENV_PIT = 'CORPFLOW_GHL_LIVING_WORD_MAURITIUS_PIT';
