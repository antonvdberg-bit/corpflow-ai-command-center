import React from 'react';

import {
  LUXE_MAURICE_BRAND_TOKENS as T,
  LUXE_MAURICE_BRAND_SIGNATURE,
} from '../lib/client/luxe-maurice-brand-theme.js';

/**
 * LuxeMaurice brand primitives — monogram, wordmark, font stylesheet hint.
 *
 * Authoritative against the **LuxeMaurice brand guideline** approved by the
 * client on 2026-06-11 (see `docs/LUX/LUXEMAURICE_STRATEGIC_VISION_2030.md`
 * and the matching brand presentation deck). Used exclusively by the Lux
 * public surfaces (`pages/index.js` Lux branch, `pages/concierge.js`,
 * `components/LuxeMauricePropertiesDirectory.js`,
 * `components/LuxeMauricePropertyDetailPage.js`). Other tenants render
 * `TenantSite` and never reach these primitives.
 */

/**
 * Cormorant Garamond is loaded from Google Fonts only when a Lux public
 * surface mounts. Inter is already self-hosted globally via
 * `pages/_document.js` so no additional load is required here. The
 * stylesheet is **scoped to the Lux tenant only** by placing the
 * `<link>` element inside each Lux page's `<Head>`, which means no
 * apex / core / other tenant ever fetches the additional file.
 *
 * `preconnect` is emitted alongside the stylesheet to overlap the
 * TLS / DNS handshake with the CSS download.
 *
 * Visual fallbacks (`Georgia`, `serif`) are explicitly listed in
 * `LUXE_MAURICE_BRAND_TOKENS.fontDisplay` so first paint always shows
 * a serif (FOIT-free) and Cormorant swaps in once it lands.
 */
export function LuxeMauriceFontStylesheet() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap"
      />
    </>
  );
}

/**
 * LuxeMaurice monogram — geometric, hairline. Interpretation of the
 * brand-guideline mark: two diagonal "M" peaks with intersecting "W"
 * interior diagonals, forming an angular crown silhouette. Stroke uses
 * `currentColor`, so the monogram inherits the brand-gold colour from
 * whatever wraps it.
 *
 * The mark is intentionally minimal — luxury editorial brands (Aman,
 * Sotheby's Private Office, Four Seasons Private Residences) all favour
 * geometric, low-detail marks. Heavier lines or extra ornament would
 * read as decorative rather than confident.
 *
 * @param {{ size?: number, color?: string, title?: string }} props
 */
export function LuxeMauriceMonogram({
  size = 44,
  color = T.gold,
  title = 'LuxeMaurice monogram',
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      style={{ color, display: 'block' }}
    >
      <title>{title}</title>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        {/* Outer angular "M" frame */}
        <path d="M 8 54 L 8 12 L 32 42 L 56 12 L 56 54" />
        {/* Inner "W" diagonals that meet the centre apex */}
        <path d="M 16 54 L 32 34 L 48 54" />
        {/* Centre hairline rising through the crown */}
        <path d="M 32 42 L 32 22" strokeOpacity="0.7" />
      </g>
    </svg>
  );
}

/**
 * Full LuxeMaurice wordmark plate — monogram + wordmark + signature.
 *
 * `variant`:
 *   - `'compact'`  Header / navigation use. Monogram + LUXEMAURICE on one row.
 *   - `'stacked'`  Hero / footer use. Monogram above wordmark above signature.
 *   - `'small'`    Inline trust marks, footer credit.
 *
 * `tone`:
 *   - `'ivory'`    Light wordmark on dark plates (hero, header, footer).
 *   - `'charcoal'` Dark wordmark on ivory plates (Strategic Base / Private
 *                   Opportunities ivory band).
 */
export function LuxeMauriceWordmark({
  variant = 'compact',
  tone = 'ivory',
  showSignature = true,
  href = null,
}) {
  const isDarkPlate = tone === 'ivory';
  const wordmarkColor = isDarkPlate ? T.ivory : T.charcoal;
  const signatureColor = T.gold;
  const monogramColor = T.gold;

  const wordmarkSize =
    variant === 'stacked' ? 26 : variant === 'small' ? 13 : 16;
  const monogramSize =
    variant === 'stacked' ? 58 : variant === 'small' ? 22 : 36;
  // Letter-spacing collapses at narrower wordmark sizes so the wordmark
  // still fits on a 390px-wide mobile viewport without horizontal scroll.
  const wordmarkTrack =
    variant === 'stacked' ? '0.34em' : '0.32em';

  const inner = (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: variant === 'stacked' ? 'column' : 'row',
        alignItems: variant === 'stacked' ? 'center' : 'center',
        gap: variant === 'stacked' ? 18 : 12,
        textDecoration: 'none',
        color: wordmarkColor,
      }}
    >
      <LuxeMauriceMonogram size={monogramSize} color={monogramColor} />
      <span
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: variant === 'stacked' ? 'center' : 'flex-start',
          gap: variant === 'stacked' ? 12 : 2,
        }}
      >
        <span
          style={{
            fontFamily: T.fontDisplay,
            fontSize: wordmarkSize,
            fontWeight: 500,
            color: wordmarkColor,
            letterSpacing: wordmarkTrack,
            textTransform: 'uppercase',
            lineHeight: 1,
            paddingLeft: wordmarkTrack,
            paddingRight: 0,
          }}
        >
          LuxeMaurice
        </span>
        {showSignature ? (
          <span
            style={{
              fontFamily: T.fontBody,
              fontSize: variant === 'stacked' ? 11 : 9.5,
              fontWeight: 600,
              color: signatureColor,
              letterSpacing: '0.34em',
              textTransform: 'uppercase',
              lineHeight: 1.4,
              paddingLeft: variant === 'stacked' ? '0.34em' : '0.34em',
            }}
          >
            {LUXE_MAURICE_BRAND_SIGNATURE}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return inner;
  return (
    <a
      href={href}
      style={{ display: 'inline-flex', textDecoration: 'none' }}
      aria-label="LuxeMaurice — Private Wealth & Lifestyle Platform"
    >
      {inner}
    </a>
  );
}

/**
 * Small editorial eyebrow — gold letterspaced uppercase label. Used
 * throughout the public surfaces as the kicker above serif headings.
 *
 * Centralised here so every Lux page emits the exact same eyebrow shape
 * and so brand-fidelity tests have a single anchor point.
 */
export function LuxEyebrow({ children, tone = 'ivory', center = false }) {
  const color = tone === 'ivory' ? T.gold : T.goldDeep;
  return (
    <span
      style={{
        display: 'block',
        fontFamily: T.fontBody,
        fontSize: 10.5,
        fontWeight: 700,
        color,
        letterSpacing: '0.36em',
        textTransform: 'uppercase',
        textAlign: center ? 'center' : 'left',
      }}
    >
      {children}
    </span>
  );
}

/**
 * Gold hairline divider — replaces hard borders in the editorial layout.
 */
export function LuxHairline({ tone = 'gold', vertical = false, length = '100%' }) {
  const bg =
    tone === 'gold'
      ? T.hairline
      : tone === 'ivory'
        ? T.hairlineSoft
        : T.hairlineStone;
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        background: bg,
        ...(vertical
          ? { width: 1, height: length }
          : { width: length, height: 1 }),
      }}
    />
  );
}
