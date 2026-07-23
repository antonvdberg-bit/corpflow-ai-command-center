import React from 'react';

import {
  LUXE_MAURICE_BRAND_TOKENS as T,
  LUXE_MAURICE_BRAND_SIGNATURE,
} from '../lib/client/luxe-maurice-brand-theme.js';

/**
 * Lux tenant brand primitives.
 *
 * CLIENT TEST ENVIRONMENT RULE:
 * lux.corpflowai.com is the active client test surface for Rare & Exclusive
 * Collection. Client-approved visual changes may be published to this tenant
 * test surface directly when Anton instructs delivery. Technical tenant
 * identifiers and host mappings remain stable unless separately approved.
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

export function LuxeMauriceMonogram({
  size = 44,
  color = T.gold,
  title = 'Rare & Exclusive temporary mark',
}) {
  const fontSize = Math.max(10, Math.round(size * 0.18));
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
        letterSpacing: '0.18em',
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

export function RareExclusiveStackedWordmark({
  tone = 'charcoal',
  size = 'hero',
  align = 'center',
  showSignature = true,
}) {
  const isIvory = tone === 'ivory';
  const color = isIvory ? T.ivory : T.charcoal;
  const gold = T.gold;
  const wordSize = size === 'hero' ? 'clamp(3.4rem, 9vw, 7.8rem)' : size === 'small' ? 18 : 28;
  const ampSize = size === 'hero' ? 'clamp(1.8rem, 4vw, 3.2rem)' : size === 'small' ? 14 : 22;
  const signatureSize = size === 'hero' ? 11 : 9.5;

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: align === 'left' ? 'flex-start' : 'center',
        textAlign: align,
        color,
      }}
    >
      <span
        style={{
          fontFamily: T.fontDisplay,
          fontWeight: 400,
          fontSize: wordSize,
          lineHeight: 0.86,
          letterSpacing: size === 'hero' ? '0.16em' : '0.12em',
          textTransform: 'uppercase',
          paddingLeft: size === 'hero' ? '0.16em' : '0.12em',
        }}
      >
        Rare
      </span>
      <span
        aria-hidden="true"
        style={{
          margin: size === 'hero' ? '0.24em 0 0.16em' : '0.18em 0 0.12em',
          fontFamily: T.fontDisplay,
          fontWeight: 400,
          fontStyle: 'italic',
          fontSize: ampSize,
          lineHeight: 1,
          color: gold,
        }}
      >
        &amp;
      </span>
      <span
        style={{
          fontFamily: T.fontDisplay,
          fontWeight: 400,
          fontSize: wordSize,
          lineHeight: 0.86,
          letterSpacing: size === 'hero' ? '0.16em' : '0.12em',
          textTransform: 'uppercase',
          paddingLeft: size === 'hero' ? '0.16em' : '0.12em',
        }}
      >
        Exclusive
      </span>
      {showSignature ? (
        <span
          style={{
            marginTop: size === 'hero' ? 28 : 10,
            fontFamily: T.fontBody,
            fontSize: signatureSize,
            fontWeight: 700,
            letterSpacing: size === 'hero' ? '0.42em' : '0.24em',
            lineHeight: 1.4,
            color: gold,
            textTransform: 'uppercase',
          }}
        >
          {LUXE_MAURICE_BRAND_SIGNATURE}
        </span>
      ) : null}
    </span>
  );
}

export function LuxeMauriceWordmark({
  variant = 'compact',
  tone = 'ivory',
  showSignature = true,
  href = null,
}) {
  const mark = (
    <RareExclusiveStackedWordmark
      tone={tone}
      size={variant === 'stacked' ? 'medium' : variant === 'small' ? 'small' : 'small'}
      align={variant === 'stacked' ? 'center' : 'left'}
      showSignature={showSignature}
    />
  );

  if (!href) return mark;
  return (
    <a
      href={href}
      style={{ display: 'inline-flex', textDecoration: 'none' }}
      aria-label="Rare & Exclusive Collection - Private Wealth & Lifestyle Platform for Mauritius"
    >
      {mark}
    </a>
  );
}

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
