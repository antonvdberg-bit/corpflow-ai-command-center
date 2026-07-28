import React from 'react';

import {
  LUXE_MAURICE_BRAND_TOKENS as T,
  LUXE_MAURICE_BRAND_SIGNATURE,
} from '../lib/client/luxe-maurice-brand-theme.js';
import {
  RareExclusiveFullLockup,
  RareExclusiveHorizontalWordmark,
  RareExclusiveMonogram,
} from './RareExclusiveBrandMarks.js';

/**
 * LuxeMaurice / Rare & Exclusive brand primitives.
 *
 * Used exclusively by Lux public surfaces. Other tenants never reach these.
 *
 * Jan-approved logo set (2026-07-27) is implemented in
 * `RareExclusiveBrandMarks.js` and re-exported here for existing call sites:
 * - monogram → RareExclusiveMonogram
 * - horizontalWordmark → RareExclusiveHorizontalWordmark (header)
 * - fullLockup → RareExclusiveFullLockup (hero / footer)
 */

/**
 * Cormorant Garamond is loaded from Google Fonts only when a Lux public
 * surface mounts. Inter is already self-hosted globally via
 * `pages/_document.js`.
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
      {/* Lux-only favicon — monogram. Scoped to Lux pages that mount this stylesheet. */}
      <link
        rel="icon"
        type="image/svg+xml"
        href="/assets/logos/rare-exclusive-monogram.svg"
      />
      <link
        rel="apple-touch-icon"
        href="/assets/logos/rare-exclusive-monogram.svg"
      />
    </>
  );
}

/**
 * Compact RE monogram (Jan-approved).
 *
 * @param {{ size?: number, color?: string, title?: string }} props
 */
export function LuxeMauriceMonogram({
  size = 44,
  title = 'Rare & Exclusive Collection monogram',
}) {
  return <RareExclusiveMonogram size={size} title={title} />;
}

/**
 * Full / header Rare & Exclusive Collection mark.
 *
 * `variant`:
 *   - 'compact'  Header / navigation → horizontal wordmark
 *   - 'stacked'  Hero / footer → full lockup
 *   - 'small'    Compact horizontal wordmark
 *
 * `tone`:
 *   - 'ivory'    Light mark on dark plates
 *   - 'charcoal' Dark mark on ivory plates
 */
export function LuxeMauriceWordmark({
  variant = 'compact',
  tone = 'ivory',
  showSignature = true,
  href = null,
}) {
  const markTone = tone === 'ivory' ? 'ivory' : 'charcoal';

  const inner =
    variant === 'stacked' ? (
      <RareExclusiveFullLockup
        showMonogram={showSignature !== false}
        tone={markTone}
        width={330}
      />
    ) : (
      <RareExclusiveHorizontalWordmark
        height={variant === 'small' ? 16 : 20}
        tone={markTone}
      />
    );

  const wrapped = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: variant === 'stacked' ? 'center' : 'flex-start',
        textDecoration: 'none',
        lineHeight: 1,
        position: 'relative',
      }}
    >
      {inner}
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

  if (!href) return wrapped;
  return (
    <a
      href={href}
      style={{ display: 'inline-flex', textDecoration: 'none' }}
      aria-label="Rare & Exclusive Collection - Private Wealth & Lifestyle Platform for Mauritius"
    >
      {wrapped}
    </a>
  );
}

/** Re-exports for callers that prefer the Jan-approved names. */
export {
  RareExclusiveFullLockup,
  RareExclusiveHorizontalWordmark,
  RareExclusiveMonogram,
};

/** Named map: fullLockup / horizontalWordmark / monogram */
export const rareExclusiveLogo = {
  fullLockup: RareExclusiveFullLockup,
  horizontalWordmark: RareExclusiveHorizontalWordmark,
  monogram: RareExclusiveMonogram,
};

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
