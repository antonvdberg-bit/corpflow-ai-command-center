import React, { useId } from 'react';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';

/**
 * Rare & Exclusive Collection — Jan-approved brand marks (2026-07-27).
 *
 * Brand decision:
 * - fullLockup — master reference (hero / editorial / footer)
 * - horizontalWordmark — header / navigation
 * - monogram — favicon / compact / badge
 *
 * Reproduces Anton's attached Jan-approved logo set with brand tokens and
 * Cormorant Garamond (loaded on Lux public surfaces). Replaces the incorrect
 * crown/shield crest and stacked improvised wordmark.
 */

export const RARE_EXCLUSIVE_BRAND_NAME = 'Rare & Exclusive Collection';
export const RARE_EXCLUSIVE_TAGLINE = 'Rare by nature. Exclusive by design.';

function useGoldGradientId(prefix) {
  const uid = useId().replace(/:/g, '');
  return `${prefix}-${uid}`;
}

function GoldDefs({ id }) {
  return (
    <defs>
      <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D4B56A" />
        <stop offset="45%" stopColor={T.gold} />
        <stop offset="100%" stopColor="#7A5F1C" />
      </linearGradient>
    </defs>
  );
}

/**
 * Compact interlocking RE monogram — favicon / badge / small brand mark.
 *
 * @param {{ size?: number, title?: string, withPlate?: boolean }} props
 */
export function RareExclusiveMonogram({
  size = 48,
  title = `${RARE_EXCLUSIVE_BRAND_NAME} monogram`,
  withPlate = false,
}) {
  const goldId = useGoldGradientId('re-mono-gold');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role="img"
      aria-label={title}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <title>{title}</title>
      <GoldDefs id={goldId} />
      {withPlate ? (
        <rect
          x="2"
          y="2"
          width="92"
          height="92"
          rx="22"
          ry="22"
          fill={T.ivory}
          stroke="rgba(168,132,44,0.28)"
          strokeWidth="1"
        />
      ) : null}
      <text
        x="26"
        y="68"
        fill={T.charcoal}
        fontFamily={T.fontDisplay}
        fontSize="58"
        fontWeight="500"
        letterSpacing="-0.04em"
      >
        R
      </text>
      <text
        x="44"
        y="72"
        fill={`url(#${goldId})`}
        fontFamily={T.fontDisplay}
        fontSize="48"
        fontWeight="500"
        letterSpacing="-0.05em"
      >
        E
      </text>
      <text
        x="38"
        y="78"
        fill={`url(#${goldId})`}
        fontFamily={T.fontDisplay}
        fontSize="26"
        fontWeight="500"
        fontStyle="italic"
      >
        &amp;
      </text>
    </svg>
  );
}

/**
 * Horizontal wordmark — header / navigation.
 *
 * @param {{
 *   height?: number,
 *   maxWidth?: number | string,
 *   title?: string,
 *   tone?: 'charcoal' | 'ivory',
 * }} props
 */
export function RareExclusiveHorizontalWordmark({
  height = 24,
  maxWidth = '100%',
  title = `${RARE_EXCLUSIVE_BRAND_NAME} wordmark`,
  tone = 'charcoal',
}) {
  const ink = tone === 'ivory' ? T.ivory : T.charcoal;

  return (
    <span
      role="img"
      aria-label={title}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.28em',
        fontFamily: T.fontDisplay,
        fontWeight: 500,
        fontSize: height,
        lineHeight: 1,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: ink,
        maxWidth,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <span>Rare</span>
      <span
        aria-hidden="true"
        style={{
          color: T.gold,
          fontStyle: 'italic',
          letterSpacing: '0.08em',
          backgroundImage: `linear-gradient(135deg, #D4B56A 0%, ${T.gold} 45%, #7A5F1C 100%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        &amp;
      </span>
      <span>Exclusive</span>
    </span>
  );
}

/**
 * Full lockup — master brand reference for hero / editorial / footer.
 *
 * @param {{
 *   width?: number,
 *   maxWidth?: number | string,
 *   title?: string,
 *   showMonogram?: boolean,
 *   tone?: 'charcoal' | 'ivory',
 *   monogramSize?: number,
 * }} props
 */
export function RareExclusiveFullLockup({
  width = 380,
  maxWidth = 'min(100%, 420px)',
  title = RARE_EXCLUSIVE_BRAND_NAME,
  showMonogram = true,
  tone = 'charcoal',
  monogramSize,
}) {
  const ink = tone === 'ivory' ? T.ivory : T.charcoal;
  // Issue #651 — monogram must read as a primary brand signal on opening surfaces.
  const resolvedMonogramSize =
    typeof monogramSize === 'number' && monogramSize > 0
      ? Math.round(monogramSize)
      : Math.round(Math.min(128, Math.max(96, width * 0.34)));

  return (
    <div
      role="img"
      aria-label={title}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        width: '100%',
        maxWidth,
        color: ink,
      }}
    >
      {showMonogram ? (
        <div style={{ marginBottom: 22 }}>
          <RareExclusiveMonogram size={resolvedMonogramSize} />
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: '0.28em',
          fontFamily: T.fontDisplay,
          fontWeight: 500,
          fontSize: 'clamp(1.35rem, 3.6vw, 2.05rem)',
          lineHeight: 1,
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          paddingLeft: '0.26em',
        }}
      >
        <span>Rare</span>
        <span
          aria-hidden="true"
          style={{
            fontStyle: 'italic',
            letterSpacing: '0.1em',
            backgroundImage: `linear-gradient(135deg, #D4B56A 0%, ${T.gold} 45%, #7A5F1C 100%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: T.gold,
          }}
        >
          &amp;
        </span>
        <span>Exclusive</span>
      </div>

      <div
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          width: '100%',
          maxWidth: 360,
        }}
      >
        <span aria-hidden="true" style={{ flex: 1, height: 1, background: T.gold, opacity: 0.75 }} />
        <span
          style={{
            fontFamily: T.fontDisplay,
            fontWeight: 500,
            fontSize: 'clamp(0.72rem, 1.5vw, 0.95rem)',
            letterSpacing: '0.46em',
            textTransform: 'uppercase',
            color: T.gold,
            paddingLeft: '0.46em',
            whiteSpace: 'nowrap',
          }}
        >
          Collection
        </span>
        <span aria-hidden="true" style={{ flex: 1, height: 1, background: T.gold, opacity: 0.75 }} />
      </div>

      <div
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <span aria-hidden="true" style={{ width: 28, height: 1, background: T.gold, opacity: 0.75 }} />
        <span
          aria-hidden="true"
          style={{
            width: 7,
            height: 7,
            transform: 'rotate(45deg)',
            background: T.gold,
          }}
        />
        <span aria-hidden="true" style={{ width: 28, height: 1, background: T.gold, opacity: 0.75 }} />
      </div>

      <div
        style={{
          marginTop: 16,
          fontFamily: T.fontBody,
          fontWeight: 600,
          fontSize: 'clamp(0.58rem, 1.2vw, 0.72rem)',
          letterSpacing: '0.34em',
          textTransform: 'uppercase',
          color: ink,
          paddingLeft: '0.34em',
          lineHeight: 1.5,
        }}
      >
        Rare by nature. Exclusive by design.
      </div>
    </div>
  );
}

/** Named variant map for reusable access. */
export const RareExclusiveBrandMarks = {
  fullLockup: RareExclusiveFullLockup,
  horizontalWordmark: RareExclusiveHorizontalWordmark,
  monogram: RareExclusiveMonogram,
};

export default RareExclusiveBrandMarks;
