/**
 * Shared WhatsApp `wa.me` URL primitive (#1137).
 *
 * Used by WhatsApp Tier 1 and by Café International takeaway/menu links
 * (`cafeInternationalWhatsAppHref`). Deep links only — no API/send runtime.
 */

export const WHATSAPP_ME_ORIGIN = 'https://wa.me';

const E164_MIN_DIGITS = 8;
const E164_MAX_DIGITS = 15;

/**
 * Strip a phone / wa.me / tel value to country-code + subscriber digits.
 * Does not validate. Used by the Café International href helper.
 *
 * @param {unknown} input
 * @returns {string}
 */
export function normalizeWhatsAppDigits(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const fromUrl = raw.match(
    /(?:wa\.me\/|web\.whatsapp\.com\/send\?phone=|whatsapp:\/\/send\?phone=)(\+?\d[\d\s-]*)/i,
  );
  const source = fromUrl ? fromUrl[1] : raw.replace(/^tel:/i, '');
  return source.replace(/\D/g, '');
}

/**
 * Strict business-number check for tenant catalog values.
 * Accepts E.164-ish input (`+230 5765 8735`) or digit strings with a country code.
 * Rejects empty, local-only (leading 0 after strip), and non-E.164 lengths.
 *
 * @param {unknown} input
 * @returns {{ ok: true, digits: string, e164: string } | { ok: false, reason: string }}
 */
export function validateWhatsAppBusinessPhone(input) {
  const raw = String(input || '').trim();
  if (!raw) return { ok: false, reason: 'missing_phone' };
  if (/[A-Za-z]/.test(raw) && !/wa\.me|whatsapp|tel:/i.test(raw)) {
    return { ok: false, reason: 'letters_not_allowed' };
  }
  const digits = normalizeWhatsAppDigits(raw);
  if (!digits) return { ok: false, reason: 'missing_phone' };
  if (digits.startsWith('0')) return { ok: false, reason: 'missing_country_code' };
  if (digits.length < E164_MIN_DIGITS) return { ok: false, reason: 'too_short' };
  if (digits.length > E164_MAX_DIGITS) return { ok: false, reason: 'too_long' };
  return { ok: true, digits, e164: `+${digits}` };
}

/**
 * Encode a prefilled WhatsApp message for a `text=` query value.
 * Empty / whitespace-only messages encode to an empty string (caller omits `text`).
 *
 * @param {unknown} message
 * @returns {string}
 */
export function encodeWhatsAppPrefill(message) {
  const text = String(message || '').trim();
  if (!text) return '';
  return encodeURIComponent(text);
}

/**
 * Build a canonical `https://wa.me/<digits>?text=` URL.
 * Lenient on the phone (digits only) so existing Café International links stay stable.
 *
 * @param {unknown} phone
 * @param {unknown} [prefill]
 * @returns {string}
 */
export function buildWhatsAppMeHref(phone, prefill) {
  const digits = normalizeWhatsAppDigits(phone);
  const encoded = encodeWhatsAppPrefill(prefill);
  if (encoded) return `${WHATSAPP_ME_ORIGIN}/${digits}?text=${encoded}`;
  return `${WHATSAPP_ME_ORIGIN}/${digits}`;
}

/**
 * Normalize a phone, `tel:`, or WhatsApp URL into a canonical `https://wa.me/…` href.
 *
 * @param {unknown} input
 * @param {unknown} [prefill]
 * @returns {string}
 */
export function normalizeWhatsAppMeUrl(input, prefill) {
  const raw = String(input || '').trim();
  let message = prefill;
  if (message == null) {
    try {
      const url = new URL(raw);
      if (url.searchParams.has('text')) message = url.searchParams.get('text');
    } catch {
      const textMatch = raw.match(/[?&]text=([^&]*)/);
      if (textMatch) {
        try {
          message = decodeURIComponent(textMatch[1].replace(/\+/g, ' '));
        } catch {
          message = textMatch[1];
        }
      }
    }
  }
  return buildWhatsAppMeHref(raw, message);
}
