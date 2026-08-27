/**
 * Safe-claims and privacy scanners for Video Spec + QC fixtures (#1143).
 * Deterministic regexes only — no model calls.
 */

import {
  FICTIONAL_DEMO_BUSINESS,
  FORBIDDEN_RECORDING_URL,
  FORBIDDEN_RECORDING_PATH,
  PRIMARY_CTA,
  PRODUCT_NAME,
  SKU_TITLE,
} from './constants.js';

const FORBIDDEN_CLAIM_PATTERNS = [
  { id: 'guaranteed_revenue', re: /\bguaranteed (more )?(sales|revenue|leads|enquiries)\b/i },
  { id: 'never_miss', re: /\bnever miss (a )?(lead|enquiry|sale)\b/i },
  { id: 'automated_revenue_machine', re: /\bfully automated revenue\b/i },
  { id: 'replaces_team', re: /\breplaces? your (sales )?team\b/i },
  { id: 'ten_x', re: /\b10x\b/i },
  { id: 'choose_payment_path', re: /choose payment path/i },
  { id: 'invented_testimonial', re: /\b(our clients say|five-star review from)\b/i },
];

const PRIVACY_PATTERNS = [
  { id: 'telegram_id', re: /\b(chat_id|telegram[_ ]?id)\b/i },
  { id: 'tenant_id', re: /\btenant_id\b/i },
  { id: 'private_email', re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
];

const ALLOWED_EMAILS = new Set(['support@corpflowai.com']);

function collectText(parts) {
  return parts.filter(Boolean).join('\n');
}

/**
 * @param {string} text
 * @returns {{ id: string, message: string }[]}
 */
export function findForbiddenClaims(text) {
  const hits = [];
  const source = String(text || '');
  for (const rule of FORBIDDEN_CLAIM_PATTERNS) {
    if (rule.re.test(source)) {
      hits.push({ id: rule.id, message: `Forbidden claim pattern: ${rule.id}` });
    }
  }
  return hits;
}

/**
 * @param {string} text
 * @returns {{ id: string, message: string }[]}
 */
export function findPrivacyViolations(text) {
  const hits = [];
  const source = String(text || '');
  for (const rule of PRIVACY_PATTERNS) {
    const match = source.match(rule.re);
    if (!match) continue;
    if (rule.id === 'private_email') {
      const email = String(match[0]).toLowerCase();
      if (ALLOWED_EMAILS.has(email) || email.endsWith('@example.invalid')) continue;
      hits.push({ id: rule.id, message: `Non-public email is not allowed in production copy (${email})` });
      continue;
    }
    hits.push({ id: rule.id, message: `Privacy violation: ${rule.id}` });
  }
  return hits;
}

export function specCopyCorpus(spec) {
  const scenes = Array.isArray(spec?.scenes) ? spec.scenes : [];
  const onScreen = Array.isArray(spec?.on_screen_text) ? spec.on_screen_text : [];
  return collectText([
    spec?.script?.full_text,
    spec?.cta?.spoken,
    spec?.cta?.label,
    spec?.youtube_metadata_draft?.title,
    spec?.youtube_metadata_draft?.description,
    spec?.thumbnail?.title_text,
    ...scenes.map((s) => s.spoken_text),
    ...scenes.map((s) => s.visual),
    ...onScreen.map((row) => row.text),
  ]);
}

export function findSkuTitleMisuse(text) {
  const source = String(text || '');
  if (new RegExp(`\\b${SKU_TITLE}\\b`, 'i').test(source)) {
    return [
      {
        id: 'sku_title_as_product',
        message: `Do not present ${SKU_TITLE} as the launch product name; use ${PRODUCT_NAME}`,
      },
    ];
  }
  return [];
}

export function findForbiddenRecordingUrl(text) {
  const source = String(text || '');
  if (source.includes(FORBIDDEN_RECORDING_URL) || source.includes(FORBIDDEN_RECORDING_PATH)) {
    return [
      {
        id: 'sku_alias_as_recording_url',
        message: `${FORBIDDEN_RECORDING_PATH} must not be used as the recording or CTA URL`,
      },
    ];
  }
  return [];
}

export function assertPrimaryCta(text) {
  return String(text || '').includes(PRIMARY_CTA);
}

export { FICTIONAL_DEMO_BUSINESS, FORBIDDEN_CLAIM_PATTERNS, PRIVACY_PATTERNS };
