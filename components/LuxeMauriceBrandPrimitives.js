import React from 'react';

import {
  LUXE_MAURICE_BRAND_TOKENS as T,
  LUXE_MAURICE_BRAND_SIGNATURE,
} from '../lib/client/luxe-maurice-brand-theme.js';

/**
 * Lux tenant brand primitives.
 *
 * Client-facing brand rename stage 1 (#619): display the temporary elegant
 * text-only Rare & Exclusive wordmark while keeping technical component and
 * tenant identifiers unchanged. Permanent logo / monogram work remains a
 * separate client approval gate.
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
 * Temporary text mark for the renamed client-facing brand.
 *
 * This intentionally avoids pretending that a final logo/monogram has been
 * approved. It is a refined serif text mark that can be used until Jan approves
 * the permanent visual identity.
 *
 * @param {{ size?: number, color?: string, title?: string }} props
 */
export function LuxeMauriceMonogram({
  size = 44,
  color = T.gold,
  title = 'Rare & Exclusive temporary text mark',
}) {
  const fontSize = Math.max(12, Math.round(size * 0.34));
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        color,
        fontFamily: T.fontDisplay,
        fontSize,
        fontWeight: 500,
        letterSpacing: '0.12em',
        lineHeight: 1,
        textTransform: 'uppercase',
        borderTop: `1px solid ${T.hairline}`,
        borderBottom: `1px solid ${T.hairline}`,
      }}
    >
      R&amp;E
    </span>
  );
}

/**
 * Temporary Rare & Exclusive wordmark plate.
 *
 * `variant`:
 *   - 'compact' Header / navigation use.
 *   - 'stacked' Hero / footer use.
 *   - 'small' Inline trust marks, footer credit.
 *
 * `tone`:
 *   - 'ivory' Light wordmark on dark plates.
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
  const signatureColor = T.gold;

  const wordmarkSize =
    variant === 'stacked' ? 28 : variant === 'small' ? 13 : 16;
  const wordmarkTrack = variant === 'stacked' ? '0.22em' : '0.18em';
  const sublineTrack = variant === 'stacked' ? '0.30em' : '0.24em';

  const inner = (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: variant === 'stacked' ? 'center' : 'flex-start',
        gap: variant === 'stacked' ? 12 : 4,
        textDecoration: 'none',
        color: wordmarkColor,
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
        }}
      >
        Rare &amp; Exclusive
      </span>
      {showSignature ? (
        <span
          style={{
            fontFamily: T.fontBody,
            fontSize: variant === 'stacked' ? 10.5 : 9,
            fontWeight: 600,
            color: signatureColor,
            letterSpacing: sublineTrack,
            textTransform: 'uppercase',
            lineHeight: 1.4,
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
 * Small editorial eyebrow — gold letterspaced uppercase label.
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
