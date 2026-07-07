/**
 * Living Word Mauritius — shared visual theme (client-safe).
 *
 * Sourced from the public church site Elementor kit (livingwordmauritius.com):
 *   --e-global-color-primary:   #656565
 *   --e-global-color-secondary: #05D1B9
 *   --e-global-color-text:      #404040
 *   --e-global-color-accent:    #05A6C4
 *
 * The orange TEST ENVIRONMENT ribbon is intentionally separate — see
 * `lib/sandbox/test-environment-ribbon.js`.
 */

export const LIVING_WORD_THEME = Object.freeze({
  /** Elementor accent — primary CTAs and highlights */
  primary: '#05A6C4',
  primaryHover: '#0494AF',
  /** Elementor secondary teal */
  secondary: '#05D1B9',
  /** Elementor text / heading gray */
  heading: '#404040',
  muted: '#656565',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F7F7',
  border: '#E5E5E5',
  text: '#404040',
  textMuted: '#656565',
  white: '#FFFFFF',

  /**
   * Legacy token aliases used by `site-preview.js` and form pages.
   * Mapped to the live church palette (not navy/gold/cream).
   */
  navy: '#404040',
  navyDeep: '#404040',
  navySoft: '#656565',
  gold: '#05A6C4',
  goldSoft: '#E8F8F5',
  cream: '#FFFFFF',
  creamSoft: '#F7F7F7',
  textOnDark: '#404040',
  textOnDarkMuted: '#656565',
});

/** @deprecated use LIVING_WORD_THEME */
export const COLOURS = LIVING_WORD_THEME;

export const LIVING_WORD_FONTS = Object.freeze({
  serif: '"Helvetica", Arial, sans-serif',
  sans: '"Lato", "Montserrat", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
});

/** Chat widget keeps royal blue in DB; site surfaces use Elementor accent above. */
export const LIVING_WORD_CHAT_ACCENT = '#1E3A8A';

export const LIVING_WORD_LOGO_PATH = '/assets/tenants/living-word-mauritius/living-word-church-logo.png';
