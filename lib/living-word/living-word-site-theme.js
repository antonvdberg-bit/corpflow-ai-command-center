/**
 * Living Word Mauritius — shared visual theme (client-safe).
 *
 * Palette aligned with the public church site at livingwordmauritius.com:
 * white/cream surfaces, navy headings, warm gold accents, royal-blue primary
 * actions (matches chat widget `brandAccent` and the live “Ask” control).
 *
 * The orange TEST ENVIRONMENT ribbon is intentionally separate — see
 * `lib/sandbox/test-environment-ribbon.js`.
 */

export const LIVING_WORD_THEME = Object.freeze({
  /** Primary actions — chat “Ask”, form submit, CTA buttons */
  primary: '#1E3A8A',
  primaryHover: '#1E40AF',
  /** Headings / nav — deep navy from sandbox facsimile */
  navy: '#0E1F3A',
  navyDeep: '#0A1830',
  navySoft: '#1E2F4D',
  /** Section accents from church pillar styling */
  gold: '#C9A961',
  goldSoft: '#E8D9A8',
  cream: '#F5F1EA',
  creamSoft: '#FAF7F1',
  white: '#FFFFFF',
  border: '#E5E0D5',
  text: '#1A1A1A',
  textMuted: '#6B6258',
  textOnDark: '#F5F1EA',
  textOnDarkMuted: '#B8B0A0',
});

/** @deprecated use LIVING_WORD_THEME — alias for existing imports */
export const COLOURS = LIVING_WORD_THEME;

export const LIVING_WORD_FONTS = Object.freeze({
  serif: 'Georgia, "Times New Roman", "PT Serif", Cambria, serif',
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
});

export const LIVING_WORD_CHAT_ACCENT = LIVING_WORD_THEME.primary;

export const LIVING_WORD_LOGO_PATH = '/assets/tenants/living-word-mauritius/living-word-church-logo.png';
