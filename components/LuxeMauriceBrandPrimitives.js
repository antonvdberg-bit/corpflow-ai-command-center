import React from 'react';

import {
  LUXE_MAURICE_BRAND_TOKENS as T,
  LUXE_MAURICE_BRAND_SIGNATURE,
} from '../lib/client/luxe-maurice-brand-theme.js';

/**
 * LuxeMaurice brand primitives - monogram, wordmark, font stylesheet hint.
 *
 * Used exclusively by the Lux public surfaces (`pages/index.js` Lux branch,
 * `pages/concierge.js`, `components/LuxeMauricePropertiesDirectory.js`,
 * `components/LuxeMauricePropertyDetailPage.js`). Other tenants render
 * `TenantSite` and never reach these primitives.
 *
 * Jan supplied a new Rare & Exclusive Collection logo by email on 2026-07-27
 * (subject: "new logo to be incorporated"). Until a production vector pack is
 * supplied, this file reproduces the supplied mark as a scalable in-repo SVG
 * using the approved brand tokens, avoiding binary email assets and keeping the
 * tenant presentation deterministic.
 */

/**
 * Cormorant Garamond is loaded from Google Fonts only when a Lux public
 * surface mounts. Inter is already self-hosted globally via
 * `pages/_document.js` so no additional load is required here. The
 * stylesheet is scoped to the Lux tenant only by placing the
 * `<link>` element inside each Lux page's `<Head>`, which means no
 * apex / core / other tenant ever fetches the additional file.
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

function ReLogoSvg({
  width = 360,
  color = T.charcoal,
  gold = T.gold,
  showWordmark = true,
  showStrapline = false,
  title = 'Rare & Exclusive Collection logo',
}) {
  const height = showWordmark ? (showStrapline ? 250 : 205) : 120;
  const viewBox = `0 0 360 ${height}`;

  return (
    <svg
      width={width}
      height="auto"
      viewBox={viewBox}
      role="img"
      aria-label={title}
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      <title>{title}</title>

      <g fontFamily={T.fontDisplay} fontWeight="500" textAnchor="middle">
        <text
          x="158"
          y="82"
          fontSize="96"
          fill={color}
          letterSpacing="-0.035em"
        >
          R
        </text>
        <text
          x="196"
          y="102"
          fontSize="68"
          fill={gold}
          letterSpacing="-0.045em"
        >
          &amp;
        </text>
        <text
          x="224"
          y="92"
          fontSize="82"
          fill={gold}
          letterSpacing="-0.05em"
        >
          E
        </text>
      </g>

      {showWordmark ? (
        <g textAnchor="middle">
          <text
            x="180"
            y="145"
            fontFamily={T.fontDisplay}
            fontSize="34"
            fontWeight="500"
            fill={color}
            letterSpacing="0.32em"
          >
            RARE <tspan fill={gold} letterSpacing="0.18em">&amp;</tspan> EXCLUSIVE
          </text>
          <line x1="36" y1="174" x2="112" y2="174" stroke={gold} strokeWidth="1" />
          <text
            x="180"
            y="181"
            fontFamily={T.fontDisplay}
            fontSize="22"
            fontWeight="500"
            fill={gold}
            letterSpacing="0.42em"
          >
            COLLECTION
          </text>
          <line x1="248" y1="174" x2="324" y2="174" stroke={gold} strokeWidth="1" />
          {showStrapline ? (
            <>
              <line x1="136" y1="212" x2="164" y2="212" stroke={gold} strokeWidth="1" />
              <text
                x="180"
                y="218"
                fontFamily={T.fontDisplay}
                fontSize="20"
                fill={gold}
              >
                ◆
              </text>
              <line x1="196" y1="212" x2="224" y2="212" stroke={gold} strokeWidth="1" />
              <text
                x="180"
                y="242"
                fontFamily={T.fontBody}
                fontSize="9"
                fontWeight="500"
                fill={color}
                letterSpacing="0.34em"
              >
                RARE BY NATURE. EXCLUSIVE BY DESIGN.
              </text>
            </>
          ) : null}
        </g>
      ) : null}
    </svg>
  );
}

/**
 * Rare & Exclusive monogram based on Jan's supplied R&E logo.
 *
 * @param {{ size?: number, color?: string, title?: string }} props
 */
export function LuxeMauriceMonogram({
  size = 44,
  color = T.charcoal,
  title = 'Rare & Exclusive Collection monogram',
}) {
  return (
    <ReLogoSvg
      width={size}
      color={color}
      gold={T.gold}
      showWordmark={false}
      title={title}
    />
  );
}

/**
 * Full Rare & Exclusive Collection wordmark plate.
 *
 * `variant`:
 *   - 'compact'  Header / navigation use.
 *   - 'stacked'  Hero / footer use.
 *   - 'small'    Inline trust marks, footer credit.
 *
 * `tone`:
 *   - 'ivory'    Light wordmark on dark plates.
 *   - 'charcoal' Dark wordmark on ivory plates.
 */
export function LuxeMauriceWordmark({
  variant = 'compact',
  tone = 'ivory',
  showSignature = true,
  href = null,
}) {
  const isDarkPlate = tone === 'ivory';
  const wordmarkColor = isDarkPlate ? T.ivory : T.charcoal;
  const logoGold = isDarkPlate ? T.gold : T.goldDeep;
  const logoWidth = variant === 'stacked' ? 330 : variant === 'small' ? 145 : 230;
  const showStrapline = variant === 'stacked' && showSignature;

  const inner = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: variant === 'stacked' ? 'center' : 'flex-start',
        textDecoration: 'none',
        color: wordmarkColor,
        lineHeight: 1,
      }}
    >
      <ReLogoSvg
        width={logoWidth}
        color={wordmarkColor}
        gold={logoGold}
        showWordmark
        showStrapline={showStrapline}
        title="Rare & Exclusive Collection logo"
      />
      {variant !== 'stacked' && showSignature ? (
        <span
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
          }}
        >
          {LUXE_MAURICE_BRAND_SIGNATURE}
        </span>
      ) : null}
    </span>
  );

  if (!href) return inner;
  return (
    <a
      href={href}
      style={{ display: 'inline-flex', textDecoration: 'none' }}
      aria-label="Rare & Exclusive Collection - Private Wealth & Lifestyle Platform for Mauritius"
    >
      {inner}
    </a>
  );
}

/**
 * Small editorial eyebrow - gold letterspaced uppercase label. Used
 * throughout the public surfaces as the kicker above serif headings.
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
 * Gold hairline divider - replaces hard borders in the editorial layout.
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
