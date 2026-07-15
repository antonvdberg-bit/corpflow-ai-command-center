/**
 * CorpFlowAI business brand asset paths and host emit policy.
 *
 * Icons live under /brand/corpflowai/ so browsers do not auto-fetch a root
 * favicon.ico on Core/tenant hosts. Markup that links these assets MUST call
 * shouldEmitCorpFlowBrandAssets(host) first.
 */

export const CORPFLOW_BRAND_THEME_COLOR = '#06111f';
export const CORPFLOW_BRAND_APPLICATION_NAME = 'CorpFlowAI';

export const CORPFLOW_BRAND_ASSET_PATHS = Object.freeze({
  markSvg: '/brand/corpflowai/corpflowai-mark.svg',
  markPng: '/brand/corpflowai/corpflowai-mark.png',
  faviconIco: '/brand/corpflowai/favicon.ico',
  favicon16: '/brand/corpflowai/favicon-16x16.png',
  favicon32: '/brand/corpflowai/favicon-32x32.png',
  appleTouchIcon: '/brand/corpflowai/apple-touch-icon.png',
  android192: '/brand/corpflowai/android-chrome-192x192.png',
  android512: '/brand/corpflowai/android-chrome-512x512.png',
  manifest: '/brand/corpflowai/site.webmanifest',
});

const ROOT = 'corpflowai.com';

/** Explicit business hosts that may render CorpFlowAI favicon / app metadata. */
const ALLOWED_EXACT = new Set(['corpflowai.com', 'www.corpflowai.com', 'localhost', '127.0.0.1']);

/**
 * Tenant / operator hosts that must never receive CorpFlowAI brand chrome.
 * Subdomains of corpflowai.com default to deny unless listed in ALLOWED_EXACT.
 */
const DENIED_SUBDOMAIN_PREFIXES = [
  'core',
  'lux',
  'luxe',
  'living-word',
  'living-word-mauritius',
  'aileadrescue',
  'admin',
  'factory',
  'api',
];

/**
 * @param {string | null | undefined} host
 * @returns {string}
 */
export function normalizeBrandHost(host) {
  return String(host || '')
    .trim()
    .toLowerCase()
    .split(',')[0]
    .trim()
    .replace(/:\d+$/, '');
}

/**
 * @param {string | null | undefined} host
 * @param {{ search?: string } | null | undefined} [opts]
 * @returns {boolean}
 */
export function shouldEmitCorpFlowBrandAssets(host, opts = null) {
  const h = normalizeBrandHost(host);
  if (!h) return false;

  if (ALLOWED_EXACT.has(h)) return true;

  // Unscoped Vercel preview: allow CorpFlowAI preview verification.
  // Signed tenant previews carry cf_preview — deny brand chrome there.
  if (h.endsWith('.vercel.app')) {
    const search = String(opts?.search || '');
    if (/(?:^|[?&])cf_preview=/.test(search)) return false;
    return true;
  }

  if (h === ROOT || h === `www.${ROOT}`) return true;

  if (h.endsWith(`.${ROOT}`)) {
    const sub = h.slice(0, -(ROOT.length + 1));
    if (!sub || sub === 'www') return true;
    // Any other subdomain (tenant or core) is denied by default.
    for (const prefix of DENIED_SUBDOMAIN_PREFIXES) {
      if (sub === prefix || sub.startsWith(`${prefix}.`)) return false;
    }
    return false;
  }

  return false;
}

/**
 * Head-tag descriptors for CorpFlowAI brand assets (no JSX).
 * @returns {Array<{ rel?: string, href?: string, type?: string, sizes?: string, name?: string, content?: string }>}
 */
export function listCorpFlowBrandHeadTags() {
  const p = CORPFLOW_BRAND_ASSET_PATHS;
  return [
    { rel: 'icon', href: p.faviconIco, sizes: 'any' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: p.favicon16 },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: p.favicon32 },
    { rel: 'apple-touch-icon', href: p.appleTouchIcon, sizes: '180x180' },
    { rel: 'manifest', href: p.manifest },
    { name: 'application-name', content: CORPFLOW_BRAND_APPLICATION_NAME },
    { name: 'apple-mobile-web-app-title', content: CORPFLOW_BRAND_APPLICATION_NAME },
    { name: 'theme-color', content: CORPFLOW_BRAND_THEME_COLOR },
  ];
}
